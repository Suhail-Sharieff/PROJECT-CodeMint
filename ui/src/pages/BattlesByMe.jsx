import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Swords, Calendar, Clock, ChevronRight, 
  Loader2, AlertCircle, Play, BarChart2, Zap 
} from 'lucide-react';

const BattlesByMe = () => {
  const navigate = useNavigate();
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBattles = async () => {
      try {
        setLoading(true);
        const response = await api.get('/battle/getBattlesByMe');
        if (response.data) {
          // Assuming response.data is the array directly based on your snippet
          setBattles(response.data);
        }
      } catch (err) {
        console.error("Error fetching battles:", err);
        setError("Failed to load your battles.");
      } finally {
        setLoading(false);
      }
    };

    fetchBattles();
  }, []);

  const getStatusUI = (status) => {
    switch (status) {
      case 'LIVE': 
        return { 
          color: 'text-emerald-400', 
          bg: 'bg-emerald-400/10', 
          border: 'border-emerald-400/20',
          icon: <Zap size={12} className="animate-pulse" />
        };
      case 'ENDED': 
        return { 
          color: 'text-red-400', 
          bg: 'bg-red-400/10', 
          border: 'border-red-400/20',
          icon: <BarChart2 size={12} />
        };
      default: 
        return { 
          color: 'text-yellow-400', 
          bg: 'bg-yellow-400/10', 
          border: 'border-yellow-400/20',
          icon: <Clock size={12} />
        };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const handleNavigate = (battle) => {
    if (battle.status === 'ENDED') {
      navigate(`/battle-details/${battle.battle_id}`);
    } else {
      navigate(`/hostBattleView/${battle.battle_id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-gray-300 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tight">
              <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                <Swords className="text-red-500" size={32} />
              </div>
              MY BATTLES
            </h1>
            <p className="text-gray-500 mt-2 text-lg">Your history of hosted rapid coding wars.</p>
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
            <Loader2 className="w-12 h-12 animate-spin text-red-500" />
            <p className="text-gray-500 font-medium animate-pulse">Scanning Battle Arenas...</p>
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
            <h3 className="text-2xl font-bold text-white mb-2">The Arena is Quiet</h3>
            <p className="text-gray-500 max-w-sm mx-auto">You haven't initiated any rapid battles yet. Start your first coding war from the dashboard!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {battles.map((battle) => {
              const ui = getStatusUI(battle.status);
              return (
                <div 
                  key={battle.battle_id}
                  onClick={() => handleNavigate(battle)}
                  className="group relative bg-[#161B22] border border-gray-800 rounded-2xl p-6 hover:border-red-500/40 hover:bg-[#1c2128] transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-xl"
                >
                  {/* Top Row: Status & Icon */}
                  <div className="flex justify-between items-start mb-6">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${ui.bg} ${ui.color} ${ui.border}`}>
                      {ui.icon}
                      {battle.status}
                    </div>
                    <div className="p-2 bg-[#0D1117] rounded-lg group-hover:bg-red-500/10 transition-colors">
                      {battle.status === 'ENDED' ? 
                        <BarChart2 size={18} className="text-gray-500 group-hover:text-blue-400" /> : 
                        <Play size={18} className="text-gray-500 group-hover:text-emerald-400" />
                      }
                    </div>
                  </div>

                  {/* Middle Row: Title */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2 leading-tight">
                      {battle.title || "Untitled Battle"}
                    </h3>
                    <p className="text-gray-500 text-xs mt-2 font-mono truncate">
                      ID: {battle.battle_id.slice(0, 18)}...
                    </p>
                  </div>

                  {/* Bottom Row: Metadata */}
                  <div className="pt-6 border-t border-gray-800/50 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-gray-500">
                        <Calendar size={14} className="text-gray-600" />
                        {formatDate(battle.created_at)}
                      </span>
                      <span className="flex items-center gap-2 text-gray-400 font-bold">
                        <Clock size={14} className="text-red-500/50" />
                        {battle.duration}m
                      </span>
                    </div>

                    <button className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-[#0D1117] hover:bg-red-600 hover:text-white border border-gray-700 hover:border-red-500 rounded-xl text-sm font-bold transition-all duration-300">
                      {battle.status === 'ENDED' ? 'View Analysis' : 'Enter Host Room'}
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Corner Accent */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-tr-2xl"></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BattlesByMe;