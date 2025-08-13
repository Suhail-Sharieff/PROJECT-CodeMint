import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  late IO.Socket socket;
  final String origin;

  SocketService({this.origin = 'http://localhost:3001'});

  // Streams to expose events to UI
  final _sessionStateCtrl = StreamController<Map<String, dynamic>>.broadcast();
  final _participantJoinedCtrl =
  StreamController<Map<String, dynamic>>.broadcast();
  final _participantLeftCtrl =
  StreamController<Map<String, dynamic>>.broadcast();
  final _codeUpdateCtrl = StreamController<Map<String, dynamic>>.broadcast();
  final _studentCodeUpdateCtrl =
  StreamController<Map<String, dynamic>>.broadcast();
  final _chatMessageCtrl = StreamController<Map<String, dynamic>>.broadcast();
  final _testStartedCtrl = StreamController<Map<String, dynamic>>.broadcast();
  final _testSubmissionCtrl =
  StreamController<Map<String, dynamic>>.broadcast();
  final _submissionAckCtrl = StreamController<void>.broadcast();

  Stream<Map<String, dynamic>> get sessionState$ => _sessionStateCtrl.stream;
  Stream<Map<String, dynamic>> get participantJoined$ =>
      _participantJoinedCtrl.stream;
  Stream<Map<String, dynamic>> get participantLeft$ =>
      _participantLeftCtrl.stream;
  Stream<Map<String, dynamic>> get codeUpdate$ => _codeUpdateCtrl.stream;
  Stream<Map<String, dynamic>> get studentCodeUpdate$ =>
      _studentCodeUpdateCtrl.stream;
  Stream<Map<String, dynamic>> get chatMessage$ => _chatMessageCtrl.stream;
  Stream<Map<String, dynamic>> get testStarted$ => _testStartedCtrl.stream;
  Stream<Map<String, dynamic>> get testSubmission$ =>
      _testSubmissionCtrl.stream;
  Stream<void> get submissionAck$ => _submissionAckCtrl.stream;

  void connect(String sessionId, String userName, String role) {
    socket = IO.io(origin, {
      'transports': ['websocket'],
      'autoConnect': false,
    });
    socket.connect();

    socket.onConnect((_) {
      socket.emit('join-session', {
        'sessionId': sessionId,
        'userName': userName,
        'role': role,
      });
    });

    socket.on('session-state',
            (data) => _sessionStateCtrl.add(Map<String, dynamic>.from(data)));
    socket.on('participant-joined',
            (data) => _participantJoinedCtrl.add(Map<String, dynamic>.from(data)));
    socket.on('participant-left',
            (data) => _participantLeftCtrl.add(Map<String, dynamic>.from(data)));
    socket.on('code-update',
            (data) => _codeUpdateCtrl.add(Map<String, dynamic>.from(data)));
    socket.on('student-code-update',
            (data) => _studentCodeUpdateCtrl.add(Map<String, dynamic>.from(data)));
    socket.on('chat-message',
            (data) => _chatMessageCtrl.add(Map<String, dynamic>.from(data)));
    socket.on('test-started',
            (data) => _testStartedCtrl.add(Map<String, dynamic>.from(data)));
    socket.on('test-submission',
            (data) => _testSubmissionCtrl.add(Map<String, dynamic>.from(data)));
    socket.on('submission-received', (_) => _submissionAckCtrl.add(null));
  }

  void sendCode(String code, String language) {
    socket.emit('code-change', {'code': code, 'language': language});
  }

  void sendChat(String message) {
    socket.emit('chat-message', {'message': message});
  }

  void startTest(String question, int timeLimit) {
    socket.emit('start-test', {'question': question, 'timeLimit': timeLimit});
  }

  void submitTest(String code, String language) {
    socket.emit('submit-test', {'code': code, 'language': language});
  }

  void disconnect() {
    socket.dispose();
    _sessionStateCtrl.close();
    _participantJoinedCtrl.close();
    _participantLeftCtrl.close();
    _codeUpdateCtrl.close();
    _studentCodeUpdateCtrl.close();
    _chatMessageCtrl.close();
    _testStartedCtrl.close();
    _testSubmissionCtrl.close();
    _submissionAckCtrl.close();
  }
}
