import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import CodeEditor from './CodeEditor';
import {
    Share2, MessageSquare, X, Wifi, WifiOff,
    Info, Terminal, Monitor, LogOut, Code
} from 'lucide-react';

const JoinView = () => {
    const { session_id } = useParams();
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();
    const navigate = useNavigate();

    // --- State ---
    const [hostCode, setHostCode] = useState('// Waiting for host...');
    const [myCode, setMyCode] = useState('// Write your solution here...');
    const [language, setLanguage] = useState('javascript');
    const [chatMessages, setChatMessages] = useState([]);

    // UI State
    const [activeTab, setActiveTab] = useState('host'); // 'host' | 'mine'
    const [chatOpen, setChatOpen] = useState(false);
    const [showSocketInfo, setShowSocketInfo] = useState(false);

    // --- Socket Logic ---
    useEffect(() => {
        if (!socket) return;

        console.log(`Joinee joining session: ${session_id}`);
        socket.emit('join_session', { session_id });

        // 1. Initial State
        // inside JoinView.jsx

        // ... inside useEffect
        socket.on('session_state', (state) => {
            if (state.code) setHostCode(state.code);
            if (state.language) setLanguage(state.language);
            if (state.chat) setChatMessages(state.chat);

            // --- ADD THIS BLOCK ---
            // If the server sent back my previous code, restore it.
            if (state.userCode) {
                setMyCode(state.userCode);
            }
        });

        // 2. Real-time Host Updates
        socket.on('host_code_update', (newCode) => {
            setHostCode(newCode);
        });

        socket.on('language_change', (newLang) => {
            setLanguage(newLang);
        });

        // 3. Chat
        socket.on('chat_message', (msg) => {
            setChatMessages(prev => [...prev, msg]);
        });

        // 4. Session Management
        socket.on('session_ended', () => {
            alert('The host has ended the session.');
            navigate('/');
        });

        socket.on('kicked', () => {
            alert('You have been removed from the session by the host.');
            navigate('/');
        });

        return () => {
            socket.off('session_state');
            socket.off('host_code_update');
            socket.off('language_change');
            socket.off('chat_message');
            socket.off('session_ended');
            socket.off('kicked');
        };
    }, [socket, session_id, navigate]);

    // --- Handlers ---

    const handleMyCodeChange = (newCode) => {
        setMyCode(newCode);
        // Emit changes to Host's Monitor (Private channel)
        socket.emit('joinee_code_change', { session_id, code: newCode });
    };

    const handleLeaveSession = () => {
        if (window.confirm("Are you sure you want to leave?")) {
            navigate('/');
        }
    };

    const handleSendMessage = (text) => {
        if (!text.trim()) return;
        // Optimistic update
        const tempMsg = { message: text, sender: user?.name || 'Me', timestamp: new Date() };
        setChatMessages(prev => [...prev, tempMsg]);
        socket.emit('send_message', { session_id, message: text });
    };

    return (
        <div className="h-screen bg-[#0D1117] text-gray-300 flex flex-col overflow-hidden font-sans">

            {/* --- Header --- */}
            <header className="bg-[#161B22] border-b border-gray-800 p-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-3">
                            {user?.name}
                            <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                                {isConnected ? 'Connected' : 'Reconnecting'}
                            </span>
                        </h1>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span className="font-mono">Session: {session_id}</span>
                            <button onClick={() => setShowSocketInfo(!showSocketInfo)} className="hover:text-blue-400 ml-2"><Info size={12} /></button>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLeaveSession}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800 border border-gray-700 text-gray-300 rounded-lg transition-all text-sm"
                >
                    <LogOut size={16} />
                    <span>Leave</span>
                </button>
            </header>

            {showSocketInfo && (
                <div className="bg-gray-900 p-2 text-xs font-mono border-b border-gray-800 text-gray-500 text-center">
                    Socket ID: {socket?.id || 'N/A'}
                </div>
            )}

            {/* --- Main Content --- */}
            <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* Tab Navigation */}
                <div className="bg-[#0D1117] border-b border-gray-800 px-4 pt-2 flex-shrink-0">
                    <div className="flex space-x-1">
                        <TabButton
                            active={activeTab === 'host'}
                            onClick={() => setActiveTab('host')}
                            icon={<Monitor size={16} />}
                            label="Host's Screen"
                            color="blue"
                        />
                        <TabButton
                            active={activeTab === 'mine'}
                            onClick={() => setActiveTab('mine')}
                            icon={<Code size={16} />}
                            label="My Playground"
                            color="emerald"
                        />
                    </div>
                </div>

                {/* Workspace */}
                <div className="flex-1 p-4 overflow-hidden bg-[#0D1117]">

                    {/* 1. Host Screen (Read Only) */}
                    {activeTab === 'host' && (
                        <div className="h-full flex flex-col animate-in fade-in duration-300">
                            <div className="mb-2 flex justify-between items-center px-2">
                                <span className="text-xs text-blue-400 font-semibold flex items-center gap-2">
                                    <Wifi size={12} className="animate-pulse" /> LIVE STREAM FROM HOST
                                </span>
                                <span className="text-xs text-gray-500">Read-only</span>
                            </div>
                            <div className="flex-1 border border-blue-500/20 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                <CodeEditor
                                    value={hostCode}
                                    language={language}
                                    readOnly={true} // Vital: Students cannot edit Host code
                                />
                            </div>
                        </div>
                    )}

                    {/* 2. My Playground (Editable) */}
                    {activeTab === 'mine' && (
                        <div className="h-full flex flex-col animate-in fade-in duration-300">
                            <div className="mb-2 flex justify-between items-center px-2">
                                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-2">
                                    <Terminal size={12} /> YOUR WORKSPACE
                                </span>
                                <span className="text-xs text-gray-500">Visible to Host</span>
                            </div>
                            <div className="flex-1 border border-emerald-500/20 rounded-lg overflow-hidden">
                                <CodeEditor
                                    value={myCode}
                                    language={language}
                                    onChange={handleMyCodeChange}
                                    readOnly={false}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Chat (Same as Host) --- */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
                {chatOpen && (
                    <div className="bg-[#161B22] border border-gray-700 rounded-xl shadow-2xl w-80 h-96 flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-5">
                        <div className="p-3 bg-[#21262d] border-b border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-sm text-white flex items-center gap-2">
                                <MessageSquare size={14} /> Team Chat
                            </h3>
                            <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ChatPanel messages={chatMessages} onSend={handleSendMessage} currentUser={user?.name || 'Me'} />
                        </div>
                    </div>
                )}

                <button onClick={() => setChatOpen(!chatOpen)} className={`p-4 rounded-full shadow-lg transition-all hover:scale-105 ${chatOpen ? 'bg-gray-700 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                    {chatOpen ? <X size={24} /> : <MessageSquare size={24} />}
                </button>
            </div>

        </div>
    );
};

// --- Sub-components ---

const TabButton = ({ active, onClick, icon, label, color }) => (
    <button
        onClick={onClick}
        className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${active
                ? `border-${color}-500 text-white bg-[#161B22]`
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            } rounded-t-lg`}
    >
        {icon}
        {label}
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
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-700" ref={scrollRef}>
                {messages.map((m, i) => {
                    const isMe = m.sender === currentUser;
                    return (
                        <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                                {!isMe && <span className="text-[10px] font-bold opacity-50 block mb-0.5">{m.sender}</span>}
                                {m.message}
                            </div>
                        </div>
                    );
                })}
            </div>
            <form onSubmit={handleSubmit} className="p-2 border-t border-gray-700 bg-[#21262d]">
                <div className="flex gap-2">
                    <input className="flex-1 bg-[#0D1117] border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="Type message..." value={input} onChange={e => setInput(e.target.value)} />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-md"><MessageSquare size={16} /></button>
                </div>
            </form>
        </div>
    );
};

export default JoinView;