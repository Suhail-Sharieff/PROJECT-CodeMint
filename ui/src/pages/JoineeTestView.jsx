import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import CodeEditor from './CodeEditor';
import { Clock, AlertCircle } from 'lucide-react';

const JoineeTestView = () => {
    const { test_id } = useParams();
    const { socket, isConnected } = useSocket();
    const navigate = useNavigate();
    
    const [testData, setTestData] = useState(null);
    const [activeQIndex, setActiveQIndex] = useState(0);
    const [timer, setTimer] = useState(0);
    const [error, setError] = useState(null); // Added Error State

    // Local state for code
    const [currentCode, setCurrentCode] = useState('');
    const [currentLang, setCurrentLang] = useState('javascript');
    // --- TIMER LOGIC ---
    useEffect(() => {
        if (timer <= 0) return;

        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    
                    // --- AUTO NAVIGATE LOGIC ---
                    alert("Time is up! The test has ended.");
                    
                    // Ideally, we also tell the backend the user finished
                    if (socket) socket.emit('submit_test', { test_id });
                    
                    navigate('/'); 
                    // ---------------------------
                    
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timer > 0, navigate, socket, test_id]); // Added dependencies for safety
    // --- SOCKET LOGIC ---
    useEffect(() => {
        // Wait for valid socket connection
        if (!socket || !isConnected) return;

        console.log("🔌 Connected. Joining test:", test_id);
        setError(null);

        // Define Handlers
        const handleTestState = (state) => {
            console.log("✅ Joinee State Received:", state);
            setTestData(state);
            
            // Set Timer
            if (state.timeLeft && state.timeLeft > 0) {
                setTimer(prev => {
                    // Only update if diff > 2s to prevent jitter
                    if (Math.abs(prev - state.timeLeft) > 2) return state.timeLeft;
                    return prev;
                });
            }

            // Restore Saved Code
            if (state.questions && state.questions.length > 0) {
                // Default to first question if index 0
                const qId = state.questions[0].question_id;
                const saved = state.savedCode ? state.savedCode.find(s => s.question_id === qId) : null;
                if (saved) {
                    setCurrentCode(saved.code);
                    setCurrentLang(saved.language);
                }
            }
        };

        const handleTestStarted = ({ duration }) => {
            setTimer(duration);
            setTestData(prev => (prev ? { ...prev, status: 'LIVE' } : prev));
        };

        const handleTestEnded = ({ test_id: endedId } = {}) => {
            try { alert('The host has ended the test.'); } catch (e) {}
            // Clean up socket listeners and go home
            try {
                if (socket) {
                    socket.off('test_state');
                    socket.off('test_started');
                    socket.off('kicked');
                    socket.off('test_submitted');
                    socket.off('error');
                    socket.off('test_ended');
                    socket.disconnect();
                }
            } catch (e) {
                console.warn('Cleanup error after test end:', e);
            }
            navigate('/');
        };

        const handleKicked = () => {
            alert('You have been removed from the session by the host.');
            navigate('/');
        };

        const handleSubmitted = () => {
            alert("Test Submitted Successfully!");
            navigate('/');
        };

        const handleError = (err) => {
            console.error("Socket Error:", err);
            const message = (err && (err.message || err.msg)) || String(err) || "Unknown error";

            // Show the error to the user, then clean up socket and navigate home to avoid repeated alerts
            try { alert(message); } catch (e) { /* ignore if alert blocked */ }

            setError(message);

            // Defensive cleanup: remove listeners and disconnect so we don't keep receiving the same error
            try {
                if (socket) {
                    socket.off('test_state');
                    socket.off('test_started');
                    socket.off('kicked');
                    socket.off('test_submitted');
                    socket.off('error');
                    socket.disconnect();
                }
            } catch (cleanupErr) {
                console.warn('Error during socket cleanup:', cleanupErr);
            }

            // Navigate home after cleanup
            navigate('/');
        };

        // Attach Listeners
        socket.on('test_state', handleTestState);
        socket.on('test_started', handleTestStarted);
        socket.on('test_ended', handleTestEnded);
        socket.on('kicked', handleKicked);
        socket.on('test_submitted', handleSubmitted);
        socket.on('error', handleError);

        // Emit Join Event
        socket.emit('join_test', { test_id });

        // Cleanup
        return () => {
            socket.off('test_state', handleTestState);
            socket.off('test_started', handleTestStarted);
            socket.off('test_ended', handleTestEnded);
            socket.off('kicked', handleKicked);
            socket.off('test_submitted', handleSubmitted);
            socket.off('error', handleError);
        };
    }, [socket, isConnected, test_id, navigate]);

    // --- TIMER LOGIC ---
    useEffect(() => {
        if (timer <= 0) return;

        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Optional: Auto-submit when time runs out
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timer > 0]); // Runs when timer starts/stops

    // --- HELPERS ---
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleCodeUpdate = (newVal) => {
        setCurrentCode(newVal);
        // Debounced save logic
        if (socket && testData?.questions && testData.questions[activeQIndex]) {
            socket.emit('save_code', {
                test_id,
                question_id: testData.questions[activeQIndex].question_id,
                code: newVal,
                language: currentLang
            });
        }
    };

    const handleSubmitTest = () => {
        if (window.confirm("Are you sure you want to submit? You cannot change answers after this.")) {
            socket.emit('submit_test', { test_id });
        }
    };

    const switchQuestion = (index) => {
        setActiveQIndex(index);
        if (testData && testData.questions && testData.questions[index]) {
            const qId = testData.questions[index].question_id;
            const saved = testData.savedCode ? testData.savedCode.find(s => s.question_id === qId) : null;
            setCurrentCode(saved ? saved.code : '');
            setCurrentLang(saved ? saved.language : 'javascript');
        }
    };

    // --- RENDER ---

    // Error View
    if (error) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#0D1117] text-white">
            <div className="p-6 bg-red-900/20 border border-red-500/50 rounded-lg max-w-md text-center">
                <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
                <p className="text-gray-300 mb-4">{error}</p>
                <button onClick={() => navigate('/')} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Go Home</button>
            </div>
        </div>
    );

    // Loading View
    if (!isConnected) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#0D1117] text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p>Connecting to Server...</p>
        </div>
    );

    if (!testData) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#0D1117] text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
            <p>Loading Exam Data...If loadin persists for long, pls refresh the page again...</p>
        </div>
    );

    // Waiting Room View
    if (testData.status === 'DRAFT') {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-[#0D1117] text-white gap-4">
                <h1 className="text-3xl font-bold">Waiting for Host to Start...</h1>
                <p className="text-gray-400">The exam has not started yet. Please stay on this page.</p>
                <div className="mt-4 flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-lg">
                    <AlertCircle size={20} /> Status: {testData.status}
                </div>
            </div>
        );
    }

    // Main Exam View
    const activeQ = testData.questions[activeQIndex];
    const currentQuestionTestCases = testData.testCases
        .filter(tc => tc.question_id === activeQ.question_id)
        .map(tc => ({ id: tc.case_id, input: tc.stdin, expected: tc.expected_output, is_hidden:tc.is_hidden }));

    return (
        <div className="h-screen bg-[#0D1117] text-gray-300 flex flex-col overflow-hidden font-sans">
            <header className="bg-[#161B22] border-b border-gray-800 p-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-white">Online Assessment</h1>
                    <div className="flex gap-1">
                        {testData.questions.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => switchQuestion(idx)}
                                className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-colors ${activeQIndex === idx ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xl font-bold ${timer < 300 ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-emerald-400'}`}>
                    <Clock size={20} /> {formatTime(timer)}
                </div>
                <button
                    onClick={handleSubmitTest}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold text-sm"
                >
                    Finish Test
                </button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-1/3 bg-[#0D1117] border-r border-gray-800 p-6 overflow-y-auto custom-scrollbar">
                    <h2 className="text-2xl font-bold text-white mb-4">{activeQ.title}</h2>
                    <div className="prose prose-invert max-w-none mb-6 text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {activeQ.description}
                    </div>
                    {activeQ.example && (
                        <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4 mb-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Example</h3>
                            <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap">{activeQ.example}</pre>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                    <CodeEditor
                        value={currentCode}
                        language={currentLang}
                        questionId={activeQ.question_id}
                        onChange={handleCodeUpdate}
                        onLanguageChange={(l) => setCurrentLang(l)}
                        initialTestCases={currentQuestionTestCases}
                        readOnly={false} 
                    />
                </div>
            </div>
        </div>
    );
};

export default JoineeTestView;