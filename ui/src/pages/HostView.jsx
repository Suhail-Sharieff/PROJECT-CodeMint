import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext'; 
import CodeEditor from './CodeEditor'; // <--- Make sure path is correct
import { 
  Share2, Users, MessageSquare, 
  X, Wifi, WifiOff, Info, Terminal, Eye 
} from 'lucide-react';

const HostView = () => {
  const { sessionId } = useParams();
  const { socket, isConnected } = useSocket();
  
  // --- State ---
  const [code, setCode] = useState('// Start typing your solution here...');
  const [language, setLanguage] = useState('javascript');
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  
  const [studentCodes, setStudentCodes] = useState(new Map()); 
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  // UI Toggles
  const [activeTab, setActiveTab] = useState('code'); // 'code' | 'monitor'
  const [chatOpen, setChatOpen] = useState(false);
  const [showSocketInfo, setShowSocketInfo] = useState(false);

  // --- Socket Logic ---
  useEffect(() => {
    if (!socket) return;

    socket.emit('join-session', {
      sessionId,
      userName: 'Host',
      role: 'host'
    });

    socket.on('session-state', (state) => {
      if (state.code) setCode(state.code);
      if (state.language) setLanguage(state.language);
      if (state.participants) setParticipants(state.participants);
      if (state.chat) setChatMessages(state.chat);
    });

    socket.on('participant-joined', (participant) => {
      setParticipants(prev => {
        if (prev.find(p => p.id === participant.id)) return prev;
        return [...prev, participant];
      });
    });

    socket.on('participant-left', (participantId) => {
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      if (selectedStudentId === participantId) setSelectedStudentId('');
    });

    socket.on('chat-message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on('student-code-update', ({ studentId, code: studentCode }) => {
      setStudentCodes(prev => {
        const newMap = new Map(prev);
        newMap.set(studentId, studentCode);
        return newMap;
      });
    });

    // Listen for language changes from others (if needed in future)
    socket.on('language-change', (newLang) => {
        setLanguage(newLang);
    });

    return () => {
      socket.off('session-state');
      socket.off('participant-joined');
      socket.off('participant-left');
      socket.off('chat-message');
      socket.off('student-code-update');
      socket.off('language-change');
    };
  }, [socket, sessionId, selectedStudentId]);

  // --- Handlers ---

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket?.emit('code-change', { sessionId, code: newCode });
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    // Emit language change so students' editors update too
    socket?.emit('language-change', { sessionId, language: newLang });
  };

  const handleSendMessage = (text) => {
    if (!text.trim()) return;
    const msg = { sessionId, message: text, sender: 'Host', timestamp: Date.now() };
    setChatMessages(prev => [...prev, msg]);
    socket?.emit('send-message', msg);
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${sessionId}`;
    navigator.clipboard.writeText(link);
    alert("Invite link copied to clipboard!");
  };

  const getMonitoredCode = () => {
    if (!selectedStudentId) return '// Select a student to view their code...';
    return studentCodes.get(selectedStudentId) || '// Student has not typed anything yet.';
  };

  return (
    <div className="h-screen bg-[#0D1117] text-gray-300 flex flex-col overflow-hidden font-sans">
      
      {/* --- Header --- */}
      <header className="bg-[#161B22] border-b border-gray-800 p-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3">
              Host Console
              <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {isConnected ? <Wifi size={12}/> : <WifiOff size={12}/>}
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span className="font-mono">Session: {sessionId}</span>
              <button 
                onClick={() => setShowSocketInfo(!showSocketInfo)}
                className="hover:text-blue-400 ml-2"
              >
                <Info size={12} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm bg-[#0D1117] border border-gray-800 px-3 py-1.5 rounded-lg">
            <Users size={14} className="text-blue-400" />
            <span>{participants.length} active</span>
          </div>
          <button 
            onClick={copyInviteLink} 
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium"
          >
            <Share2 size={16} />
            <span>Invite</span>
          </button>
        </div>
      </header>

      {showSocketInfo && (
        <div className="bg-gray-900 p-2 text-xs font-mono border-b border-gray-800 text-gray-500">
          Socket ID: {socket?.id || 'N/A'} | Transport: {socket?.io?.engine?.transport?.name}
        </div>
      )}

      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Tab Navigation */}
        <div className="bg-[#0D1117] border-b border-gray-800 px-4 pt-2 flex-shrink-0">
          <div className="flex space-x-1">
            <TabButton 
              active={activeTab === 'code'} 
              onClick={() => setActiveTab('code')} 
              icon={<Terminal size={16}/>} 
              label="Live Editor" 
            />
            <TabButton 
              active={activeTab === 'monitor'} 
              onClick={() => setActiveTab('monitor')} 
              icon={<Eye size={16}/>} 
              label="Student Monitor" 
              notificationCount={studentCodes.size > 0 ? studentCodes.size : null}
            />
          </div>
        </div>

        {/* Workspace Area */}
        <div className="flex-1 p-4 overflow-hidden bg-[#0D1117]">
          
          {/* 1. Live Coding Tab */}
          {activeTab === 'code' && (
            <div className="h-full">
                <CodeEditor 
                  value={code}
                  language={language}
                  onChange={handleCodeChange}
                  onLanguageChange={handleLanguageChange}
                />
            </div>
          )}

          {/* 2. Student Monitor Tab */}
          {activeTab === 'monitor' && (
            <div className="h-full flex gap-4">
              {/* Sidebar: Student List */}
              <div className="w-64 bg-[#161B22] rounded-xl border border-gray-800 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-gray-800 font-semibold text-sm text-gray-200">
                  Students ({participants.filter(p => p.role !== 'host').length})
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {participants.filter(p => p.role !== 'host').length === 0 && (
                    <p className="text-xs text-gray-500 text-center mt-4">No students joined yet.</p>
                  )}
                  {participants.filter(p => p.role !== 'host').map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedStudentId(p.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between group ${selectedStudentId === p.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:bg-gray-800'}`}
                    >
                      <span>{p.name || `Student ${p.id.substr(0,4)}`}</span>
                      {studentCodes.has(p.id) && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main: Read-only Editor */}
              <div className="flex-1 flex flex-col">
                {/* Monitor Header */}
                <div className="mb-2 px-2 flex justify-between items-center text-sm text-gray-400">
                    <span>
                        Viewing: <span className="text-white font-bold">{participants.find(p => p.id === selectedStudentId)?.name || (selectedStudentId ? 'Unknown Student' : 'No Selection')}</span>
                    </span>
                    {selectedStudentId && <span className="text-emerald-400 text-xs flex items-center gap-1"><Wifi size={10}/> Live Feed</span>}
                </div>

                {/* Read Only Monaco Instance */}
                <div className="flex-1 h-full">
                    <CodeEditor 
                        value={getMonitoredCode()} 
                        language={language} // Monitor usually mirrors the main language
                        readOnly={true} 
                    />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- Floating Chat --- */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {chatOpen && (
          <div className="bg-[#161B22] border border-gray-700 rounded-xl shadow-2xl w-80 h-96 flex flex-col mb-4 overflow-hidden animate-in fade-in slide-in-from-bottom-5">
            <div className="p-3 bg-[#21262d] border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <MessageSquare size={14} /> Session Chat
              </h3>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatPanel messages={chatMessages} onSend={handleSendMessage} currentUser="Host" />
            </div>
          </div>
        )}
        
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`p-4 rounded-full shadow-lg transition-all hover:scale-105 ${chatOpen ? 'bg-gray-700 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
        >
          {chatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>

    </div>
  );
};

// --------------------------------------------
// --- Helper Components ---
// --------------------------------------------

const TabButton = ({ active, onClick, icon, label, notificationCount }) => (
  <button 
    onClick={onClick} 
    className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
      active 
        ? 'border-emerald-500 text-white bg-[#161B22]' 
        : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
    } rounded-t-lg`}
  >
    {icon}
    {label}
    {notificationCount > 0 && (
      <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
    )}
  </button>
);

const ChatPanel = ({ messages, onSend, currentUser }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#161B22]">
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-xs mt-10">No messages yet</div>
        )}
        {messages.map((m, i) => {
          const isMe = m.sender === currentUser;
          return (
            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                isMe ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'
              }`}>
                {!isMe && <span className="text-[10px] font-bold opacity-50 block mb-0.5">{m.sender}</span>}
                {m.message}
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={handleSubmit} className="p-2 border-t border-gray-700 bg-[#21262d]">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-[#0D1117] border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
            placeholder="Type message..."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-md">
            <MessageSquare size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default HostView;