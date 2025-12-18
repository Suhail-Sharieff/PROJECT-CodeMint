import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import CodeEditor from "./CodeEditor";
import {
  Plus, Play, Save, Trash2, Eye, Terminal, UserX, Layout, Activity, Trophy, Timer, Swords,
} from "lucide-react";

const HostBattleView = () => {
  const { session_id } = useParams();
  const battle_id = session_id;
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();

  const [battleState, setBattleState] = useState(null);
  const [viewMode, setViewMode] = useState("manage");
  const [activeQId, setActiveQId] = useState(null);
  
  const [newQ, setNewQ] = useState({ title: "", description: "", example: "" });
  const [newCase, setNewCase] = useState({ stdin: "", expected_output: "", is_hidden: false });
  const [participants, setParticipants] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentCodeMap, setStudentCodeMap] = useState(new Map());

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit("join_battle", { battle_id });

    const handleBattleState = (state) => {
      // 1. Map backend battle_question_id to frontend question_id for consistency
      const standardizedQuestions = (state.questions || []).map(q => ({
        ...q,
        question_id: q.battle_question_id || q.question_id
      }));

      const safeState = {
        ...state,
        questions: standardizedQuestions,
        battleCases: state.battleCases || [], // Ensure array for filtering
        duration: state.duration || 60 // Fallback if backend emit is missing duration
      };

      setBattleState(safeState);

      if (standardizedQuestions.length > 0 && !activeQId) {
        setActiveQId(standardizedQuestions[0].question_id);
      }

      if (state.users) {
        setParticipants(state.users.filter((u) => u.role !== "host").map((u) => ({ ...u, score: u.score || 0 })));
      }

      if (state.savedCode && Array.isArray(state.savedCode)) {
        const initialCodeMap = new Map();
        state.savedCode.forEach((sub) => {
          const userId = sub.user_id;
          if (userId) {
            const userCodes = initialCodeMap.get(userId) || {};
            // Align with frontend question_id
            const qId = sub.battle_question_id || sub.question_id;
            userCodes[qId] = sub.code;
            initialCodeMap.set(userId, userCodes);
          }
        });
        setStudentCodeMap(initialCodeMap);
      }
    };

    const handleQuestionAdded = (q) => {
      setBattleState((prev) => {
        if (!prev) return prev;
        // Standardize the ID before adding to state
        const newQuestion = { ...q, question_id: q.battle_question_id || q.question_id };
        
        if (prev.questions.some((existing) => existing.question_id === newQuestion.question_id)) return prev;
        return { ...prev, questions: [...prev.questions, newQuestion] };
      });
    };

    const handleBattleStarted = () => {
      setBattleState((prev) => (prev ? { ...prev, status: "LIVE" } : prev));
    };

    const handleParticipantJoin = (user) => {
      setParticipants((prev) => prev.some((p) => p.id === user.id) ? prev : [...prev, { ...user, score: 0 }]);
    };

    const handleParticipantLeft = (userId) => {
      setParticipants((prev) => prev.filter((p) => p.id !== userId));
      if (selectedStudentId === userId) setSelectedStudentId(null);
    };

    const handleCodeUpdate = ({ userId, questionId, code }) => {
      setStudentCodeMap((prev) => {
        const newMap = new Map(prev);
        const userCodes = newMap.get(userId) || {};
        userCodes[questionId] = code;
        newMap.set(userId, userCodes);
        return newMap;
      });
    };

    const handleScoreUpdate = ({ userId, score }) => {
      setParticipants((prev) => prev.map((p) => (p.id === userId ? { ...p, score: score } : p)));
    };

    socket.on("battle_state", handleBattleState);
    socket.on("battle_question_added", handleQuestionAdded);
    socket.on("battle_started", handleBattleStarted);
    socket.on("battle_participant_joined", handleParticipantJoin);
    socket.on("joinee_left", handleParticipantLeft);
    socket.on("battle_participant_code_update", handleCodeUpdate);
    socket.on("battle_participant_score_update", handleScoreUpdate);

    return () => {
      socket.off("battle_state"); socket.off("battle_question_added"); socket.off("battle_started");
      socket.off("battle_participant_joined"); socket.off("joinee_left");
      socket.off("battle_participant_code_update"); socket.off("battle_participant_score_update");
    };
  }, [socket, isConnected, battle_id]);

  const handleAddQuestion = () => {
    if (!newQ.title.trim()) return alert("Title required");
    socket.emit("add_battle_question", { battle_id, ...newQ });
    setNewQ({ title: "", description: "", example: "" });
  };

  const handleAddTestCase = () => {
    if (!activeQId) return alert("Select a question first");

    // Backend expects battle_question_id
    socket.emit("add_battlecase", {
      battle_question_id: activeQId,
      ...newCase,
    });

    setBattleState((prev) => {
      const currentCases = prev.battleCases || [];
      const newCaseObj = {
        ...newCase,
        question_id: activeQId, 
        case_id: Date.now(),
      };
      return { ...prev, battleCases: [...currentCases, newCaseObj] };
    });

    setNewCase({ stdin: "", expected_output: "", is_hidden: false });
  };

  const startBattle = () => {
    if (window.confirm("Start the Battle?")) socket.emit("start_battle", { battle_id });
  };

  const endBattle = () => {
    if (window.confirm("End the Battle?")) {
      socket.emit("end_battle", { battle_id });
      navigate("/");
    }
  };

  const handleKick = (userId) => {
    if (window.confirm("Kick this user?")) socket.emit("kick_battle_user", { battle_id, user_id_to_kick: userId });
  };

  const getMonitoredCode = () => {
    if (!selectedStudentId || !activeQId) return "// Select warrior and round";
    const userCodes = studentCodeMap.get(selectedStudentId);
    return userCodes ? userCodes[activeQId] || "// Not started yet" : "// No signal";
  };

  if (!battleState) return <div className="h-screen flex items-center justify-center bg-[#0D1117] text-white">Loading Arena...</div>;

  return (
    <div className="min-h-screen bg-[#0D1117] text-gray-300 p-6 flex flex-col gap-6 font-sans">
      {/* HEADER */}
      <div className="bg-[#161B22] p-4 rounded-xl border border-gray-800 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Swords className="text-red-500" /> Battle Commander <span className="text-gray-600 text-lg font-mono">#{battle_id.slice(0, 6)}</span>
          </h1>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className={`px-2 py-0.5 rounded ${battleState.status === "LIVE" ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-blue-500/20 text-blue-400"}`}>{battleState.status}</span>
            <span className="text-gray-500 flex items-center gap-1"><Timer size={12} /> Duration: {battleState.duration}m</span>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-gray-800 p-1 rounded-lg flex">
            <button onClick={() => setViewMode("manage")} className={`px-4 py-1.5 rounded-md text-sm ${viewMode === "manage" ? "bg-blue-600 text-white" : "text-gray-400"}`}>Arena Setup</button>
            <button onClick={() => setViewMode("monitor")} className={`px-4 py-1.5 rounded-md text-sm ${viewMode === "monitor" ? "bg-blue-600 text-white" : "text-gray-400"}`}>War Room</button>
          </div>
          {battleState.status === "DRAFT" && <button onClick={startBattle} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold">Start Battle</button>}
          {battleState.status === "LIVE" && <button onClick={endBattle} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold">End Battle</button>}
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* ROUNDS */}
        <div className="w-1/5 bg-[#161B22] rounded-xl border border-gray-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-[#21262d] text-sm font-bold text-white">Battle Rounds</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {battleState.questions.map((q, idx) => (
              <button key={q.question_id} onClick={() => setActiveQId(q.question_id)} className={`w-full text-left p-3 rounded-lg text-sm ${activeQId === q.question_id ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "bg-gray-800/40"}`}>
                <span className="font-mono text-xs opacity-50 block">Round {idx + 1}</span>
                <div className="truncate font-medium">{q.title}</div>
              </button>
            ))}
          </div>
        </div>

        {/* MAIN */}
        <div className="flex-1 flex flex-col min-w-0">
          {viewMode === "manage" ? (
            <div className="h-full flex flex-col gap-4 overflow-y-auto">
              {battleState.status === "DRAFT" && (
                <div className="bg-[#161B22] p-6 rounded-xl border border-gray-800">
                  <h3 className="text-md font-bold text-white mb-4">Add Round</h3>
                  <div className="space-y-3">
                    <input className="w-full bg-[#0D1117] border border-gray-700 rounded p-2 text-sm text-white" placeholder="Round Title" value={newQ.title} onChange={(e) => setNewQ({ ...newQ, title: e.target.value })} />
                    <textarea className="w-full bg-[#0D1117] border border-gray-700 rounded p-2 text-sm h-20 text-white" placeholder="Description" value={newQ.description} onChange={(e) => setNewQ({ ...newQ, description: e.target.value })} />
                    <div className="flex justify-end"><button onClick={handleAddQuestion} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold">Add Round</button></div>
                  </div>
                </div>
              )}

              {activeQId ? (
                <div className="bg-[#161B22] p-6 rounded-xl border border-gray-800 flex-1 flex flex-col">
                  <h3 className="text-md font-bold text-white mb-4">Test Cases (Round {battleState.questions.findIndex((q) => q.question_id === activeQId) + 1})</h3>
                  <div className="space-y-2 mb-4 flex-1 overflow-y-auto">
                    {battleState.battleCases.filter((tc) => (tc.battle_question_id || tc.question_id) === activeQId).map((tc, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-800/30 p-2 px-4 rounded border border-gray-700/50">
                        <div className="flex gap-4 text-xs font-mono text-gray-400"><span>In: {tc.stdin.slice(0, 10)}</span><span>Out: {tc.expected_output.slice(0, 10)}</span></div>
                        <div className={`text-[10px] px-2 py-0.5 rounded ${tc.is_hidden ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>{tc.is_hidden ? "HIDDEN" : "VISIBLE"}</div>
                      </div>
                    ))}
                  </div>
                  {battleState.status === "DRAFT" && (
                    <div className="border-t border-gray-700 pt-4">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <textarea className="bg-[#0D1117] border border-gray-700 rounded p-2 text-xs h-16 text-gray-300" placeholder="Input" value={newCase.stdin} onChange={(e) => setNewCase({ ...newCase, stdin: e.target.value })} />
                        <textarea className="bg-[#0D1117] border border-gray-700 rounded p-2 text-xs h-16 text-gray-300" placeholder="Expected" value={newCase.expected_output} onChange={(e) => setNewCase({ ...newCase, expected_output: e.target.value })} />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className="text-sm text-gray-400"><input type="checkbox" checked={newCase.is_hidden} onChange={(e) => setNewCase({ ...newCase, is_hidden: e.target.checked })} /> Hidden Case?</label>
                        <button onClick={handleAddTestCase} className="px-4 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium">Save Case</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : <div className="text-center text-gray-600 mt-20">Select a round</div>}
            </div>
          ) : (
            <div className="h-full bg-[#161B22] rounded-xl border border-gray-800 flex flex-col overflow-hidden">
               <div className="p-2 bg-[#21262d] border-b border-gray-800 text-xs px-4">Spying on: {participants.find((p) => p.id === selectedStudentId)?.name || "Nobody"}</div>
               <div className="flex-1 relative">{selectedStudentId ? <CodeEditor value={getMonitoredCode()} language="javascript" readOnly={true} /> : <div className="h-full flex flex-col items-center justify-center opacity-20"><Eye size={48} /><p>Select warrior to inspect</p></div>}</div>
            </div>
          )}
        </div>

        {/* LEADERBOARD */}
        <div className="w-1/4 bg-[#161B22] rounded-xl border border-gray-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-[#21262d] flex justify-between text-white font-bold text-sm"><span>Leaderboard</span><span>{participants.length}</span></div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-800/50 text-gray-500 uppercase"><tr><th className="px-4 py-2 text-left">Warrior</th><th className="px-4 py-2 text-right">Score</th></tr></thead>
              <tbody className="divide-y divide-gray-800">
                {participants.map((p) => (
                  <tr key={p.id} onClick={() => setSelectedStudentId(p.id)} className={`cursor-pointer ${selectedStudentId === p.id ? "bg-blue-900/20" : "hover:bg-gray-800"}`}>
                    <td className="px-4 py-3 text-gray-200">{p.name}<button onClick={(e) => { e.stopPropagation(); handleKick(p.id); }} className="block text-red-400 text-[10px] hover:underline">Kick</button></td>
                    <td className="px-4 py-3 text-right font-bold text-yellow-400">{p.score}</td>
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