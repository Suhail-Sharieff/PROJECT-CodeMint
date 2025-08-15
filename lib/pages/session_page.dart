import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../widgets/chat_panel.dart';
import '../widgets/participants_list.dart';
import '../widgets/code_editor.dart';
import '../services/api/socket_service.dart';

// --- Constants ---
const kBackgroundColor = Color(0xFF0D1117);
const kCardColor = Color(0xFF161B22);
const kPrimaryColor = Color(0xFF23D997);
const kErrorColor = Color(0xFFF85149);
const kSecondaryTextColor = Color(0xFF8B949E);
const kInputBorderColor = Color(0xFF30363D);

class SessionPage extends StatefulWidget {
  final String sessionId;
  final String userName;
  final String role; // 'teacher' or 'student'

  const SessionPage({
    super.key,
    required this.sessionId,
    required this.userName,
    required this.role,
  });

  @override
  State<SessionPage> createState() => _SessionPageState();
}

class _SessionPageState extends State<SessionPage>
    with SingleTickerProviderStateMixin {
  late final SocketService _socket;
  String _language = 'javascript';
  String _sharedCode = '// Loading session...';
  List<Map<String, dynamic>> _participants = [];
  List<Map<String, dynamic>> _chat = [];
  final Map<String, String> _studentLiveCode = {};
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _socket = SocketService();
    _socket.connect(widget.sessionId, widget.userName, widget.role);

    _socket.sessionState$.listen((data) {
      if (!mounted) return;
      setState(() {
        _sharedCode = data['code'] ?? '';
        _language = data['language'] ?? 'javascript';
        _chat = List<Map<String, dynamic>>.from(data['chat'] ?? []);
        _participants =
        List<Map<String, dynamic>>.from(data['participants'] ?? []);
      });
    });
    _socket.participantJoined$.listen(
          (p) => setState(() => _participants.add(p)),
    );
    _socket.participantLeft$.listen(
          (p) =>
          setState(() => _participants.removeWhere((e) => e['id'] == p['id'])),
    );
    _socket.codeUpdate$.listen((data) {
      if (widget.role != 'teacher') {
        setState(() {
          _sharedCode = data['code'] ?? _sharedCode;
          _language = data['language'] ?? _language;
        });
      }
    });
    // Student code updates still received but no UI display now
    _socket.studentCodeUpdate$.listen((data) {
      if (widget.role == 'teacher') {
        _studentLiveCode[data['studentId']] = data['code'] ?? '';
      }
    });
    _socket.chatMessage$.listen((msg) => setState(() => _chat.add(msg)));
  }

  @override
  void dispose() {
    _tabController.dispose();
    _socket.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final bool isWide = constraints.maxWidth > 1100;
        return Scaffold(
          backgroundColor: kBackgroundColor,
          appBar: _buildAppBar(isWide: isWide),
          body: isWide ? _buildWideLayout() : _buildNarrowLayout(),
        );
      },
    );
  }

  AppBar _buildAppBar({required bool isWide}) {
    return AppBar(
      backgroundColor: kCardColor,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded,
            color: kSecondaryTextColor),
        onPressed: () => Navigator.of(context).pop(),
      ),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'CodeMint Session',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          Text(
            'ID: ${widget.sessionId}',
            style: GoogleFonts.poppins(
              color: kSecondaryTextColor,
              fontSize: 12,
            ),
          ),
        ],
      ),
      actions: [
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: kBackgroundColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: kInputBorderColor),
            ),
            child: Text(
              '${widget.userName} (${widget.role})',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
      ],
      bottom: !isWide
          ? TabBar(
        controller: _tabController,
        indicatorColor: kPrimaryColor,
        labelColor: kPrimaryColor,
        unselectedLabelColor: kSecondaryTextColor,
        tabs: const [
          Tab(icon: Icon(Icons.code_rounded), text: 'Editor'),
          Tab(icon: Icon(Icons.people_alt_rounded), text: 'Participants'),
          Tab(icon: Icon(Icons.chat_bubble_rounded), text: 'Chat'),
        ],
      )
          : null,
    );
  }

  Widget _buildWideLayout() =>
      Row(children: [_buildMainPanel(), _buildSidePanel()]);

  Widget _buildNarrowLayout() {
    return TabBarView(
      controller: _tabController,
      children: [
        _buildMainPanel(),
        _buildTitledPanel(
          title: 'Participants',
          child: ParticipantsList(participants: _participants),
          isPadded: true,
        ),
        _buildTitledPanel(
          title: 'Chat',
          child: ChatPanel(
            messages: _chat,
            onSend: _socket.sendChat,
            currentUserName: widget.userName,
          ),
          isPadded: true,
        ),
      ],
    );
  }

  Widget _buildMainPanel() {
    final bool isTeacher = widget.role == 'teacher';
    return Expanded(
      flex: 7,
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: kCardColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: kInputBorderColor),
                ),
                clipBehavior: Clip.antiAlias,
                child: CodeEditor(
                  initialCode: _sharedCode,
                  language: _language,
                  readOnly: !isTeacher,
                  onChanged: (code, lang) {
                    if (isTeacher) {
                      setState(() {
                        _sharedCode = code;
                        _language = lang;
                      });
                      _socket.sendCode(code, lang);
                    }
                  },
                  socketService: _socket,
                ),
              ),
            ),
            _buildControlBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildControlBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      margin: const EdgeInsets.only(top: 8),
      decoration: BoxDecoration(
        color: kCardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kInputBorderColor),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '${_participants.length} participant(s) online',
            style: GoogleFonts.poppins(
              color: kSecondaryTextColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSidePanel() {
    return Expanded(
      flex: 3,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(0, 8, 8, 8),
        child: Column(
          children: [
            Expanded(
              flex: 3,
              child: _buildTitledPanel(
                title: 'Participants',
                child: ParticipantsList(participants: _participants),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              flex: 4,
              child: _buildTitledPanel(
                title: 'Chat',
                child: ChatPanel(
                  messages: _chat,
                  onSend: _socket.sendChat,
                  currentUserName: widget.userName,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTitledPanel({
    required String title,
    required Widget child,
    bool isPadded = false,
  }) {
    return Padding(
      padding: isPadded ? const EdgeInsets.all(8.0) : EdgeInsets.zero,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: kCardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: kInputBorderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: Text(
                title,
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const Divider(color: kInputBorderColor, height: 20),
            Expanded(child: child),
          ],
        ),
      ),
    );
  }
}
