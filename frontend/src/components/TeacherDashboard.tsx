import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import CodeEditor from './CodeEditor';
import ChatPanel from './ChatPanel';
import TestPanel from './TestPanel';
import { Share2, Play, Users, MessageSquare, FileText, X } from 'lucide-react';

type Participant = {
  id: string | number;
  name: string;
  role: string;
};

type Message = {
  id: string | number;
  userName: string;
  message: string;
  role?: string;
  timestamp?: number | string;
};

const TeacherDashboard: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [studentCodes, setStudentCodes] = useState<Map<string | number, { code: string }>>(new Map());
  const [selectedStudent, setSelectedStudent] = useState<string | number | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'test'>('code');
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const newSocket: Socket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.emit('join-session', {
      sessionId,
      userName: 'Teacher',
      role: 'teacher'
    });

    newSocket.on('session-state', (state: any) => {
      setCode(state.code);
      setLanguage(state.language);
      setChatMessages(state.chat);
      setParticipants(state.participants);
    });

    newSocket.on('participant-joined', (participant: Participant) => {
      setParticipants(prev => [...prev, participant]);
    });

    newSocket.on('participant-left', (participant: Participant) => {
      setParticipants(prev => prev.filter(p => p.id !== participant.id));
    });

    newSocket.on('chat-message', (message: Message) => {
      setChatMessages(prev => [...prev, message]);
    });

    newSocket.on('student-code-update', (data: { studentId: string | number; code: string }) => {
      setStudentCodes(prev => {
        const updated = new Map(prev);
        updated.set(data.studentId, { code: data.code });
        return updated;
      });
    });

    return () => {
      newSocket.close();
    };
  }, [sessionId]);

  const handleCodeChange = (newCode: string | undefined) => {
    setCode(newCode ?? '');
    socket?.emit('code-change', { code: newCode, language });
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    socket?.emit('code-change', { code, language: newLanguage });
  };

  const shareSession = () => {
    const joinLink = `${window.location.origin}/join/${sessionId}`;
    navigator.clipboard.writeText(joinLink);
    alert('Session link copied to clipboard!');
  };

  const getCurrentStudentCode = () => {
    if (!selectedStudent) return '';
    const studentCode = studentCodes.get(selectedStudent);
    return studentCode ? studentCode.code : '';
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Teacher Dashboard</h1>
            <p className="text-sm text-gray-600">Session: {sessionId}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={shareSession}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Link</span>
            </button>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{participants.length} participants</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'code'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Live Coding</span>
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'test'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Test Mode</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto">
          {activeTab === 'code' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Teacher's Code (Live to Students)</h3>
              </div>
              <CodeEditor
                value={code}
                language={language}
                onChange={handleCodeChange}
                onLanguageChange={handleLanguageChange}
              />
            </div>
          )}

          {activeTab === 'test' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* Test Panel */}
              <TestPanel socket={socket} sessionId={sessionId} />

              {/* Student Monitor */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">Student Monitor</h3>
                  <select
                    value={selectedStudent ?? ''}
                    onChange={(e) => setSelectedStudent(e.target.value || null)}
                    className="mt-2 w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select student to monitor</option>
                    {participants
                      .filter(p => p.role === 'student')
                      .map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name}
                        </option>
                      ))}
                  </select>
                </div>
                <CodeEditor
                  value={getCurrentStudentCode()}
                  language={language}
                  readOnly
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Chat Bubble */}
      <div className="fixed bottom-4 right-4 z-50">
        {chatOpen ? (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-80 h-96 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <h4 className="font-medium text-gray-800 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Live Chat
              </h4>
              <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatPanel
                socket={socket}
                messages={chatMessages}
                currentUser="Teacher"
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
