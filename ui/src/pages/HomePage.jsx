import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { Swords } from 'lucide-react'; // Added icon for Battle

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();

  // State for inputs
  const [joinSessionId, setJoinSessionId] = useState('');
  const [joinTestId, setJoinTestId] = useState('');
  const [joinBattleId, setJoinBattleId] = useState(''); // NEW: Battle State

  // --- SOCKET EVENT LISTENERS ---
  useEffect(() => {
    if (!socket) return;

    // 1. Handler for Live Coding Session
    const handleSessionCreated = (newSessionId) => {
      console.log('Session created with ID:', newSessionId);
      navigate(`/hostView/${newSessionId}`);
    };

    // 2. Handler for Test/Assessment
    const handleTestCreated = (newTestId) => {
      console.log('Test created with ID:', newTestId);
      navigate(`/hostTestView/${newTestId}`);
    };

    // 3. Handler for Battle (NEW)
    const handleBattleCreated = (newBattleId) => {
      console.log('Battle created:', newBattleId);
      navigate(`/hostBattleView/${newBattleId}`);
    };

    // Attach listeners
    socket.on('session_created', handleSessionCreated);
    socket.on('test_created', handleTestCreated);
    socket.on('battle_created', handleBattleCreated);

    // Cleanup listeners on unmount
    return () => {
      socket.off('session_created', handleSessionCreated);
      socket.off('test_created', handleTestCreated);
      socket.off('battle_created', handleBattleCreated);
    };
  }, [socket, navigate]);

  // --- HANDLERS ---

  // 1. Session Handlers
  const handleCreateSession = () => {
    if (!socket) {
        alert("Socket not connected. Please try again.");
        return;
    }
    socket.emit('create_session');
  };

  const handleJoinSession = async(e) => {
    e.preventDefault();
    if (joinSessionId.trim()) {
      try {
        const res = await api.get(`/session/getHostIdOf/${joinSessionId.trim()}`);
        const host_id = res.data.data;
        
        if (host_id !== user.user_id) {
          navigate(`/joinView/${joinSessionId.trim()}`);
        } else {
          navigate(`/hostView/${joinSessionId.trim()}`);
        }
      } catch (err) {
        console.error('Error joining session:', err);
        alert('Failed to join session. Please check the session ID and try again.');
      }
    }
  };

  // 2. Test Handlers
  const handleCreateTest = () => {
    if (!socket) return alert("Socket not connected.");
    
    const durationInput = prompt("Enter test duration in minutes:", "60");
    if (durationInput === null) return;

    const duration = parseInt(durationInput);
    if (isNaN(duration) || duration <= 0) return alert("Invalid duration");

    const title = prompt("Enter the title for your test:");
    if (title === null) return alert("Please enter title!");

    socket.emit('create_test', { duration, title });
  };

  const handleJoinTest = async(e) => {
    e.preventDefault();
    if (joinTestId.trim()) {
      try {
        const res = await api.get(`/test/getTestHostID/${joinTestId.trim()}`);
        const host_id = res.data; // Note: Check if backend returns .data or .data.data consistently
        
        if (host_id !== user.user_id) {
          navigate(`/joineeTestView/${joinTestId.trim()}`);
        } else {
          navigate(`/hostTestView/${joinTestId.trim()}`);
        }
      } catch (err) {
        console.error('Error joining test:', err);
        alert('Failed to join test. Please check the test ID and try again.');
      }
    }
  };

  // 3. Battle Handlers (NEW)
  const handleCreateBattle = () => {
    if (!socket) return alert("Socket not connected.");
    
    const durationInput = prompt("Enter Battle duration (minutes):", "30");
    if (durationInput === null) return;
    const duration = parseInt(durationInput);
    if (isNaN(duration) || duration <= 0) return alert("Invalid duration");

    const title = prompt("Enter Battle Title:", "Code War #1");
    if (!title) return alert("Title is required");

    socket.emit('create_battle', { duration, title });
  };

  const handleJoinBattle = async(e) => {
    e.preventDefault();
    if (!joinBattleId.trim()) return;
    
    try {
        const res = await api.get(`/battle/getBattleHostID/${joinBattleId.trim()}`);
        const host_id = res.data.data || res.data; 
        
        navigate(host_id !== user.user_id ? `/joineeBattleView/${joinBattleId}` : `/hostBattleView/${joinBattleId}`);
    } catch (err) {
        console.error("Join battle error", err);
        // Fallback or optimistic join if API fails/doesn't exist yet
        navigate(`/joineeBattleView/${joinBattleId}`);
    }
  };

  return (
    user ? (
      // --- LOGGED IN VIEW ---
      <div className="min-h-screen bg-[#0D1117] text-gray-300 p-4 md:p-10">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard Header */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">{user.name}</span>
            </h1>
            <p className="text-gray-500">What would you like to do today?</p>
          </div>

          {/* Quick Actions Bar */}
          <QuickActions/>
          {/* MAIN GRID - Changed to support 3 columns on large screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

            {/* COLUMN 1: COLLABORATION (Live Coding) */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </div>
                <h2 className="text-xl font-bold text-white">Live Collaboration</h2>
              </div>

              {/* Card: Create New Session */}
              <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-colors group">
                <h3 className="text-lg font-semibold text-white mb-2">New Session</h3>
                <p className="text-sm text-gray-500 mb-6">Start a new collaborative coding environment instantly.</p>
                <button
                  onClick={handleCreateSession}
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-[#0D1117] font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.1)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Create Instant Session
                </button>
              </div>

              {/* Card: Join Session */}
              <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-colors">
                <h3 className="text-lg font-semibold text-white mb-2">Join Session</h3>
                <p className="text-sm text-gray-500 mb-4">Enter a session ID to join an existing room.</p>
                <form onSubmit={handleJoinSession} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="e.g. room-abc-123"
                    value={joinSessionId}
                    onChange={(e) => setJoinSessionId(e.target.value)}
                    className="flex-1 bg-[#0D1117] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-6 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl border border-gray-700 transition-all"
                  >
                    Join
                  </button>
                </form>
              </div>
            </div>

            {/* COLUMN 2: ASSESSMENTS (Tests) */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-white">Assessments</h2>
              </div>

              {/* Card: Conduct Test */}
              <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-6 hover:border-blue-500/30 transition-colors group">
                <h3 className="text-lg font-semibold text-white mb-2">Conduct Test</h3>
                <p className="text-sm text-gray-500 mb-6">Set up a technical interview or automated test environment.</p>
                <button
                  onClick={handleCreateTest}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.1)] group-hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  Create New Test
                </button>
              </div>

              {/* Card: Join Test */}
              <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-6 hover:border-blue-500/30 transition-colors">
                <h3 className="text-lg font-semibold text-white mb-2">Take Test</h3>
                <p className="text-sm text-gray-500 mb-4">Enter the Test ID provided by your interviewer.</p>
                <form onSubmit={handleJoinTest} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="e.g. test-xyz-789"
                    value={joinTestId}
                    onChange={(e) => setJoinTestId(e.target.value)}
                    className="flex-1 bg-[#0D1117] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-6 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl border border-gray-700 transition-all"
                  >
                    Start
                  </button>
                </form>
              </div>
            </div>

            {/* COLUMN 3: BATTLE ARENA (NEW) */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-white">Battle Arena</h2>
              </div>

              {/* Card: Host Battle */}
              <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-6 hover:border-red-500/30 transition-colors group">
                <h3 className="text-lg font-semibold text-white mb-2">Competitive Coding</h3>
                <p className="text-sm text-gray-500 mb-6">Race against others. First to solve 100% test cases wins.</p>
                <button
                  onClick={handleCreateBattle}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.1)] group-hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2"
                >
                  <Swords size={20} />
                  Host Battle
                </button>
              </div>

              {/* Card: Join Battle */}
              <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-6 hover:border-red-500/30 transition-colors">
                <h3 className="text-lg font-semibold text-white mb-2">Enter Arena</h3>
                <p className="text-sm text-gray-500 mb-4">Enter a Battle ID to compete.</p>
                <form onSubmit={handleJoinBattle} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="e.g. battle-001"
                    value={joinBattleId}
                    onChange={(e) => setJoinBattleId(e.target.value)}
                    className="flex-1 bg-[#0D1117] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-6 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl border border-gray-700 transition-all hover:text-red-400"
                  >
                    Fight
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </div>
    ) : (
      // --- GUEST VIEW (Landing Page) ---
      <div className="flex flex-col">
        <section className="relative pt-20 pb-32 overflow-hidden">
          {/* Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl -z-10 opacity-30"></div>
          <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-600/10 rounded-full blur-3xl -z-10 opacity-20"></div>

          <div className="max-w-7xl mx-auto px-6 text-center z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              v2.0 is now live
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight">
              Code together,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                in real-time.
              </span>
            </h1>

            <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              The lightweight, browser-based IDE for technical interviews and remote pair programming.
              Zero setup. minimal latency.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0D1117] text-lg font-bold transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:scale-105"
              >
                Start Coding Free
              </Link>
              <Link
                to="/demo"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-lg font-medium border border-gray-700 transition-all hover:scale-105"
              >
                Live Demo
              </Link>
            </div>

            {/* Mockup Image */}
            <div className="mt-20 relative mx-auto max-w-5xl">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl blur opacity-20"></div>
              <div className="relative bg-[#0D1117] rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
                <div className="h-8 bg-[#161B22] border-b border-gray-800 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
                <div className="p-6 font-mono text-sm text-left overflow-hidden">
                  <div className="text-gray-400"><span className="text-purple-400">const</span> <span className="text-blue-400">codeMint</span> = <span className="text-emerald-400">"Future of Coding"</span>;</div>
                  <div className="text-gray-400 mt-2"><span className="text-purple-400">function</span> <span className="text-yellow-200">sync</span>() {'{'}</div>
                  <div className="text-gray-400 ml-4">socket.<span className="text-blue-400">emit</span>(<span className="text-emerald-400">'join'</span>, user);</div>
                  <div className="text-gray-400 ml-4"><span className="text-gray-500">// Latency: 12ms</span></div>
                  <div className="text-gray-400">{'}'}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="py-24 bg-[#0D1117] relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Real-time Sync",
                  desc: "Operational transformation ensures code stays consistent even on shaky connections.",
                  icon: <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                },
                {
                  title: "Integrated Chat",
                  desc: "Discuss solutions without context switching. Built-in voice and text channels.",
                  icon: <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                },
                {
                  title: "Multi-language",
                  desc: "Support for Python, JavaScript, C++, and Java with intelligent syntax highlighting.",
                  icon: <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                }
              ].map((feature, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-[#161B22] border border-gray-800 hover:border-gray-700 transition-all group">
                  <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  );
};
import { FileCode, Trophy, Award, ChevronRight } from 'lucide-react';

const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Tests Conducted",
      subtitle: "Manage your assessments",
      path: "/testsByMe",
      icon: <FileCode size={24} />,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "hover:border-blue-500/50"
    },
    {
      title: "Battles Conducted",
      subtitle: "Host coding wars",
      path: "/battlesByMe",
      icon: <Swords size={24} />,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "hover:border-red-500/50"
    },
    {
      title: "Tests Attended",
      subtitle: "View your results",
      path: "/testsAttendedByMe",
      icon: <Award size={24} />,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
      border: "hover:border-purple-500/50"
    },
    {
      title: "Battles Attended",
      subtitle: "Combat history",
      path: "/battlesAttendedByMe",
      icon: <Trophy size={24} />,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "hover:border-yellow-500/50"
    }
  ];

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4 px-1">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => navigate(item.path)}
            className={`group flex items-center justify-between p-4 rounded-xl bg-[#161B22] border border-gray-800 transition-all duration-300 hover:bg-[#1c2128] hover:-translate-y-1 hover:shadow-lg ${item.border}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${item.bg} ${item.color}`}>
                {item.icon}
              </div>
              <div className="text-left">
                <div className="font-bold text-gray-200 group-hover:text-white transition-colors">
                  {item.title}
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {item.subtitle}
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomePage;