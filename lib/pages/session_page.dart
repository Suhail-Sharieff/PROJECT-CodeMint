import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// Import your enhanced widgets and services
import '../widgets/chat_panel.dart';
import '../widgets/participants_list.dart';
import '../widgets/code_editor.dart';
import '../services/api/socket_service.dart';

// --- (You can move these to a central constants file) ---
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
  // --- State variables ---
  late final SocketService _socket;
  String _language = 'javascript';
  String _sharedCode = '// Loading session...';
  List<Map<String, dynamic>> _participants = [];
  List<Map<String, dynamic>> _chat = [];
  final Map<String, String> _studentLiveCode = {};
  Map<String, dynamic>? _testData;
  Timer? _timer;
  int _remaining = 0;
  String _studentCode = '';
  final Map<String, bool> _studentExpansionState = {};
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _socket = SocketService();
    _socket.connect(widget.sessionId, widget.userName, widget.role);

    // --- All socket listeners remain the same ---
    _socket.sessionState$.listen((data) {
      if (!mounted) return;
      setState(() {
        _sharedCode = data['code'] ?? '';
        _language = data['language'] ?? 'javascript';
        _chat = List<Map<String, dynamic>>.from(data['chat'] ?? []);
        _participants = List<Map<String, dynamic>>.from(
          data['participants'] ?? [],
        );
        _testData =
            data['isTestMode'] == true
                ? Map<String, dynamic>.from(data['testData'] ?? {})
                : null;
        if (widget.role != 'teacher') _studentCode = _sharedCode;
      });
      _setupTimer();
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
    _socket.studentCodeUpdate$.listen((data) {
      if (widget.role == 'teacher')
        setState(
          () => _studentLiveCode[data['studentId']] = data['code'] ?? '',
        );
    });
    _socket.chatMessage$.listen((msg) => setState(() => _chat.add(msg)));
    _socket.testStarted$.listen((test) {
      setState(() {
        _testData = test;
        _studentCode = _sharedCode;
      });
      _setupTimer();
      if (mounted)
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Test has started!')));
    });
  }

  void _setupTimer() {
    _timer?.cancel();
    if (_testData != null &&
        _testData!['startTime'] != null &&
        _testData!['timeLimit'] != null) {
      final start = DateTime.parse(_testData!['startTime'].toString());
      final limit = Duration(minutes: (_testData!['timeLimit'] as num).toInt());
      final end = start.add(limit);
      _timer = Timer.periodic(const Duration(seconds: 1), (t) {
        if (!mounted) {
          t.cancel();
          return;
        }
        final now = DateTime.now();
        final rem = end.difference(now).inSeconds;
        setState(() => _remaining = (rem < 0) ? 0 : rem);
        if (rem <= 0) t.cancel();
      });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _timer?.cancel();
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

  // --- UI BUILD METHODS ---

  AppBar _buildAppBar({required bool isWide}) {
    return AppBar(
      backgroundColor: kCardColor,
      elevation: 0,
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
      bottom:
          !isWide
              ? TabBar(
                controller: _tabController,
                indicatorColor: kPrimaryColor,
                labelColor: kPrimaryColor,
                unselectedLabelColor: kSecondaryTextColor,
                tabs: const [
                  Tab(icon: Icon(Icons.code_rounded), text: 'Editor'),
                  Tab(
                    icon: Icon(Icons.people_alt_rounded),
                    text: 'Participants',
                  ),
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
            currentUserName: widget.userName, // **CRITICAL FIX**
          ),
          isPadded: true,
        ),
      ],
    );
  }

  Widget _buildTestInfoPanel() {
    String timeStr;
    if (_remaining > 0) {
      final min = _remaining ~/ 60;
      final sec = _remaining % 60;
      timeStr =
          '${min.toString().padLeft(2, '0')}:${sec.toString().padLeft(2, '0')}';
    } else {
      timeStr = 'Time Up!';
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: kCardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kPrimaryColor.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.timer_rounded, color: kPrimaryColor, size: 20),
              const SizedBox(width: 8),
              Text(
                'Live Test',
                style: GoogleFonts.poppins(
                  color: kPrimaryColor,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Text(
                timeStr,
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const Divider(color: kInputBorderColor, height: 24),
          Text(
            'Question:',
            style: GoogleFonts.poppins(
              color: kSecondaryTextColor,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _testData?['question'] ?? 'No question provided.',
            style: GoogleFonts.poppins(color: Colors.white, fontSize: 15),
          ),
        ],
      ),
    );
  }

  Widget _buildMainPanel() {
    final bool isTeacher = widget.role == 'teacher';
    final bool isTestMode = _testData != null;
    final bool studentCanEdit = !isTeacher && isTestMode;

    return Expanded(
      flex: 7,
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          children: [
            if (_testData != null) _buildTestInfoPanel(),
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: kCardColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: kInputBorderColor),
                ),
                clipBehavior: Clip.antiAlias,
                child: CodeEditor(
                  initialCode: isTeacher ? _sharedCode : _studentCode,
                  language: _language,
                  readOnly: !isTeacher && !studentCanEdit,
                  onChanged: (code, lang) {
                    if (isTeacher) {
                      setState(() {
                        _sharedCode = code;
                        _language = lang;
                      });
                      _socket.sendCode(code, lang);
                    } else if (studentCanEdit) {
                      setState(() => _studentCode = code);
                      _socket.sendCode(code, lang);
                    }
                  },
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
    final bool isTeacher = widget.role == 'teacher';

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
          if (isTeacher) ...[
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimaryColor,
                foregroundColor: kBackgroundColor,
              ),
              onPressed: () => showStartTestDialog(context),
              icon: const Icon(Icons.play_circle_fill_rounded),
              label: Text(
                'Start Test',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
              ),
            ),
          ] else ...[
            if (_testData != null) ...[
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: kPrimaryColor,
                  foregroundColor: kBackgroundColor,
                ),
                onPressed: () => _socket.submitTest(_studentCode, _language),
                icon: const Icon(Icons.send_rounded),
                label: Text(
                  'Submit Final Code',
                  style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                ),
              ),
            ] else
              Text(
                'Waiting for teacher to start a test...',
                style: GoogleFonts.poppins(color: kSecondaryTextColor),
              ),
          ],
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
    final bool isTeacher = widget.role == 'teacher';
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
                  currentUserName: widget.userName, // **CRITICAL FIX**
                ),
              ),
            ),
            if (isTeacher && _studentLiveCode.isNotEmpty) ...[
              const SizedBox(height: 8),
              Expanded(flex: 5, child: _buildLiveStudentCodePanel()),
            ],
          ],
        ),
      ),
    );
  }

  // Generic panel widget used by both layouts
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

  // ... other helper methods like _buildControlBar, _buildTestInfoPanel, etc. remain the same ...

  Widget buildSidePanel({required bool isWide}) {
    final bool isTeacher = widget.role == 'teacher';
    return Expanded(
      flex: 3, // Take less space
      child: Padding(
        padding: const EdgeInsets.fromLTRB(0, 8, 8, 8),
        child: Column(
          children: [
            if (_testData != null) _buildTestInfoPanel(),
            Expanded(
              flex: 3,
              child: buildTitledPanel(
                title: 'Participants',
                child: ParticipantsList(participants: _participants),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              flex: 4,
              child: buildTitledPanel(
                title: 'Chat',
                child: ChatPanel(
                  messages: _chat,
                  onSend: _socket.sendChat,
                  currentUserName: 'currentUserName',
                ),
              ),
            ),
            if (isTeacher && _studentLiveCode.isNotEmpty) ...[
              const SizedBox(height: 8),
              Expanded(flex: 5, child: _buildLiveStudentCodePanel()),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildLiveStudentCodePanel() {
    return buildTitledPanel(
      title: "Students' Live Code",
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: SingleChildScrollView(
          child: ExpansionPanelList(
            elevation: 0,
            expandedHeaderPadding: EdgeInsets.zero,
            expansionCallback: (int index, bool isExpanded) {
              final studentId = _studentLiveCode.keys.elementAt(index);
              setState(() => _studentExpansionState[studentId] = !isExpanded);
            },
            children:
                _studentLiveCode.entries.map<ExpansionPanel>((entry) {
                  final studentId = entry.key;
                  final studentName =
                      _participants.firstWhere(
                        (p) => p['id'] == studentId,
                        orElse: () => {'name': 'Unknown'},
                      )['name'];
                  return ExpansionPanel(
                    backgroundColor: kCardColor,
                    canTapOnHeader: true,
                    headerBuilder: (BuildContext context, bool isExpanded) {
                      return ListTile(
                        title: Text(
                          studentName,
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        tileColor: kBackgroundColor,
                      );
                    },
                    body: Container(
                      padding: const EdgeInsets.all(12),
                      color: kBackgroundColor,
                      child: SelectableText(
                        entry.value.isEmpty ? '// No code yet...' : entry.value,
                        style: GoogleFonts.firaCode(
                          color: kSecondaryTextColor,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    isExpanded: _studentExpansionState[studentId] ?? false,
                  );
                }).toList(),
          ),
        ),
      ),
    );
  }

  Widget buildTitledPanel({required String title, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kCardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kInputBorderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const Divider(color: kInputBorderColor, height: 20),
          Expanded(child: child),
        ],
      ),
    );
  }

  Future<void> showStartTestDialog(BuildContext context) async {
    final qCtrl = TextEditingController();
    final tCtrl = TextEditingController(text: '10');
    final res = await showDialog<Map<String, dynamic>>(
      context: context,
      builder:
          (ctx) => AlertDialog(
            backgroundColor: kCardColor,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: kInputBorderColor),
            ),
            title: Text(
              'Start a New Test',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: qCtrl,
                  style: GoogleFonts.poppins(color: Colors.white),
                  decoration: buildInputDecoration(
                    labelText: 'Question / Prompt',
                    prefixIcon: Icons.help_outline_rounded,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: tCtrl,
                  style: GoogleFonts.poppins(color: Colors.white),
                  decoration: buildInputDecoration(
                    labelText: 'Time Limit (minutes)',
                    prefixIcon: Icons.timer_outlined,
                  ),
                  keyboardType: TextInputType.number,
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(
                  'Cancel',
                  style: GoogleFonts.poppins(color: kSecondaryTextColor),
                ),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: kPrimaryColor,
                  foregroundColor: kBackgroundColor,
                ),
                onPressed: () {
                  if (qCtrl.text.trim().isNotEmpty) {
                    Navigator.pop(ctx, {
                      'q': qCtrl.text.trim(),
                      't': int.tryParse(tCtrl.text.trim()) ?? 10,
                    });
                  }
                },
                child: Text(
                  'Start Test',
                  style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
    );
    if (res != null) {
      _socket.startTest(res['q'], res['t']);
    }
  }

  InputDecoration buildInputDecoration({
    required String labelText,
    required IconData prefixIcon,
  }) {
    return InputDecoration(
      labelText: labelText,
      labelStyle: GoogleFonts.poppins(color: kSecondaryTextColor),
      prefixIcon: Icon(prefixIcon, color: kSecondaryTextColor),
      filled: true,
      fillColor: kBackgroundColor,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kInputBorderColor),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kInputBorderColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kPrimaryColor, width: 2),
      ),
    );
  }
}
