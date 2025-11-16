import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import CodeEditor from './CodeEditor'; // Ensure this path is correct
import {
    Share2, Users, MessageSquare,
    X, Wifi, WifiOff, Info, Terminal, Eye, LogOut, 
    UserX // --- ADDED --- Icon for kicking user
} from 'lucide-react';

const HostView = () => {
    const { session_id } = useParams();
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();
    const navigate = useNavigate();

    // --- State Management ---
    const [code, setCode] = useState('// Start typing your solution here...');
    const [language, setLanguage] = useState('javascript');
    const [users, setUsers] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [joineeCodes, setJoineeCodes] = useState(new Map());
    const [selectedJoineeId, setSelectedJoineeId] = useState('');
    const [activeTab, setActiveTab] = useState('code');
    const [chatOpen, setChatOpen] = useState(false);
    const [showSocketInfo, setShowSocketInfo] = useState(false);
    const [showEndModal, setShowEndModal] = useState(false);

    // --- Socket Event Listeners ---
    useEffect(() => {
        if (!socket) return;
        
        socket.emit('join_session', { session_id });

        const handleSessionState = (state) => {
            if (state.code) setCode(state.code);
            if (state.language) setLanguage(state.language);
            if (state.users) setUsers(state.users);
            if (state.chat) setChatMessages(state.chat);
        };
        const handleJoineeJoined = (newUser) => {
            setUsers(prev => prev.some(p => p.id === newUser.id) ? prev : [...prev, newUser]);
        };
        const handleJoineeLeft = (userId) => {
            setUsers(prev => prev.filter(p => p.id !== userId));
            if (selectedJoineeId === userId) setSelectedJoineeId('');
        };
        const handleChatMessage = (msg) => setChatMessages(prev => [...prev, msg]);
        const handleJoineeCodeUpdate = ({ joineeId, code: joineeCode }) => {
            setJoineeCodes(prev => new Map(prev).set(joineeId, joineeCode));
        };

        socket.on('session_state', handleSessionState);
        socket.on('joinee_joined', handleJoineeJoined);
        socket.on('joinee_left', handleJoineeLeft);
        socket.on('chat_message', handleChatMessage);
        socket.on('joinee_code_update', handleJoineeCodeUpdate);

        return () => {
            socket.off('session_state', handleSessionState);
            socket.off('joinee_joined', handleJoineeJoined);
            socket.off('joinee_left', handleJoineeLeft);
            socket.off('chat_message', handleChatMessage);
            socket.off('joinee_code_update', handleJoineeCodeUpdate);
        };
    }, [socket, session_id, selectedJoineeId]);

    // --- Browser Navigation Safety ---
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = "Session is still active.";
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    // --- Action Handlers ---

    const handleEndSession = () => {
        if (socket) socket.emit('end_session', { session_id });
        navigate("/");
    };

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        socket?.emit('host_code_change', { session_id, new_code: newCode });
    };

    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        socket?.emit('host_language_change', { session_id, language: newLang });
    };

    const handleSendMessage = (text) => {
        if (!text.trim()) return;
        const tempMsg = { message: text, sender: user?.name || 'Host', timestamp: new Date() };
        setChatMessages(prev => [...prev, tempMsg]);
        socket?.emit('send_message', { session_id, message: text });
    };

    const copyInviteLink = () => {
        const link = `${window.location.origin}/join/${session_id}`;
        navigator.clipboard.writeText(link);
        alert("Invite link copied to clipboard!");
    };

    const getMonitoredCode = () => {
        if (!selectedJoineeId) return '// Select a student from the sidebar to view their code...';
        return joineeCodes.get(selectedJoineeId) || '// Student has not started typing yet.';
    };

    // --- ADDED ---
    // Handler to emit the kick event
    const handleKickUser = (joinee) => {
        if (window.confirm(`Are you sure you want to remove ${joinee.name || 'this user'}?`)) {
            socket.emit('kick_user', {
                session_id: session_id,
                user_id_to_kick: joinee.id
            });
        }
    };

    return (
        <div className="h-screen bg-[#0D1117] text-gray-300 flex flex-col overflow-hidden font-sans">
            
            {/* --- Header --- */}
            <header className="bg-[#161B22] border-b border-gray-800 p-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-3">
                            {user?.name} <span className="text-gray-500 text-base font-normal">[Host]</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                                {isConnected ? 'Live' : 'Offline'}
                            </span>
                        </h1>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span className="font-mono bg-gray-800 px-1.5 py-0.5 rounded">ID: {session_id}</span>
                            <button onClick={() => setShowSocketInfo(!showSocketInfo)} className="hover:text-blue-400 ml-2" title="Socket Details">
                                <Info size={12} />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowEndModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600/10 border border-red-600/50 text-red-400 hover:bg-red-600 hover:text-white font-semibold rounded-lg transition-all">
                        <LogOut size={16} />
                        <span>End Session</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm bg-[#0D1117] border border-gray-800 px-3 py-1.5 rounded-lg">
                        <Users size={14} className="text-blue-400" />
                        <span>{users.length} active</span>
                    </div>
                    <button onClick={copyInviteLink} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium shadow-lg shadow-emerald-900/20">
                        <Share2 size={16} />
                        <span>Invite</span>
                    </button>
                </div>
            </header>

            {showSocketInfo && (
                <div className="bg-gray-900 p-2 text-xs font-mono border-b border-gray-800 text-gray-500 flex justify-center">
                    Socket ID: {socket?.id || 'N/A'} | Transport: {socket?.io?.engine?.transport?.name || 'N/A'}
                </div>
            )}

            {/* --- Main Content --- */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="bg-[#0D1117] border-b border-gray-800 px-4 pt-2 flex-shrink-0">
                    <div className="flex space-x-1">
                        <TabButton active={activeTab === 'code'} onClick={() => setActiveTab('code')} icon={<Terminal size={16} />} label="Live Editor" />
                        <TabButton active={activeTab === 'monitor'} onClick={() => setActiveTab('monitor')} icon={<Eye size={16} />} label="Joinee Monitor" notificationCount={joineeCodes.size > 0 ? joineeCodes.size : null} />
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-hidden bg-[#0D1117]">
                    {activeTab === 'code' && (
                        <div className="h-full animate-in fade-in duration-300">
                            <CodeEditor 
                                value={code}
                                language={language}
                                onChange={handleCodeChange}
                                onLanguageChange={handleLanguageChange}
                            />
                        </div>
                    )}
                    
                    {/* --- UPDATED --- Monitor Tab now has Kick Button */}
                    {activeTab === 'monitor' && (
                        <div className="h-full flex gap-4 animate-in fade-in duration-300">
                            <div className="w-64 bg-[#161B22] rounded-xl border border-gray-800 flex flex-col overflow-hidden">
                                <div className="p-3 border-b border-gray-800 font-semibold text-sm text-gray-200 bg-[#21262d]">
                                    Participants ({users.filter(p => p.role !== 'host').length})
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {users.filter(p => p.role !== 'host').length === 0 && (
                                        <p className="text-xs text-gray-500 text-center mt-10">Waiting for students to join...</p>
                                    )}
                                    
                                    {users.filter(p => p.role !== 'host').map(p => (
                                        <div 
                                            key={p.id} 
                                            className={`w-full flex items-center justify-between group rounded-lg transition-colors ${
                                                selectedJoineeId === p.id ? 'bg-blue-500/20' : 'hover:bg-gray-800'
                                            }`}
                                        >
                                            {/* Clickable Area to View Code */}
                                            <button
                                                onClick={() => setSelectedJoineeId(p.id)}
                                                className={`flex-1 flex items-center justify-between text-left px-3 py-2 rounded-l-lg truncate ${
                                                    selectedJoineeId === p.id ? 'text-blue-300' : 'text-gray-400 group-hover:text-gray-200'
                                                }`}
                                            >
                                                <span className="truncate">{p.name || `User ${p.id.substr(0,4)}`}</span>
                                                {joineeCodes.has(p.id) && <div className="w-2 h-2 rounded-full bg-emerald-500 ml-2 flex-shrink-0"></div>}
                                            </button>
                                            
                                            {/* Kick Button */}
                                            <button
                                                onClick={() => handleKickUser(p)}
                                                title={`Remove ${p.name || 'user'}`}
                                                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 opacity-50 group-hover:opacity-100 rounded-r-lg transition-all"
                                            >
                                                <UserX size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col bg-[#161B22] rounded-xl border border-gray-800 overflow-hidden">
                                <div className="p-2 bg-[#21262d] border-b border-gray-800 flex justify-between items-center text-xs px-4">
                                    <span className="text-gray-400">
                                        Viewing: <span className="text-white font-bold ml-1">{users.find(p => p.id === selectedJoineeId)?.name || (selectedJoineeId ? 'Unknown' : 'None')}</span>
                                    </span>
                                    {selectedJoineeId && <span className="text-emerald-400 flex items-center gap-1"><Wifi size={10} /> Live Feed</span>}
                                </div>
                                <div className="flex-1">
                                    <CodeEditor value={getMonitoredCode()} language={language} readOnly={true} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Floating Chat --- */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
                <div className="pointer-events-auto">
                    {chatOpen && (
                        <div className="bg-[#161B22] border border-gray-700 rounded-xl shadow-2xl w-80 h-96 flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                            <div className="p-3 bg-[#21262d] border-b border-gray-700 flex justify-between items-center">
                                <h3 className="font-bold text-sm text-white flex items-center gap-2"><MessageSquare size={14} /> Team Chat</h3>
                                <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white"><X size={14} /></button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <ChatPanel messages={chatMessages} onSend={handleSendMessage} currentUser={user?.name || 'Host'} />
                            </div>
                        </div>
                    )}
                    <button onClick={() => setChatOpen(!chatOpen)} className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center justify-center ${chatOpen ? 'bg-gray-700 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                        {chatOpen ? <X size={24} /> : <MessageSquare size={24} />}
                    </button>
                </div>
            </div>

            {/* --- End Session Modal --- */}
            {showEndModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
                    <div className="bg-[#161B22] p-6 rounded-xl w-96 border border-gray-700 shadow-2xl transform transition-all scale-100">
                        <h2 className="text-xl text-white font-semibold mb-2">End Session?</h2>
                        <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                            This will disconnect all participants and close the room. 
                            <br/>Code data will be saved in the database.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowEndModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleEndSession} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                                Confirm End
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

// ------------------------------------------------------
// --- Internal Helper Components ---
// ------------------------------------------------------
const TabButton = ({ active, onClick, icon, label, notificationCount }) => (
    <button onClick={onClick} className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${active ? 'border-emerald-500 text-white bg-[#161B22]' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'} rounded-t-lg`}>
        {icon}
        {label}
        {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
        )}
    </button>
);

const ChatPanel = ({ messages, onSend, currentUser }) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);

    useEffect(() => {
        if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 text-xs">
                        <MessageSquare size={24} className="mb-2 opacity-20" />
                        <p>No messages yet</p>
                    </div>
                )}
                {messages.map((m, i) => {
                    const isMe = m.sender === currentUser;
                    return (
                        <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none'}`}>
                                {!isMe && <span className="text-[10px] font-bold text-blue-400 block mb-0.5">{m.sender}</span>}
                                {m.message}
                            </div>
                            <span className="text-[10px] text-gray-600 mt-1 px-1">
                                {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                            </span>
                        </div>
                    );
                })}
            </div>
            <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700 bg-[#21262d]">
                <div className="flex gap-2">
                    <input className="flex-1 bg-[#0D1117] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-600" placeholder="Type message..." value={input} onChange={e => setInput(e.target.value)} />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors"><MessageSquare size={18} /></button>
                </div>
            </form>
        </div>
    );
};

export default HostView;