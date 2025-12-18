import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Swords, Calendar, Clock, ChevronRight, X,
  Loader2, AlertCircle, Trophy, Code, FileText, CheckCircle, XCircle 
} from 'lucide-react';

const BattlesAttendedByMe = () => {
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal State
  const [selectedBattle, setSelectedBattle] = useState(null);

  useEffect(() => {
    const fetchBattles = async () => {
      try {
        setLoading(true);
        const response = await api.get('/battle/getBattlesAttendedByMe');
        if (response.data && response.data.success) {
          setBattles(response.data.data);
        }
      } catch (err) {
        console.error("Error fetching attended battles:", err);
        setError("Failed to load your battle history.");
      } finally {
        setLoading(false);
      }
    };

    fetchBattles();
  }, []);

  // --- Helpers ---

  const getStatusUI = () => ({ 
      color: 'text-blue-400', 
      bg: 'bg-blue-400/10', 
      border: 'border-blue-400/20',
      icon: <Swords size={12} />
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-[#0D1117] text-gray-300 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tight">
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Trophy className="text-blue-500" size={32} />
              </div>
              BATTLES ATTENDED
            </h1>
            <p className="text-gray-500 mt-2 text-lg">Your combat history and performance.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-[#161B22] p-1 rounded-xl border border-gray-800">
             <div className="px-4 py-2 text-sm font-bold text-gray-400">
                Total: {battles.length}
             </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-80 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-gray-500 font-medium animate-pulse">Loading Battle History...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-80 text-red-400 bg-red-900/5 border border-red-900/20 rounded-2xl">
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-bold">{error}</p>
          </div>
        ) : battles.length === 0 ? (
          <div className="text-center py-32 bg-[#161B22]/50 rounded-3xl border-2 border-dashed border-gray-800">
            <div className="inline-block p-6 bg-gray-800/50 rounded-full mb-6">
              <Swords className="w-16 h-16 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No Battles Yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto">You haven't participated in any battles. Join a battle to start your journey!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {battles.map((battle) => {
              const ui = getStatusUI(); 
              return (
                <div 
                  key={battle.battle_id}
                  onClick={() => setSelectedBattle(battle)}
                  className="group relative bg-[#161B22] border border-gray-800 rounded-2xl p-6 hover:border-blue-500/40 hover:bg-[#1c2128] transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-xl"
                >
                  {/* Top Row */}
                  <div className="flex justify-between items-start mb-6">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${ui.bg} ${ui.color} ${ui.border}`}>
                      {ui.icon}
                      Ranked
                    </div>
                     <div className="flex flex-col items-end">
                        <span className="text-xs text-gray-500 uppercase font-bold">Score</span>
                        <span className="text-2xl font-black text-emerald-400">{battle.score}</span>
                     </div>
                  </div>

                  {/* Title */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-tight">
                      {battle.title || "Untitled Battle"}
                    </h3>
                    <p className="text-gray-500 text-xs mt-2 font-mono truncate">
                      ID: {battle.battle_id.slice(0, 18)}...
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="pt-6 border-t border-gray-800/50 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-gray-500">
                        <Calendar size={14} className="text-gray-600" />
                        {formatDate(battle.start_time)}
                      </span>
                      <span className="flex items-center gap-2 text-gray-400 font-bold">
                        <Clock size={14} className="text-blue-500/50" />
                        {battle.duration}m
                      </span>
                    </div>

                    <button className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-[#0D1117] hover:bg-blue-600 hover:text-white border border-gray-700 hover:border-blue-500 rounded-xl text-sm font-bold transition-all duration-300">
                      View Performance
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Corner Accent */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-tr-2xl"></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- DETAILS MODAL --- */}
      {selectedBattle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#161B22] border border-gray-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-700 flex justify-between items-start bg-[#0D1117]">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Trophy className="text-yellow-500" size={24}/>
                  {selectedBattle.title}
                </h2>
                <div className="flex gap-4 mt-2 text-sm text-gray-400">
                  <span>Total Score: <span className="text-emerald-400 font-bold">{selectedBattle.score}</span></span>
                  <span>Duration: {selectedBattle.duration}m</span>
                  <span>Date: {formatDate(selectedBattle.start_time)}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBattle(null)}
                className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {selectedBattle.submissions && selectedBattle.submissions.length > 0 ? (
                selectedBattle.submissions.map((sub, idx) => (
                  <div key={idx} className="bg-[#0D1117] border border-gray-800 rounded-xl overflow-hidden">
                    
                    {/* Question Header */}
                    <div className="p-4 bg-gray-800/30 border-b border-gray-800 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                         <div className={`p-1.5 rounded-lg ${sub.score_for_this_question === 100 ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                           {sub.score_for_this_question === 100 ? <CheckCircle size={18}/> : <XCircle size={18}/>}
                         </div>
                         <div>
                            <h3 className="text-lg font-bold text-white">
                              {sub.battle_question_title || `Question ${idx + 1}`}
                            </h3>
                            <span className="text-xs text-gray-500 font-mono">ID: {sub.battle_question_id}</span>
                         </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xl font-black ${sub.score_for_this_question > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>
                          {sub.score_for_this_question || 0}
                        </span>
                        <span className="text-xs text-gray-500 block uppercase">Points</span>
                      </div>
                    </div>

                    {/* Question Details */}
                    <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      
                      {/* Left: Description & Example */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                            <FileText size={12}/> Description
                          </h4>
                          <p className="text-sm text-gray-300 leading-relaxed bg-[#161B22] p-3 rounded-lg border border-gray-800">
                            {sub.battle_question_description || "No description provided."}
                          </p>
                        </div>
                        {sub.battle_question_example && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Example</h4>
                            <pre className="text-xs text-gray-400 bg-black/30 p-3 rounded-lg border border-gray-800 font-mono whitespace-pre-wrap">
                              {sub.battle_question_example}
                            </pre>
                          </div>
                        )}
                      </div>

                      {/* Right: Submitted Code */}
                      <div className="flex flex-col h-full">
                        <h4 className="text-xs font-bold text-blue-400 uppercase mb-2 flex items-center gap-2">
                          <Code size={12}/> Your Solution
                        </h4>
                        <div className="flex-1 bg-[#0a0c10] border border-gray-800 rounded-lg p-3 overflow-auto max-h-[300px] group relative">
                           {sub.code ? (
                             <pre className="text-xs font-mono text-gray-300 whitespace-pre">
                               {sub.code}
                             </pre>
                           ) : (
                             <div className="h-full flex flex-col items-center justify-center text-gray-600 italic text-sm">
                               No code submitted
                             </div>
                           )}
                        </div>
                      </div>

                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-gray-500">
                  <div className="inline-block p-4 bg-gray-800/50 rounded-full mb-4">
                    <FileText size={32} />
                  </div>
                  <p>No detailed submission data available for this battle.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-700 bg-[#0D1117] flex justify-end">
              <button 
                onClick={() => setSelectedBattle(null)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/20"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default BattlesAttendedByMe;