const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    // origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store active sessions and participants
const sessions = new Map();
const participants = new Map();

// Create a new coding session
app.post('/api/create-session', (req, res) => {
  const { teacherName } = req.body;
  const sessionId = uuidv4();
  
  sessions.set(sessionId, {
    id: sessionId,
    teacherName,
    participants: [],
    code: '// Welcome to the live coding session!\n// Teacher will start coding here...\n',
    language: 'javascript',
    chat: [],
    isTestMode: false,
    testData: null,
    createdAt: new Date()
  });
  
  res.json({ sessionId, joinLink: `http://localhost:5173/join/${sessionId}` });
});

// Get session details
app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(session);
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join a coding session
  socket.on('join-session', (data) => {
    const { sessionId, userName, role } = data;
    const session = sessions.get(sessionId);
    
    if (!session) {
      socket.emit('error', { message: 'Session not found' });
      return;
    }
    
    socket.join(sessionId);
    
    const participant = {
      id: socket.id,
      name: userName,
      role: role,
      joinedAt: new Date()
    };
    
    session.participants.push(participant);
    participants.set(socket.id, { sessionId, ...participant });
    
    // Send current session state to the new participant
    socket.emit('session-state', {
      code: session.code,
      language: session.language,
      chat: session.chat,
      participants: session.participants,
      isTestMode: session.isTestMode,
      testData: session.testData
    });
    
    // Notify others about new participant
    socket.to(sessionId).emit('participant-joined', participant);
    
    console.log(`${userName} (${role}) joined session ${sessionId}`);
  });
  
  // Handle code changes
  socket.on('code-change', (data) => {
    const participant = participants.get(socket.id);
    if (!participant) return;
    
    const { sessionId } = participant;
    const session = sessions.get(sessionId);
    if (!session) return;
    
    // Only teacher can broadcast code changes to all students
    if (participant.role === 'teacher') {
      session.code = data.code;
      session.language = data.language;
      socket.to(sessionId).emit('code-update', data);
    } else {
      // Student code is sent only to teacher
      const teacherSockets = [...io.sockets.sockets.values()]
        .filter(s => {
          const p = participants.get(s.id);
          return p && p.sessionId === sessionId && p.role === 'teacher';
        });
      
      teacherSockets.forEach(teacherSocket => {
        teacherSocket.emit('student-code-update', {
          studentId: socket.id,
          studentName: participant.name,
          code: data.code,
          language: data.language
        });
      });
    }
  });
  
  // Handle chat messages
  socket.on('chat-message', (data) => {
    const participant = participants.get(socket.id);
    if (!participant) return;
    
    const { sessionId } = participant;
    const session = sessions.get(sessionId);
    if (!session) return;
    
    const message = {
      id: uuidv4(),
      userId: socket.id,
      userName: participant.name,
      role: participant.role,
      message: data.message,
      timestamp: new Date()
    };
    
    session.chat.push(message);
    
    // Broadcast message to all participants in the session
    io.to(sessionId).emit('chat-message', message);
  });
  
  // Handle test mode
  socket.on('start-test', (data) => {
    const participant = participants.get(socket.id);
    if (!participant || participant.role !== 'teacher') return;
    
    const { sessionId } = participant;
    const session = sessions.get(sessionId);
    if (!session) return;
    
    session.isTestMode = true;
    session.testData = {
      question: data.question,
      timeLimit: data.timeLimit,
      startTime: new Date(),
      submissions: []
    };
    
    io.to(sessionId).emit('test-started', session.testData);
  });
  
  // Handle test submission
  socket.on('submit-test', (data) => {
    const participant = participants.get(socket.id);
    if (!participant) return;
    
    const { sessionId } = participant;
    const session = sessions.get(sessionId);
    if (!session || !session.isTestMode) return;
    
    const submission = {
      studentId: socket.id,
      studentName: participant.name,
      code: data.code,
      language: data.language,
      submittedAt: new Date()
    };
    
    session.testData.submissions.push(submission);
    
    // Notify teacher about submission
    const teacherSockets = [...io.sockets.sockets.values()]
      .filter(s => {
        const p = participants.get(s.id);
        return p && p.sessionId === sessionId && p.role === 'teacher';
      });
    
    teacherSockets.forEach(teacherSocket => {
      teacherSocket.emit('test-submission', submission);
    });
    
    socket.emit('submission-received');
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    const participant = participants.get(socket.id);
    if (participant) {
      const { sessionId } = participant;
      const session = sessions.get(sessionId);
      
      if (session) {
        session.participants = session.participants.filter(p => p.id !== socket.id);
        socket.to(sessionId).emit('participant-left', participant);
      }
      
      participants.delete(socket.id);
    }
    
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});