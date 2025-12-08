import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import CodeEditor from './CodeEditor';
import { 
  ArrowLeft, Clock, Calendar, Code, 
  Terminal, Loader2, AlertCircle, ChevronRight, Mail 
} from 'lucide-react';

const TestDetailsPage = () => {
  const { test_id } = useParams();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testMeta, setTestMeta] = useState(null);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/test/getTestDetails?test_id=${test_id}`);
        
        if (response.data.success) {
          const data = response.data.data;
          setParticipants(data);
          
          if (data.length > 0) {
            setTestMeta({
              title: data[0].title,
              start_time: data[0].start_time,
              duration: data[0].duration
            });
            handleUserSelect(data[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching test details:", err);
        setError("Failed to load test details.");
      } finally {
        setLoading(false);
      }
    };

    if (test_id) fetchDetails();
  }, [test_id]);

  // --- Handlers ---
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    if (user.submissions && user.submissions.length > 0) {
      setSelectedQuestion(user.submissions[0]);
    } else {
      setSelectedQuestion(null);
    }
  };

  // --- Helpers ---
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const formatTimeTaken = (timeStr) => {
    if (!timeStr) return 'N/A';
    return timeStr.split('.')[0]; 
  };

  // --- Render ---

  if (loading) return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center text-gray-400">
      <Loader2 className="w-8 h-8 animate-spin mb-2" />
      <span className="ml-3">Loading Analysis...</span>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col items-center justify-center text-red-400">
      <AlertCircle className="w-12 h-12 mb-4" />
      <h2 className="text-xl font-bold">{error}</h2>
      <button onClick={() => navigate("/myTests")} className="mt-4 text-gray-400 hover:text-white underline">Go Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0D1117] text-gray-300 flex flex-col font-sans">
      
      {/* --- Header --- */}
      <header className="bg-[#161B22] border-b border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* <button 
            onClick={() => navigate('/myTests')} 
            className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button> */}
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3">
              {testMeta?.title || "Test Analysis"}
              <span className="text-xs px-2 py-0.5 rounded border text-red-400 bg-red-400/10 border-red-400/20">ENDED</span>
            </h1>
            <div className="flex gap-4 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Calendar size={12}/> {formatDate(testMeta?.start_time)}</span>
              <span className="flex items-center gap-1"><Clock size={12}/> {testMeta?.duration} mins</span>
            </div>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMN 1: Participants List */}
        <div className="w-80 bg-[#161B22] border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800 bg-[#21262d]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Participants ({participants.length})</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {participants.map((p) => (
              <button
                key={p.user_id}
                onClick={() => handleUserSelect(p)}
                className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2
                  ${selectedUser?.user_id === p.user_id 
                    ? 'bg-blue-600/20 border-blue-500/50' 
                    : 'bg-transparent border-transparent hover:bg-gray-800'
                  }`}
              >
                {/* User Info Row */}
                <div className="flex justify-between items-start w-full">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                      {p.name ? p.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    
                    {/* Name & Email */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-gray-200 truncate max-w-[120px]">
                        {p.name || `User ${p.user_id}`}
                      </span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1 truncate max-w-[120px]">
                        <Mail size={10}/> {p.email || "No Email"}
                      </span>
                    </div>
                  </div>

                  {/* Score Badge */}
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-500/20">
                    {p.score} pts
                  </span>
                </div>

                {/* Status Row */}
                <div className="flex justify-between items-center text-[10px] text-gray-500 px-1 border-t border-gray-700/50 pt-2 mt-1">
                  <span>{p.submissions ? p.submissions.length : 0} submissions</span>
                  <span className={`capitalize ${p.user_status === 'finished' ? 'text-green-500' : 'text-yellow-500'}`}>
                    {p.user_status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* COLUMN 2: Questions List */}
        {selectedUser && (
          <div className="w-72 bg-[#0D1117] border-r border-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-800 bg-[#161B22]/50">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Submissions</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {selectedUser.submissions && selectedUser.submissions.map((sub, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedQuestion(sub)}
                  className={`w-full text-left p-3 rounded border transition-all flex items-center justify-between group
                    ${selectedQuestion === sub 
                      ? 'bg-gray-800 border-gray-600 text-white' 
                      : 'bg-transparent border-gray-800 text-gray-400 hover:bg-gray-800/50'
                    }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                      <Terminal size={12}/> Question {sub.question_id}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 font-mono">
                      <Clock size={10}/> {formatTimeTaken(sub.time_taken_to_solve)}
                    </span>
                  </div>
                  <ChevronRight size={14} className={selectedQuestion === sub ? 'text-blue-400' : 'text-gray-600 group-hover:text-blue-400'}/>
                </button>
              ))}
              
              {(!selectedUser.submissions || selectedUser.submissions.length === 0) && (
                <div className="text-center py-10 text-gray-600 text-xs italic border border-dashed border-gray-800 rounded-lg m-2">
                  User did not submit any code.
                </div>
              )}
            </div>
          </div>
        )}

        {/* COLUMN 3: Code Viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0D1117]">
          {selectedQuestion ? (
            <>
              <div className="bg-[#161B22] border-b border-gray-800 p-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Code size={16} className="text-blue-400"/>
                    <span className="font-semibold">Lang:</span> 
                    <span className="font-mono text-emerald-400 text-xs bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/20">
                      {selectedQuestion.language === "62" ? "Java" : selectedQuestion.language}
                    </span>
                  </div>
                  <div className="h-4 w-[1px] bg-gray-700"></div>
                  <div className="text-xs text-gray-500">
                    Last Updated: {selectedQuestion.last_updated}
                  </div>
                </div>
              </div>

              <div className="flex-1 relative">
                <CodeEditor 
                  value={selectedQuestion.code || "// No code submitted"}
                  language={selectedQuestion.language === "62" ? "java" : selectedQuestion.language} 
                  readOnly={true}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
              <Code size={48} className="mb-4 opacity-20" />
              <p className="text-sm">Select a question to view the solution</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TestDetailsPage;