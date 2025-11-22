import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api'; // Ensure path matches your project
import CodeEditor from './CodeEditor'; // Reusing your existing editor
import { 
  ArrowLeft, Clock, Calendar, User, Code, 
  CheckCircle, AlertCircle, Terminal, Loader2 
} from 'lucide-react';

const TestDetailsPage = () => {
  const { test_id } = useParams();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testMeta, setTestMeta] = useState(null);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        // Calling the endpoint specified
        const response = await api.get(`/test/getTestDetails?test_id=${test_id}`);
        
        if (response.data.success) {
          const data = response.data.data;
          setSubmissions(data);
          
          // Extract general test metadata from the first record (since it's repeated)
          if (data.length > 0) {
            setTestMeta({
              title: data[0].title,
              status: data[0].test_status,
              created_at: data[0].created_at,
              start_time: data[0].start_time,
              duration: data[0].duration
            });
            // Default select the first student
            setSelectedSubmission(data[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching test details:", err);
        setError("Failed to load test details.");
      } finally {
        setLoading(false);
      }
    };

    if (test_id) {
      fetchDetails();
    }
  }, [test_id]);

  // --- Helpers ---
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const getStatusColor = (status) => {
    if (status === 'LIVE') return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (status === 'ENDED') return 'text-red-400 bg-red-400/10 border-red-400/20';
    return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
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
      <button onClick={() => navigate(-1)} className="mt-4 text-gray-400 hover:text-white underline">Go Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0D1117] text-gray-300 flex flex-col font-sans">
      
      {/* --- Header --- */}
      <header className="bg-[#161B22] border-b border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/myTests')} 
            className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3">
              {testMeta?.title || "Test Details"}
              <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(testMeta?.status)}`}>
                {testMeta?.status}
              </span>
            </h1>
            <div className="flex gap-4 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Calendar size={12}/> {formatDate(testMeta?.created_at)}</span>
              <span className="flex items-center gap-1"><Clock size={12}/> {testMeta?.duration} mins</span>
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Test ID: <span className="font-mono text-gray-400">{test_id}</span>
        </div>
      </header>

      {/* --- Main Content --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Submissions List */}
        <div className="w-80 bg-[#161B22] border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Participants</h3>
            <div className="text-xs text-gray-500 mt-1">{submissions.length} submissions found</div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {submissions.map((sub, idx) => (
              <button
                key={idx} // Using index as fallback key if multiple questions per user exist
                onClick={() => setSelectedSubmission(sub)}
                className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2
                  ${selectedSubmission === sub 
                    ? 'bg-blue-900/20 border-blue-500/50' 
                    : 'bg-gray-800/30 border-gray-800 hover:bg-gray-800'
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-700 p-1.5 rounded-full">
                      <User size={14} className="text-gray-300"/>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-200">User ID: {sub.user_id}</div>
                      <div className="text-[10px] text-gray-500 capitalize">{sub.role} • {sub.user_status}</div>
                    </div>
                  </div>
                  {sub.score > 0 && (
                    <span className="text-green-400 text-xs font-bold">+{sub.score} pts</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-700/50 mt-1">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Terminal size={10}/> Q-ID: {sub.question_id}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {sub.time_taken_to_solve || "N/A"}
                  </span>
                </div>
              </button>
            ))}
            
            {submissions.length === 0 && (
              <div className="text-center py-10 text-gray-500 text-sm">
                No submissions found.
              </div>
            )}
          </div>
        </div>

        {/* Right Content: Code Viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0D1117]">
          {selectedSubmission ? (
            <>
              {/* Submission Metadata Bar */}
              <div className="bg-[#161B22] border-b border-gray-800 p-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Code size={16} className="text-blue-400"/>
                    <span className="font-semibold">Language:</span> 
                    <span className="font-mono text-emerald-400">{selectedSubmission.language}</span>
                  </div>
                  <div className="h-4 w-[1px] bg-gray-700"></div>
                  <div className="text-xs text-gray-500">
                    Last Updated: {formatDate(selectedSubmission.last_updated)}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                   <span className="text-xs text-gray-500">Question ID: {selectedSubmission.question_id}</span>
                </div>
              </div>

              {/* Read-Only Code Editor */}
              <div className="flex-1 relative">
                <CodeEditor 
                  value={selectedSubmission.code}
                  language={selectedSubmission.language} // CodeEditor logic handles mapping
                  readOnly={true}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <Terminal className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a submission to view code</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TestDetailsPage;