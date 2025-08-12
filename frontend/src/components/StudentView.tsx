import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import CodeEditor from './CodeEditor';
import ChatPanel from './ChatPanel';
import ParticipantsList from './ParticipantsList';
import TestInterface from './TestInterface';
import { Users, MessageSquare, Code, FileText, LogOut } from 'lucide-react';

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

const StudentView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const studentName = location.state?.studentName || 'Student';
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [teacherCode, setTeacherCode] = useState('');
  const [studentCode, setStudentCode] = useState('// Start coding here...\n');
  const [language, setLanguage] = useState('javascript');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testData, setTestData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('teacher-code');
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const newSocket: Socket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.emit('join-session', {
      sessionId,
      userName: studentName,
      role: 'student'
    });

    newSocket.on('session-state', (state: any) => {
      setTeacherCode(state.code);
      setLanguage(state.language);
      setChatMessages(state.chat);
      setParticipants(state.participants);
      setIsTestMode(state.isTestMode);
      setTestData(state.testData);
    });

    newSocket.on('code-update', (data: any) => {
      setTeacherCode(data.code);
      setLanguage(data.language);
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

    newSocket.on('test-started', (data: any) => {
      setIsTestMode(true);
      setTestData(data);
      setActiveTab('test');
    });

    return () => {
      newSocket.close();
    };
  }, [sessionId, studentName]);

  const handleStudentCodeChange = (newCode: string | undefined) => {
    setStudentCode(newCode ?? '');
    socket?.emit('code-change', { code: newCode, language });
  };

  const leaveSession = () => {
    socket?.close();
    navigate('/');
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Fixed Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 p-4 sticky top-0 z-20">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {studentName} - Student View
            </h1>
            <p className="text-sm text-gray-600">Session: {sessionId}</p>
          </div>
          <div className="flex items-center space-x-4">
            {isTestMode && (
              <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-lg text-sm font-medium">
                Test Mode Active
              </div>
            )}
            <button
              onClick={leaveSession}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex space-x-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('teacher-code')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'teacher-code' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Teacher's Code</span>
            </button>
            <button
              onClick={() => setActiveTab('my-code')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'my-code' 
                  ? 'bg-green-100 text-green-700' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Code Editor</span>
            </button>
            {isTestMode && (
              <button
                onClick={() => setActiveTab('test')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'test' 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Test</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-4 overflow-auto">
          {activeTab === 'teacher-code' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Teacher's Live Code</h3>
                <p className="text-sm text-gray-600">Watch the teacher code in real-time</p>
              </div>
              <CodeEditor value={teacherCode} language={language} readOnly />
            </div>
          )}

          {activeTab === 'my-code' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Your Code</h3>
                <p className="text-sm text-gray-600">Write your code here (teacher can monitor)</p>
              </div>
              <CodeEditor value={studentCode} language={language} onChange={handleStudentCodeChange} />
            </div>
          )}

          {activeTab === 'test' && isTestMode && socket && (
            <TestInterface socket={socket} testData={testData} language={language} />
          )}
        </div>

        {/* Floating Chat Toggle */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg z-30"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Chat Bubble */}
        {isChatOpen && (
          <div className="absolute bottom-16 right-4 w-80 h-96 bg-white border border-gray-300 rounded-lg shadow-xl flex flex-col z-30">
            <ChatPanel
              socket={socket}
              messages={chatMessages}
              currentUser={studentName}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentView;
