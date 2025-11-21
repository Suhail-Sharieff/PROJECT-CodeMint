import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import CodeEditor from './CodeEditor';
import { 
    Plus, Play, Save, Lock, Unlock, Trash2, 
    Users, Eye, Terminal, UserX, Layout, Activity, CheckCircle 
} from 'lucide-react';

const HostTestView = () => {
    const { test_id } = useParams();
    const { socket, isConnected } = useSocket();
    const navigate = useNavigate();

    // --- Core State ---
    const [testState, setTestState] = useState(null);
    const [viewMode, setViewMode] = useState('questions');
    const [activeQId, setActiveQId] = useState(null);
    const [error, setError] = useState(null); // Added Error State

    // --- Question Form State ---
    const [newQ, setNewQ] = useState({ title: '', description: '', example: '' });
    const [newCase, setNewCase] = useState({ stdin: '', expected_output: '', is_hidden: false });

    // --- Monitor State ---
    const [participants, setParticipants] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [studentCodeMap, setStudentCodeMap] = useState(new Map()); 

    // --- SOCKET LOGIC ---
    useEffect(() => {
        // Wait for connection before attempting anything
        if (!socket || !isConnected) return;

        console.log("🔌 Connected. Emitting join_test for:", test_id);
        
        // Clear any previous errors
        setError(null);

        // Define Handlers
        const handleTestState = (state) => {
            console.log("✅ Test State Received:", state);
            setTestState(state);
            
            if(state.questions.length > 0 && !activeQId) setActiveQId(state.questions[0].question_id);
            
            if (state.users) {
                setParticipants(state.users.filter(u => u.role === 'joinee'));
            }

            // --- Populate Code Map ---
            if (state.savedCode && Array.isArray(state.savedCode)) {
                const initialCodeMap = new Map();
                state.savedCode.forEach(submission => {
                    const userId = submission.user_id; 
                    if (userId) {
                        const userCodes = initialCodeMap.get(userId) || {};
                        userCodes[submission.question_id] = submission.code;
                        initialCodeMap.set(userId, userCodes);
                    }
                });
                setStudentCodeMap(initialCodeMap);
            }
        };

        const handleQuestionAdded = (q) => {
            setTestState(prev => {
                if (!prev) return prev;
                if (prev.questions.some(existing => existing.question_id === q.question_id)) return prev;
                return { ...prev, questions: [...prev.questions, q] };
            });
        };

        const handleTestStarted = () => {
            setTestState(prev => (prev ? { ...prev, status: 'LIVE' } : prev));
        };

        const handleParticipantJoin = (user) => {
            setParticipants(prev => {
                if(prev.some(p => p.id === user.id)) return prev;
                return [...prev, user];
            });
        };

        const handleParticipantLeft = (userId) => {
            setParticipants(prev => prev.filter(p => p.id !== userId));
            if(selectedStudentId === userId) setSelectedStudentId(null);
        };

        const handleParticipantFinished = ({ userId }) => {
            setParticipants(prev => prev.map(p => p.id === userId ? { ...p, status: 'finished' } : p));
        };

        const handleCodeUpdate = ({ userId, questionId, code }) => {
            setStudentCodeMap(prev => {
                const newMap = new Map(prev);
                const userCodes = newMap.get(userId) || {};
                userCodes[questionId] = code;
                newMap.set(userId, userCodes);
                return newMap;
            });
        };

        const handleError = (err) => {
            console.error("Socket Error:", err);
            setError(err.message || "Unknown error occurred");
        };

        // Attach Listeners
        socket.on('test_state', handleTestState);
        socket.on('question_added', handleQuestionAdded);
        socket.on('test_started', handleTestStarted);
        socket.on('test_participant_joined', handleParticipantJoin);
        socket.on('joinee_left', handleParticipantLeft);
        socket.on('participant_finished', handleParticipantFinished);
        socket.on('participant_code_update', handleCodeUpdate);
        socket.on('error', handleError);

        // EMIT JOIN
        socket.emit('join_test', { test_id });

        // Cleanup
        return () => {
            socket.off('test_state', handleTestState);
            socket.off('question_added', handleQuestionAdded);
            socket.off('test_started', handleTestStarted);
            socket.off('test_participant_joined', handleParticipantJoin);
            socket.off('joinee_left', handleParticipantLeft);
            socket.off('participant_finished', handleParticipantFinished);
            socket.off('participant_code_update', handleCodeUpdate);
            socket.off('error', handleError);
        };
    }, [socket, isConnected, test_id]);

    // --- Handlers ---
    const handleAddQuestion = () => {
        if (!newQ.title.trim()) return alert("Title required");
        socket.emit('add_question', { test_id, ...newQ });
        setNewQ({ title: '', description: '', example: '' });
    };

    const handleAddTestCase = () => {
        if (!activeQId) return alert("Select a question first");
        socket.emit('add_testcase', { question_id: activeQId, ...newCase });
        
        // Optimistic Update
        setTestState(prev => ({
            ...prev,
            testCases: [...prev.testCases, { ...newCase, question_id: activeQId, case_id: Date.now() }]
        }));
        setNewCase({ stdin: '', expected_output: '', is_hidden: false });
    };

    const startTest = () => {
        if (window.confirm("Start test for all participants?")) {
            socket.emit('start_test', { test_id });
        }
    };

    const handleKick = (userId) => {
        if(window.confirm("Kick this user from the test?")) {
            socket.emit('kick_test_user', { test_id, user_id_to_kick: userId });
        }
    };

    const getMonitoredCode = () => {
        if(!selectedStudentId) return "// Select a student to view code";
        if(!activeQId) return "// Select a question to view code";
        const userCodes = studentCodeMap.get(selectedStudentId);
        return userCodes ? (userCodes[activeQId] || "// Student hasn't started this question yet") : "// No code data received yet";
    };

    // --- RENDER ---

    // Show Error if occurred
    if (error) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#0D1117] text-white">
            <div className="p-6 bg-red-900/20 border border-red-500/50 rounded-lg max-w-md text-center">
                <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
                <p className="text-gray-300 mb-4">{error}</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 rounded hover:bg-red-500">Retry</button>
            </div>
        </div>
    );

    if (!isConnected) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#0D1117] text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p>Connecting to Server...</p>
        </div>
    );

    if (!testState) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#0D1117] text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
            <p>Loading Test Data...</p>
            <p className="text-xs text-gray-500 mt-2">If this persists, try refreshing page again....</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0D1117] text-gray-300 p-6 flex flex-col gap-6 font-sans">
            {/* ... Rest of your UI remains identical ... */}
            {/* Just copying the top bar for context, you can paste the rest of your render block here */}
            <div className="bg-[#161B22] p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        Test Manager <span className="text-gray-500 text-lg font-mono font-normal">({test_id})</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${testState.status === 'LIVE' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {testState.status}
                        </span>
                        <span className="text-xs text-gray-500">• {testState.questions.length} Questions</span>
                        <span className="text-xs text-gray-500">• {participants.length} Candidates</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="bg-gray-800 p-1 rounded-lg flex">
                        <button onClick={() => setViewMode('questions')} className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'questions' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                            <Layout size={16}/> Manage
                        </button>
                        <button onClick={() => setViewMode('monitor')} className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'monitor' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                            <Activity size={16}/> Monitor
                        </button>
                    </div>
                    {testState.status === 'DRAFT' && (
                        <button onClick={startTest} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                            <Play size={18}/> Start Test
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex gap-6 overflow-hidden">
                
                {/* LEFT: Question List */}
                <div className="w-1/4 bg-[#161B22] rounded-xl border border-gray-800 p-4 flex flex-col">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Terminal size={18} className="text-blue-400"/> Questions
                    </h2>
                    <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                        {testState.questions.map((q, idx) => (
                            <button 
                                key={q.question_id}
                                onClick={() => setActiveQId(q.question_id)}
                                className={`w-full text-left p-3 rounded-lg transition-colors group ${activeQId === q.question_id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-gray-800 hover:bg-gray-700'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-mono mr-2 text-xs opacity-50">Q{idx+1}</span>
                                    {activeQId === q.question_id && <Eye size={14}/>}
                                </div>
                                <div className="truncate font-medium text-sm">{q.title}</div>
                            </button>
                        ))}
                        {testState.questions.length === 0 && <p className="text-gray-500 text-xs text-center italic">No questions yet</p>}
                    </div>
                </div>

                {/* RIGHT: Manage or Monitor */}
                {viewMode === 'questions' && (
                    <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                        {testState.status === 'DRAFT' && (
                            <div className="bg-[#161B22] p-6 rounded-xl border border-gray-800">
                                <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2"><Plus size={18} className="text-emerald-400"/> Add Question</h3>
                                <div className="space-y-3">
                                    <input className="w-full bg-[#0D1117] border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="Question Title" value={newQ.title} onChange={e => setNewQ({...newQ, title: e.target.value})}/>
                                    <textarea className="w-full bg-[#0D1117] border border-gray-700 rounded p-2 text-sm h-24 text-white focus:border-blue-500 outline-none resize-none" placeholder="Problem Description" value={newQ.description} onChange={e => setNewQ({...newQ, description: e.target.value})}/>
                                    <textarea className="w-full bg-[#0D1117] border border-gray-700 rounded p-2 text-sm h-16 text-white focus:border-blue-500 outline-none resize-none font-mono" placeholder="Example IO" value={newQ.example} onChange={e => setNewQ({...newQ, example: e.target.value})}/>
                                    <div className="flex justify-end"><button onClick={handleAddQuestion} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium">Save Question</button></div>
                                </div>
                            </div>
                        )}

                        {activeQId ? (
                            <div className="bg-[#161B22] p-6 rounded-xl border border-gray-800 flex-1">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-md font-bold text-white">Test Cases</h3>
                                    {testState.status !== 'DRAFT' && <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">Read Only</span>}
                                </div>
                                <div className="space-y-2 mb-6">
                                    {testState.testCases && testState.testCases.filter(tc => tc.question_id === activeQId).map((tc, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-800/50 p-3 rounded border border-gray-700">
                                            <div className="flex gap-6 text-sm font-mono overflow-hidden">
                                                <span className="text-blue-300 truncate max-w-[150px]">In: {tc.stdin}</span>
                                                <span className="text-green-300 truncate max-w-[150px]">Out: {tc.expected_output}</span>
                                            </div>
                                            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${tc.is_hidden ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                {tc.is_hidden ? <Lock size={12}/> : <Unlock size={12}/>} {tc.is_hidden ? "Hidden" : "Visible"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {testState.status === 'DRAFT' && (
                                    <div className="border-t border-gray-700 pt-4">
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <textarea className="w-full bg-[#0D1117] border border-gray-700 rounded p-3 font-mono text-sm h-24 text-gray-300 focus:border-emerald-500 outline-none resize-none" placeholder="Input" value={newCase.stdin} onChange={e => setNewCase({...newCase, stdin: e.target.value})}/>
                                            <textarea className="w-full bg-[#0D1117] border border-gray-700 rounded p-3 font-mono text-sm h-24 text-gray-300 focus:border-emerald-500 outline-none resize-none" placeholder="Expected Output" value={newCase.expected_output} onChange={e => setNewCase({...newCase, expected_output: e.target.value})}/>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <button onClick={() => setNewCase(prev => ({...prev, is_hidden: !prev.is_hidden}))} className={`flex items-center gap-2 px-4 py-2 rounded border text-sm ${newCase.is_hidden ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-gray-700 bg-gray-800 text-gray-400'}`}>
                                                {newCase.is_hidden ? <Lock size={14}/> : <Unlock size={14}/>} {newCase.is_hidden ? 'Hidden Case' : 'Visible Sample'}
                                            </button>
                                            <button onClick={handleAddTestCase} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-2 text-sm font-medium"><Save size={16}/> Save Case</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-600 border border-dashed border-gray-800 rounded-xl">Select a question to manage cases</div>
                        )}
                    </div>
                )}

                {viewMode === 'monitor' && (
                    <div className="flex-1 flex gap-4 overflow-hidden">
                        <div className="w-64 bg-[#161B22] rounded-xl border border-gray-800 flex flex-col">
                            <div className="p-3 border-b border-gray-800 font-bold text-sm text-gray-200 bg-[#21262d] flex justify-between">
                                <span>Candidates</span><span className="text-xs bg-blue-600 px-2 py-0.5 rounded text-white">{participants.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {participants.map(p => (
                                    <div key={p.id} onClick={() => setSelectedStudentId(p.id)} className={`flex justify-between items-center p-2 rounded-lg cursor-pointer border ${selectedStudentId === p.id ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:bg-gray-800'}`}>
                                        <div>
                                            <div className="text-sm font-medium text-gray-200 truncate">{p.name}</div>
                                            <div className="text-[10px] flex items-center gap-1 mt-0.5">
                                                {p.status === 'finished' ? <span className="text-green-400 flex items-center gap-1"><CheckCircle size={10}/> Submitted</span> : <span className="text-yellow-400 flex items-center gap-1"><Activity size={10}/> Active</span>}
                                            </div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleKick(p.id); }} className="text-gray-600 hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded"><UserX size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 bg-[#161B22] rounded-xl border border-gray-800 flex flex-col overflow-hidden">
                            <div className="p-2 bg-[#21262d] border-b border-gray-800 flex justify-between items-center text-xs px-4">
                                <span className="text-gray-400">Viewing: <span className="text-white font-bold ml-1">{participants.find(p => p.id === selectedStudentId)?.name || "None"}</span></span>
                                {selectedStudentId && <span className="text-emerald-400 flex items-center gap-1 animate-pulse"><Activity size={10}/> Live Feed</span>}
                            </div>
                            <div className="flex-1 relative">
                                {selectedStudentId ? <CodeEditor value={getMonitoredCode()} language="javascript" readOnly={true} /> : <div className="h-full flex flex-col items-center justify-center text-gray-600"><Users size={32} className="mb-2 opacity-20"/><p>Select a candidate to monitor</p></div>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HostTestView;