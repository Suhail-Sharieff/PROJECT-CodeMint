import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api/socket_service.dart';
import '../widgets/chat_panel.dart';
import '../widgets/participants_list.dart';
import '../widgets/code_editor.dart';

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

class _SessionPageState extends State<SessionPage> {
  late final SocketService _socket;
  String _language = 'javascript';
  String _sharedCode = '// Loading...';
  List<Map<String, dynamic>> _participants = [];
  List<Map<String, dynamic>> _chat = [];

  // For teacher: live student code stream
  final Map<String, String> _studentLiveCode = {};

  // Test mode
  Map<String, dynamic>? _testData;
  Timer? _timer;
  int _remaining = 0;

  // Student's working code during test
  String _studentCode = '';

  @override
  void initState() {
    super.initState();
    _socket = SocketService();
    _socket.connect(widget.sessionId, widget.userName, widget.role);

    _socket.sessionState$.listen((data) {
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
      });
      _setupTimer();
    });

    _socket.participantJoined$.listen((p) {
      setState(() => _participants.add(p));
    });
    _socket.participantLeft$.listen((p) {
      setState(() => _participants.removeWhere((e) => e['id'] == p['id']));
    });
    _socket.codeUpdate$.listen((data) {
      if (widget.role != 'teacher') {
        setState(() {
          _sharedCode = data['code'] ?? _sharedCode;
          _language = data['language'] ?? _language;
        });
      }
    });
    _socket.studentCodeUpdate$.listen((data) {
      if (widget.role == 'teacher') {
        setState(() {
          _studentLiveCode[data['studentId']] = data['code'] ?? '';
        });
      }
    });
    _socket.chatMessage$.listen((msg) {
      setState(() => _chat.add(msg));
    });
    _socket.testStarted$.listen((test) {
      setState(() {
        _testData = test;
        _studentCode = '';
      });
      _setupTimer();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Test started')));
      }
    });
    _socket.testSubmission$.listen((sub) {
      if (widget.role == 'teacher') {
        // Optional: show snackbar on each submission
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Submission from ' + (sub['studentName'] ?? 'student'),
              ),
            ),
          );
        }
      }
    });
    _socket.submissionAck$.listen((_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Submission received!')));
      }
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
        final now = DateTime.now();
        final rem = end.difference(now).inSeconds;
        if (rem <= 0) {
          setState(() => _remaining = 0);
          t.cancel();
        } else {
          setState(() => _remaining = rem);
        }
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _socket.disconnect();
    super.dispose();
  }

  void _onTeacherCodeChanged(String code, String lang) {
    if (widget.role == 'teacher') {
      setState(() {
        _sharedCode = code;
        _language = lang;
      });
      _socket.sendCode(code, lang);
    } else {
      // Students send to teacher only; server routes appropriately
      _socket.sendCode(code, _language);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isTeacher = widget.role == 'teacher';
    return Scaffold(
      appBar: AppBar(
        title: Text('Session: ${widget.sessionId}'),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Center(child: Text('${widget.userName} (${widget.role})')),
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, c) {
          final wide = c.maxWidth > 1000;
          return Row(
            children: [
              // Left: Code editor area
              Expanded(
                flex: 2,
                child: Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Column(
                    children: [
                      Expanded(
                        child: Card(
                          clipBehavior: Clip.antiAlias,
                          child: Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: CodeEditor(
                              initialCode:
                                  isTeacher
                                      ? _sharedCode
                                      : _studentCode.isNotEmpty
                                      ? _studentCode
                                      : _sharedCode,
                              language: _language,
                              readOnly:
                                  !isTeacher &&
                                  _testData ==
                                      null, // students can edit only during test (for practice you can make editable)
                              onChanged: (code, lang) {
                                if (isTeacher) {
                                  _onTeacherCodeChanged(code, lang);
                                } else {
                                  setState(() => _studentCode = code);
                                  _socket.sendCode(code, lang);
                                }
                              },
                            ),
                          ),
                        ),
                      ),
                      if (isTeacher)
                        Row(
                          children: [
                            FilledButton.icon(
                              onPressed: () => _startTestDialog(context),
                              icon: const Icon(Icons.play_arrow),
                              label: const Text('Start Test'),
                            ),
                            const SizedBox(width: 12),
                            Text('Participants: ${_participants.length}'),
                          ],
                        )
                      else
                        Row(
                          children: [
                            if (_testData != null) ...[
                              const Icon(Icons.timer_outlined),
                              const SizedBox(width: 6),
                              Text(
                                _remaining > 0
                                    ? 'Time left: ${_remaining}s'
                                    : 'Time up',
                              ),
                              const SizedBox(width: 12),
                              FilledButton.icon(
                                onPressed:
                                    () => _socket.submitTest(
                                      _studentCode,
                                      _language,
                                    ),
                                icon: const Icon(Icons.send),
                                label: const Text('Submit'),
                              ),
                            ] else
                              const Text('Waiting for teacher...'),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
              // Right: Chat + participants + teacher view of student's live code
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Column(
                    children: [
                      Expanded(
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: ChatPanel(
                              messages: _chat,
                              onSend: _socket.sendChat,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Expanded(
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Participants',
                                  style: TextStyle(fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 8),
                                Expanded(
                                  child: ParticipantsList(
                                    participants: _participants,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      if (isTeacher && _studentLiveCode.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Expanded(
                          child: Card(
                            child: Padding(
                              padding: const EdgeInsets.all(8.0),
                              child: ListView(
                                children:
                                    _studentLiveCode.entries
                                        .map(
                                          (e) => ListTile(
                                            title: Text(
                                              'Student ${e.key.substring(0, 6)}',
                                            ),
                                            subtitle: Text(
                                              e.value.length > 200
                                                  ? e.value.substring(0, 200) +
                                                      '...'
                                                  : e.value,
                                              maxLines: 6,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        )
                                        .toList(),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _startTestDialog(BuildContext context) async {
    final qCtrl = TextEditingController();
    final tCtrl = TextEditingController(text: '10');
    final res = await showDialog<Map<String, dynamic>>(
      context: context,
      builder:
          (ctx) => AlertDialog(
            title: const Text('Start Test'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: qCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Question / Prompt',
                  ),
                ),
                TextField(
                  controller: tCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Time (minutes)',
                  ),
                  keyboardType: TextInputType.number,
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed:
                    () => Navigator.pop(ctx, {
                      'q': qCtrl.text.trim(),
                      't': int.tryParse(tCtrl.text.trim()) ?? 10,
                    }),
                child: const Text('Start'),
              ),
            ],
          ),
    );
    if (res != null && res['q'] != null && (res['q'] as String).isNotEmpty) {
      _socket.startTest(res['q'], res['t']);
    }
  }
}
