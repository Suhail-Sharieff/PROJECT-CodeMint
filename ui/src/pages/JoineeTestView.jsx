import React, { useState, useEffect, useMemo } from 'react'; // <--- 1. Import useMemo
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
    const [error, setError] = useState(null); 

    // Local state for code
    const [currentCode, setCurrentCode] = useState('');
    const [currentLang, setCurrentLang] = useState('javascript');

    // --- SOCKET LOGIC ---
    useEffect(() => {
        if (!socket || !isConnected) return;

        console.log("🔌 Connected. Joining test:", test_id);
        socket.emit('join_test', { test_id });

        const handleTestState = (state) => {
            console.log("✅ Joinee State Received:", state);
            setTestData(state);
            
            if (state.timeLeft > 0) {
                setTimer(prev => Math.abs(prev - state.timeLeft) > 2 ? state.timeLeft : prev);
            }

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
            setTestData(prev => (prev ? { ...prev, status: 'LIVE' } : prev));
        };

        const handleError = (err) => {
            console.error(err);
            setError(err.message);
            if (err.message && err.message.includes("submitted")) navigate('/');
        };

        socket.on('test_state', handleTestState);
        socket.on('test_started', handleTestStarted);
        socket.on('test_ended', ()=>{socket.emit('submit_test', { test_id });alert("The test has been ended by host, your submission will be recorded!");navigate("/")});
        socket.on('kicked', () => { alert("You were removed."); navigate('/'); });
        socket.on('test_submitted', () => { alert("Submitted!"); navigate('/'); });
        socket.on('error', handleError);

        return () => {
            socket.off('test_state', handleTestState);
            socket.off('test_started', handleTestStarted);
            socket.off('kicked');
            socket.off('test_submitted');
            socket.off('error', handleError);
        };
    }, [socket, isConnected, test_id, navigate]);

    // --- TIMER ---
    useEffect(() => {
        if (timer <= 0) return;
        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    alert("Time is up!");
                    if(socket) socket.emit('submit_test', { test_id });
                    navigate('/');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timer > 0, socket, test_id, navigate]);

    // --- HANDLERS ---
    const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

    const handleCodeUpdate = (newVal) => {
        setCurrentCode(newVal);
        if (socket && testData?.questions[activeQIndex]) {
            socket.emit('save_code', {
                test_id,
                question_id: testData.questions[activeQIndex].question_id,
                code: newVal,
                language: currentLang
            });
        }
    };

    const switchQuestion = (index) => {
        setActiveQIndex(index);
        if (testData?.questions[index]) {
            const qId = testData.questions[index].question_id;
            const saved = testData.savedCode ? testData.savedCode.find(s => s.question_id === qId) : null;
            setCurrentCode(saved ? saved.code : '');
            setCurrentLang(saved ? saved.language : 'javascript');
        }
    };

    const handleSubmitTest = () => {
        if(window.confirm("Submit test?")) socket.emit('submit_test', { test_id });
    };

    // --- MEMOIZED TEST CASES (THE FIX) ---
    // This prevents the array reference from changing on every timer tick
    const activeQ = testData?.questions[activeQIndex];
    
    const currentQuestionTestCases = useMemo(() => {
        if (!testData || !activeQ) return [];
        
        return testData.testCases
            .filter(tc => tc.question_id === activeQ.question_id)
            .map(tc => ({ 
                id: tc.case_id, 
                input: tc.stdin, 
                expected: tc.expected_output,
                is_hidden: tc.is_hidden 
            }));
    }, [testData, activeQ]); 
    // Only re-runs if testData (loaded once) or activeQ (user switches question) changes.
    // It ignores 'timer' updates.

    // --- RENDER ---
    if (error) return <div className="h-screen flex flex-col items-center justify-center bg-[#0D1117] text-red-400 font-bold">{error} <button onClick={() => navigate('/')} className="mt-4 text-sm bg-gray-800 p-2 rounded">Go Home</button></div>;
    if (!isConnected) return <div className="h-screen flex items-center justify-center bg-[#0D1117] text-white">Connecting...</div>;
    if (!testData) return <div className="h-screen flex items-center justify-center bg-[#0D1117] text-white">Loading Exam...</div>;

    if (testData.status === 'DRAFT') return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#0D1117] text-white gap-4">
            <h1 className="text-3xl font-bold">Waiting for Host...</h1>
            <div className="flex items-center gap-2 text-yellow-500"><AlertCircle/> Please stay on this page.</div>
        </div>
    );

    return (
        <div className="h-screen bg-[#0D1117] text-gray-300 flex flex-col overflow-hidden font-sans">
            <header className="bg-[#161B22] border-b border-gray-800 p-3 flex justify-between items-center">
                <div className="flex gap-2">
                    {testData.questions.map((_, idx) => (
                        <button key={idx} onClick={() => switchQuestion(idx)} className={`w-8 h-8 rounded ${activeQIndex === idx ? 'bg-blue-600 text-white' : 'bg-gray-800'}`}>{idx + 1}</button>
                    ))}
                </div>
                <div className="text-xl font-mono font-bold text-white">{formatTime(timer)}</div>
                <button onClick={handleSubmitTest} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-white font-bold text-sm">Finish</button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-1/3 bg-[#0D1117] border-r border-gray-800 p-6 overflow-y-auto">
                    <h2 className="text-2xl font-bold text-white mb-4">{activeQ.title}</h2>
                    <div className="prose prose-invert mb-6 text-gray-300 whitespace-pre-wrap">{activeQ.description}</div>
                    {activeQ.example && <pre className="bg-[#161B22] border border-gray-700 p-4 rounded text-sm text-gray-300 whitespace-pre-wrap">{activeQ.example}</pre>}
                </div>
                <div className="flex-1 min-w-0">
                    <CodeEditor 
                        value={currentCode}
                        language={currentLang}
                        questionId={activeQ.question_id}
                        onChange={handleCodeUpdate}
                        onLanguageChange={setCurrentLang}
                        initialTestCases={currentQuestionTestCases} // <--- Now Stable
                    />
                </div>
            </div>
        </div>
    );
};

export default JoineeTestView;