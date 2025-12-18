import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import CodeEditor from './CodeEditor';
import { 
    Plus, Play, Save, Lock, Unlock, Trash2, 
    Users, Eye, Terminal, UserX, Layout, Activity, 
    Trophy, Timer, Swords
} from 'lucide-react';

const HostBattleView = () => {
    const { session_id } = useParams(); 
    const battle_id = session_id;
    const { socket, isConnected } = useSocket();
    const navigate = useNavigate();

    // --- Core State ---
    const [battleState, setBattleState] = useState(null);
    const [viewMode, setViewMode] = useState('manage'); 
    const [activeQId, setActiveQId] = useState(null);
    const [error, setError] = useState(null);

    // --- Question Form State ---
    const [newQ, setNewQ] = useState({ title: '', description: '', example: '' });
    const [newCase, setNewCase] = useState({ stdin: '', expected_output: '', is_hidden: false });

    // --- Monitor & Leaderboard State ---
    const [participants, setParticipants] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [studentCodeMap, setStudentCodeMap] = useState(new Map()); 

    // --- SOCKET LOGIC ---
    useEffect(() => {
        if (!socket || !isConnected) return;

        console.log("⚔️ Host joining battle:", battle_id);
        socket.emit('join_battle', { battle_id });

        const handleBattleState = (state) => {
            console.log("✅ Battle State:", state);
            setBattleState(state);
            
            if(state.questions && state.questions.length > 0 && !activeQId) {
                setActiveQId(state.questions[0].question_id);
            }
            
            if (state.users) {
                setParticipants(state.users
                    .filter(u => u.role !== 'host')
                    .map(u => ({ ...u, score: u.score || 0 }))
                );
            }

            if (state.savedCode && Array.isArray(state.savedCode)) {
                const initialCodeMap = new Map();
                state.savedCode.forEach(sub => {
                    const userId = sub.user_id; 
                    if (userId) {
                        const userCodes = initialCodeMap.get(userId) || {};
                        userCodes[sub.question_id] = sub.code;
                        initialCodeMap.set(userId, userCodes);
                    }
                });
                setStudentCodeMap(initialCodeMap);
            }
        };

        const handleQuestionAdded = (q) => {
            setBattleState(prev => {
                if (!prev) return prev;
                if (prev.questions.some(existing => existing.question_id === q.question_id)) return prev;
                return { ...prev, questions: [...prev.questions, q] };
            });
        };

        const handleBattleStarted = () => {
            setBattleState(prev => (prev ? { ...prev, status: 'LIVE' } : prev));
        };

        const handleParticipantJoin = (user) => {
            setParticipants(prev => {
                if(prev.some(p => p.id === user.id)) return prev;
                return [...prev, { ...user, score: 0 }];
            });
        };

        const handleParticipantLeft = (userId) => {
            setParticipants(prev => prev.filter(p => p.id !== userId));
            if(selectedStudentId === userId) setSelectedStudentId(null);
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

        const handleScoreUpdate = ({ userId, score }) => {
            setParticipants(prev => prev.map(p => 
                p.id === userId ? { ...p, score: score } : p 
            ));
        };

        socket.on('battle_state', handleBattleState);
        socket.on('battle_question_added', handleQuestionAdded);
        socket.on('battle_started', handleBattleStarted);
        socket.on('battle_participant_joined', handleParticipantJoin);
        socket.on('joinee_left', handleParticipantLeft);
        socket.on('battle_participant_code_update', handleCodeUpdate);
        socket.on('battle_participant_score_update', handleScoreUpdate);
        
        return () => {
            socket.off('battle_state', handleBattleState);
            socket.off('battle_question_added', handleQuestionAdded);
            socket.off('battle_started', handleBattleStarted);
            socket.off('battle_participant_joined', handleParticipantJoin);
            socket.off('joinee_left', handleParticipantLeft);
            socket.off('battle_participant_code_update', handleCodeUpdate);
            socket.off('battle_participant_score_update', handleScoreUpdate);
        };
    }, [socket, isConnected, battle_id]);

    // --- Actions ---
    const handleAddQuestion = () => {
        if (!newQ.title.trim()) return alert("Title required");
        socket.emit('add_battle_question', { battle_id, ...newQ });
        setNewQ({ title: '', description: '', example: '' });
    };

    const handleAddTestCase = () => {
        if (!activeQId) return alert("Select a question first");
        socket.emit('add_battlecase', { question_id: activeQId, ...newCase });
        setBattleState(prev => {
            const newCases = prev.battleCases ? [...prev.battleCases] : [];
            // FIX: Ensure we have a unique ID for optimistic updates if DB id isn't back yet
            newCases.push({ ...newCase, question_id: activeQId, case_id: Date.now() + Math.random() });
            return { ...prev, battleCases: newCases };
        });
        setNewCase({ stdin: '', expected_output: '', is_hidden: false });
    };

    const startBattle = () => {
        if (window.confirm("Start the Battle? Timer will begin.")) {
            socket.emit('start_battle', { battle_id });
        }
    };

    const endBattle = () => {
        if (window.confirm("End the Battle? This will stop all submissions.")) {
            socket.emit('end_battle', { battle_id });
            navigate('/');
        }
    };

    const handleKick = (userId) => {
        if(window.confirm("Kick this user?")) {
            socket.emit('kick_battle_user', { battle_id, user_id_to_kick: userId });
        }
    };

    const getMonitoredCode = () => {
        if(!selectedStudentId) return "// Select a warrior to spectate";
        if(!activeQId) return "// Select a question context";
        const userCodes = studentCodeMap.get(selectedStudentId);
        return userCodes ? (userCodes[activeQId] || "// Warrior hasn't started this question") : "// No signal intercepted";
    };

    const sortedParticipants = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));

    if (!battleState) return <div className="h-screen flex items-center justify-center bg-[#0D1117] text-white">Loading Battle Arena...</div>;

    return (
        <div className="min-h-screen bg-[#0D1117] text-gray-300 p-6 flex flex-col gap-6 font-sans">
            
            {/* --- HEADER --- */}
            <div className="bg-[#161B22] p-4 rounded-xl border border-gray-800 flex justify-between items-center shadow-2xl">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Swords className="text-red-500" /> Battle Commander <span className="text-gray-600 text-lg font-mono">#{battle_id.slice(0,6)}</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                        <span className={`px-2 py-0.5 rounded ${battleState.status === 'LIVE' ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-blue-500/20 text-blue-400'}`}>
                            {battleState.status}
                        </span>
                        <span className="text-gray-500 flex items-center gap-1"><Timer size={12}/> Duration: {battleState.duration || 60}m</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="bg-gray-800 p-1 rounded-lg flex">
                        <button onClick={() => setViewMode('manage')} className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'manage' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <Layout size={16}/> Arena Setup
                        </button>
                        <button onClick={() => setViewMode('monitor')} className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'monitor' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <Activity size={16}/> Live War Room
                        </button>
                    </div>
                    {battleState.status !== 'LIVE' && battleState.status !== 'ENDED' && (
                        <button onClick={startBattle} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                            <Play size={18}/> Start Battle
                        </button>
                    )}
                     {battleState.status === 'LIVE' && (
                        <button onClick={endBattle} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-red-900/20">
                            <Trash2 size={18}/> End Battle
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                
                {/* --- LEFT: QUESTIONS LIST --- */}
                <div className="w-1/5 bg-[#161B22] rounded-xl border border-gray-800 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-800 bg-[#21262d]">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Terminal size={16} className="text-blue-400"/> Battle Rounds
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {battleState.questions.map((q, idx) => (
                            <button 
                                key={q.question_id || idx} /* FIX: Added Key Here */
                                onClick={() => setActiveQId(q.question_id)}
                                className={`w-full text-left p-3 rounded-lg transition-all group ${activeQId === q.question_id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-gray-800/40 hover:bg-gray-800'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-mono text-xs opacity-50">Round {idx+1}</span>
                                    {activeQId === q.question_id && <Eye size={12}/>}
                                </div>
                                <div className="truncate font-medium text-sm">{q.title}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- MIDDLE: MAIN CONTENT --- */}
                <div className="flex-1 flex flex-col min-w-0">
                    {viewMode === 'manage' ? (
                        <div className="h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                             {/* ADD QUESTION FORM */}
                             {battleState.status !== 'LIVE' && battleState.status !== 'ENDED' && (
                                <div className="bg-[#161B22] p-6 rounded-xl border border-gray-800 shadow-lg">
                                    <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2"><Plus size={18} className="text-emerald-400"/> Add Battle Round</h3>
                                    <div className="space-y-3">
                                        <input className="w-full bg-[#0D1117] border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="Round Title" value={newQ.title} onChange={e => setNewQ({...newQ, title: e.target.value})}/>
                                        <textarea className="w-full bg-[#0D1117] border border-gray-700 rounded p-2 text-sm h-20 text-white focus:border-blue-500 outline-none resize-none" placeholder="Problem Description" value={newQ.description} onChange={e => setNewQ({...newQ, description: e.target.value})}/>
                                        <textarea className="w-full bg-[#0D1117] border border-gray-700 rounded p-2 text-sm h-14 font-mono text-white focus:border-blue-500 outline-none resize-none" placeholder="Example I/O" value={newQ.example} onChange={e => setNewQ({...newQ, example: e.target.value})}/>
                                        <div className="flex justify-end"><button onClick={handleAddQuestion} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-bold shadow-md">Add Round</button></div>
                                    </div>
                                </div>
                             )}

                             {/* CASE MANAGER */}
                             {activeQId ? (
                                <div className="bg-[#161B22] p-6 rounded-xl border border-gray-800 flex-1 shadow-lg flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-md font-bold text-white">Test Cases (Round {battleState.questions.findIndex(q => q.question_id === activeQId) + 1})</h3>
                                    </div>
                                    <div className="space-y-2 mb-4 flex-1 overflow-y-auto">
                                        {battleState.battleCases && battleState.battleCases.filter(tc => tc.question_id === activeQId).map((tc, idx) => (
                                            <div key={tc.case_id || idx} /* FIX: Added Key Here */ className="flex justify-between items-center bg-gray-800/30 p-2 px-4 rounded border border-gray-700/50">
                                                <div className="flex gap-4 text-xs font-mono text-gray-400">
                                                    <span>In: {tc.stdin.slice(0, 20)}...</span>
                                                    <span>Out: {tc.expected_output.slice(0, 20)}...</span>
                                                </div>
                                                <div className={`text-[10px] px-2 py-0.5 rounded border ${tc.is_hidden ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'}`}>
                                                    {tc.is_hidden ? "HIDDEN" : "VISIBLE"}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Add Case Form */}
                                    <div className="border-t border-gray-700 pt-4 mt-auto">
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <textarea className="bg-[#0D1117] border border-gray-700 rounded p-2 font-mono text-xs h-16 text-gray-300" placeholder="Input" value={newCase.stdin} onChange={e => setNewCase({...newCase, stdin: e.target.value})}/>
                                            <textarea className="bg-[#0D1117] border border-gray-700 rounded p-2 font-mono text-xs h-16 text-gray-300" placeholder="Expected Output" value={newCase.expected_output} onChange={e => setNewCase({...newCase, expected_output: e.target.value})}/>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
                                                <input type="checkbox" checked={newCase.is_hidden} onChange={e => setNewCase({...newCase, is_hidden: e.target.checked})} className="rounded bg-gray-700 border-gray-600"/>
                                                Is Hidden Case?
                                            </label>
                                            <button onClick={handleAddTestCase} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium flex items-center gap-2"><Save size={14}/> Save Case</button>
                                        </div>
                                    </div>
                                </div>
                             ) : <div className="flex-1 flex items-center justify-center text-gray-600">Select a round to configure cases</div>}
                        </div>
                    ) : (
                        // MONITOR VIEW
                        <div className="h-full flex flex-col bg-[#161B22] rounded-xl border border-gray-800 overflow-hidden shadow-lg">
                            <div className="p-2 bg-[#21262d] border-b border-gray-800 flex justify-between items-center text-xs px-4">
                                <span className="text-gray-400">Spying on: <span className="text-white font-bold ml-1">{participants.find(p => p.id === selectedStudentId)?.name || "Nobody"}</span></span>
                                {selectedStudentId && <span className="text-red-400 flex items-center gap-1 animate-pulse"><Activity size={10}/> LIVE</span>}
                            </div>
                            <div className="flex-1 relative">
                                {selectedStudentId ? (
                                    <CodeEditor value={getMonitoredCode()} language="javascript" readOnly={true} />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                        <Eye size={48} className="mb-4 opacity-20"/>
                                        <p>Select a warrior from the leaderboard to inspect code</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- RIGHT: LEADERBOARD --- */}
                <div className="w-1/4 bg-[#161B22] rounded-xl border border-gray-800 flex flex-col overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-gray-800 bg-[#21262d] flex justify-between items-center">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Trophy size={16} className="text-yellow-400"/> Leaderboard
                        </h2>
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-white">{participants.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="text-xs text-gray-500 bg-gray-800/50 uppercase">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Rank</th>
                                    <th className="px-2 py-2 font-medium">Warrior</th>
                                    <th className="px-4 py-2 font-medium text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-800">
                                {sortedParticipants.map((p, idx) => (
                                    <tr 
                                        key={p.id || idx} /* FIX: Added Key Here */
                                        onClick={() => setSelectedStudentId(p.id)}
                                        className={`cursor-pointer transition-colors ${selectedStudentId === p.id ? 'bg-blue-900/20' : 'hover:bg-gray-800'}`}
                                    >
                                        <td className="px-4 py-3 font-mono text-gray-500">#{idx + 1}</td>
                                        <td className="px-2 py-3">
                                            <div className="font-medium text-gray-200">{p.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <button onClick={(e)=>{e.stopPropagation(); handleKick(p.id)}} className="text-[10px] text-red-400 hover:underline flex items-center gap-1"><UserX size={10}/> Kick</button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-yellow-400">{p.score}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default HostBattleView;