import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import CodeEditor from "./CodeEditor";
import { Clock, AlertTriangle, Trophy, Zap, CheckCircle } from "lucide-react";

const JoineeBattleView = () => {
  const { session_id } = useParams();
  const battle_id = session_id;
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();

  // Core State
  const [battleData, setBattleData] = useState(null);
  const [activeQIndex, setActiveQIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [participants, setParticipants] = useState([]);

  // Code State
  const [currentCode, setCurrentCode] = useState("");
  const [currentLang, setCurrentLang] = useState("javascript");

  // UI State
  const [notification, setNotification] = useState(null); // { msg, type }

  // --- SOCKET LOGIC ---
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log("🛡️ Joining Battle:", battle_id);
    socket.emit("join_battle", { battle_id });

    const handleState = (state) => {
      console.log("Joinee State:", state);
      setBattleData(state);

      // Sync Timer
      if (state.timeLeft > 0) {
        setTimer((prev) =>
          Math.abs(prev - state.timeLeft) > 2 ? state.timeLeft : prev
        );
      }

      // Sync Users
      if (state.users) {
        setParticipants(
          state.users
            .filter((u) => u.role !== "host")
            .map((u) => ({ ...u, score: u.score || 0 }))
        );
      }

      // Sync Code (if returning)
      if (state.questions && state.questions.length > 0) {
        const qId = state.questions[0].battle_question_id;
        const saved = state.savedCode
          ? state.savedCode.find((s) => s.battle_question_id === qId)
          : null;
        if (saved) {
          setCurrentCode(saved.code);
          setCurrentLang(saved.language);
        }
      }
    };

    const handleStart = ({ duration }) => {
      setTimer(duration);
      setBattleData((prev) => (prev ? { ...prev, status: "LIVE" } : prev));
      showNotification("⚔️ BATTLE STARTED! GO GO GO!", "success");
    };

    // --- THE RACE MECHANIC ---
    const handleMoveToNext = () => {
      showNotification(
        "🚀 Someone solved it! Advancing to next round!",
        "warning"
      );

      // Force move to next question
      setActiveQIndex((prev) => {
        const nextIdx = prev + 1;
        // Reset code for the new question
        setCurrentCode("// New Round - Start Fresh!");
        return nextIdx;
      });
    };

    const handleScoreUpdate = ({ userId, score }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, score: score } : p))
      );
    };

    socket.on("battle_state", handleState);
    socket.on("battle_started", handleStart);
    socket.on("move_to_next_question", handleMoveToNext); // <--- LISTENING FOR RACE EVENT
    socket.on("battle_participant_score_update", handleScoreUpdate);
    socket.on("battle_ended", () => {
      alert("Battle Ended!");
      navigate("/");
    });
    socket.on("kicked", () => {
      alert("You have been kicked.");
      navigate("/");
    });

    return () => {
      socket.off("battle_state", handleState);
      socket.off("battle_started", handleStart);
      socket.off("move_to_next_question", handleMoveToNext);
      socket.off("battle_participant_score_update", handleScoreUpdate);
      socket.off("battle_ended");
      socket.off("kicked");
    };
  }, [socket, isConnected, battle_id]);

  // --- TIMER ---
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          socket.emit("submit_battle", { battle_id });
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // --- LOGIC ---
  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const showNotification = (msg, type) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCodeUpdate = (val) => {
    setCurrentCode(val);
    if (socket && battleData?.questions[activeQIndex]) {
      // Auto-save debounced handled in Editor, but we send specific emits here if needed
      console.log(battleData);

      socket.emit("save_battle_code", {
        battle_id,
        battle_question_id:
          battleData.questions[activeQIndex].battle_question_id,
        code: val,
        language: currentLang,
      });
    }
  };

  const handleLocalScoreUpdate = (score) => {
    // 1. Broadcast score
    socket.emit("battle_score_update", { battle_id, score });

    // 2. CHECK WIN CONDITION (RACE)
    // Assuming 100 is the max score for "Accepted"
    if (score === 100) {
      const currentQ = battleData.questions[activeQIndex];
      if (currentQ) {
        socket.emit("solved_question_first", {
          battle_id,
          user_id: socket.user?.user_id, // Ensure user info is available
          battle_question_id: currentQ.battle_question_id,
        });
        showNotification("🎉 You solved it! Waiting for server...", "success");
        setActiveQIndex((prev) => {
          const nextIdx = prev + 1;
          // Reset code for the new question
          setCurrentCode("// New Round - Start Fresh!");
          return nextIdx;
        });
      }
    }
  };

  // --- MEMOIZED TEST CASES ---
  const activeQ = battleData?.questions[activeQIndex];
  const currentQuestionTestCases = useMemo(() => {
    if (!battleData || !activeQ) return [];
    return battleData.battleCases
      .filter((tc) => tc.battle_question_id === activeQ.battle_question_id)
      .map((tc) => ({
        id: tc.case_id,
        input: tc.stdin,
        expected: tc.expected_output,
        is_hidden: tc.is_hidden,
      }));
  }, [battleData, activeQ]);

  // --- RENDER ---
  if (!battleData)
    return (
      <div className="h-screen flex items-center justify-center bg-[#0D1117] text-white">
        Connecting to Battlefield...
      </div>
    );

  if (battleData.status === "DRAFT")
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0D1117] text-white gap-6">
        <Zap size={64} className="text-yellow-500 animate-pulse" />
        <h1 className="text-4xl font-bold tracking-tighter">
          PREPARE FOR BATTLE
        </h1>
        <p className="text-gray-400">Waiting for Host to start the timer...</p>
        <div className="bg-[#161B22] p-4 rounded-lg border border-gray-800">
          <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">
            Lobby ({participants.length})
          </h3>
          <div className="flex gap-2 flex-wrap justify-center max-w-md">
            {participants.map((p) => (
              <span
                key={p.id}
                className="bg-gray-800 px-2 py-1 rounded text-xs text-blue-300 border border-blue-900/30"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    );

  // If game over (ran out of questions)
  if (activeQIndex >= battleData.questions.length) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0D1117] text-white gap-6">
        <Trophy size={80} className="text-yellow-400" />
        <h1 className="text-3xl font-bold">ALL ROUNDS COMPLETE</h1>
        <p>Waiting for final results...</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 bg-blue-600 rounded"
        >
          Exit Arena
        </button>
      </div>
    );
  }

  const sortedParticipants = [...participants].sort(
    (a, b) => (b.score || 0) - (a.score || 0)
  );

  return (
    <div className="h-screen bg-[#0D1117] text-gray-300 flex flex-col overflow-hidden font-sans">
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div
          className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-2xl border flex items-center gap-3 animate-bounce
                    ${
                      notification.type === "success"
                        ? "bg-green-600 border-green-400 text-white"
                        : "bg-yellow-600 border-yellow-400 text-white"
                    }`}
        >
          {notification.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <Zap size={20} />
          )}
          <span className="font-bold">{notification.msg}</span>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-[#161B22] border-b border-gray-800 p-3 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {battleData.questions.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 w-8 rounded-full ${
                  idx === activeQIndex
                    ? "bg-blue-500 shadow-lg shadow-blue-500/50"
                    : idx < activeQIndex
                    ? "bg-green-500"
                    : "bg-gray-700"
                }`}
              />
            ))}
          </div>
          <span className="font-bold text-white text-sm">
            Round {activeQIndex + 1}/{battleData.questions.length}
          </span>
        </div>

        <div className="text-2xl font-mono font-bold text-red-500 flex items-center gap-2">
          <Clock size={20} className="animate-pulse" /> {formatTime(timer)}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Opponents: {participants.length - 1}
          </span>
          <button
            onClick={() => {
              if (window.confirm("Surrender?")) navigate("/");
            }}
            className="bg-red-900/30 hover:bg-red-900/50 text-red-400 px-3 py-1 rounded text-xs border border-red-800/50"
          >
            Surrender
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: PROBLEM DESC */}
        <div className="w-1/4 bg-[#0D1117] border-r border-gray-800 flex flex-col">
          <div className="p-6 overflow-y-auto flex-1">
            <h2 className="text-2xl font-bold text-white mb-4">
              {activeQ.title}
            </h2>
            <div className="prose prose-invert mb-6 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
              {activeQ.description}
            </div>
            {activeQ.example && (
              <div className="mt-4">
                <span className="text-xs font-bold text-gray-500 uppercase">
                  Example
                </span>
                <pre className="bg-[#161B22] border border-gray-700 p-3 rounded text-xs text-gray-300 whitespace-pre-wrap font-mono mt-1">
                  {activeQ.example}
                </pre>
              </div>
            )}
          </div>

          {/* MINI LEADERBOARD */}
          <div className="h-1/3 border-t border-gray-800 bg-[#161B22] flex flex-col">
            <div className="p-2 bg-[#21262d] text-xs font-bold text-white flex items-center gap-2">
              <Trophy size={12} className="text-yellow-400" /> Live Ranks
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sortedParticipants.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex justify-between items-center text-xs p-1.5 rounded ${
                    socket.user?.user_id === p.id
                      ? "bg-blue-900/30 border border-blue-800"
                      : "text-gray-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono w-4">{idx + 1}.</span>
                    <span
                      className={
                        socket.user?.user_id === p.id
                          ? "text-blue-300 font-bold"
                          : ""
                      }
                    >
                      {p.name} {socket.user?.user_id === p.id && "(You)"}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-yellow-500">
                    {p.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: EDITOR */}
        <div className="flex-1 min-w-0 flex flex-col">
          <CodeEditor
            key={activeQ.battle_question_id} // Force remount on question change to clear state if needed
            value={currentCode}
            language={currentLang}
            questionId={activeQ.battle_question_id}
            onChange={handleCodeUpdate}
            onLanguageChange={setCurrentLang}
            initialTestCases={currentQuestionTestCases}
            onScoreUpdate={handleLocalScoreUpdate} // <--- HOOKED UP TO RACE LOGIC
            isBattle:true
          />
        </div>
      </div>
    </div>
  );
};

export default JoineeBattleView;
