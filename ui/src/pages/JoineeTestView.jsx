import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import CodeEditor from './CodeEditor';
import { Clock, AlertCircle } from 'lucide-react';

const JoineeTestView = () => {
    const { test_id } = useParams();
    const { socket, isConnected } = useSocket();
    
    // FIX 1: Correct usage of useNavigate (was const [navigate] = ...)
    const navigate = useNavigate(); 
    
    const [testData, setTestData] = useState(null);
    const [activeQIndex, setActiveQIndex] = useState(0);
    const [timer, setTimer] = useState(0);

    // Local state for code
    const [currentCode, setCurrentCode] = useState('');
    const [currentLang, setCurrentLang] = useState('javascript');

    // --- SOCKET LOGIC ---
    useEffect(() => {
        if (!socket || !isConnected) return;

        console.log("Joinee joining test:", test_id);
        socket.emit('join_test', { test_id });

        const handleTestState = (state) => {
            console.log("Joinee State:", state);
            setTestData(state);
            
            // FIX 2: Only set timer from server if local timer is not running or out of sync
            // This prevents the timer from jittering on every state update
            if (state.timeLeft && state.timeLeft > 0) {
                setTimer(prev => {
                    // If we are within 2 seconds of server time, keep local time (smoother)
                    if (Math.abs(prev - state.timeLeft) > 2) return state.timeLeft;
                    return prev;
                });
            }

            // Restore code if exists
            if (state.questions && state.questions.length > 0) {
                const saved = state.savedCode ? state.savedCode.find(s => s.question_id === state.questions[0].question_id) : null;
                if (saved) {
                    setCurrentCode(saved.code);
                    setCurrentLang(saved.language);
                }
            }
        };

        const handleTestStarted = ({ duration }) => {
            setTimer(duration);
            setTestData(prev => ({ ...prev, status: 'LIVE' }));
        };

        // FIX 3: Move Global Event Listeners here to ensure they don't get stale
        const handleKicked = () => {
            alert('You have been removed from the session by the host.');
            navigate('/'); // This will now work because navigate is defined correctly
        };

        const handleSubmitted = () => {
            alert("Test Submitted Successfully!");
            navigate('/');
        };

        const handleError = (err) => {
            alert(err.message);
            if (err.message.includes("submitted")) navigate('/');
        };

        socket.on('test_state', handleTestState);
        socket.on('test_started', handleTestStarted);
        socket.on('kicked', handleKicked);           // Listen for kick
        socket.on('test_submitted', handleSubmitted);
        socket.on('error', handleError);

        return () => {
            socket.off('test_state', handleTestState);
            socket.off('test_started', handleTestStarted);
            socket.off('kicked', handleKicked);
            socket.off('test_submitted', handleSubmitted);
            socket.off('error', handleError);
        };
    }, [socket, isConnected, test_id, navigate]);

    // --- TIMER LOGIC (Fixed) ---
    useEffect(() => {
        // Only run if timer is > 0
        if (timer <= 0) return;

        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Optional: Auto-submit when time runs out
                    // socket.emit('submit_test', { test_id });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Cleanup interval on unmount
        return () => clearInterval(interval);
    }, [timer > 0]); // FIX 4: Only re-run effect if timer status (active/inactive) changes, not every second.

    // --- HELPERS ---
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleCodeUpdate = (newVal) => {
        setCurrentCode(newVal);
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
    if (!isConnected) return <div className="h-screen flex items-center justify-center bg-[#0D1117] text-white">Connecting...</div>;
    if (!testData) return <div className="h-screen flex items-center justify-center bg-[#0D1117] text-white">Loading Exam...</div>;

    if (testData.status === 'DRAFT') {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-[#0D1117] text-white gap-4">
                <h1 className="text-3xl font-bold">Waiting for Host to Start...</h1>
                <p className="text-gray-400">The exam has not started yet.</p>
                <div className="mt-4 flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-lg">
                    <AlertCircle size={20} /> Status: {testData.status}
                </div>
            </div>
        );
    }

    const activeQ = testData.questions[activeQIndex];
    const currentQuestionTestCases = testData.testCases
        .filter(tc => tc.question_id === activeQ.question_id)
        .map(tc => ({ id: tc.case_id, input: tc.stdin, expected: tc.expected_output }));

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
                    />
                </div>
            </div>
        </div>
    );
};

export default JoineeTestView;