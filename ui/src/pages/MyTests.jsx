import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Calendar, Clock, Activity, ChevronRight, 
  Search, Loader2, AlertCircle, FileText 
} from 'lucide-react';

const MyTests = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Fetch Data ---
  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
        const response = await api.get('/test/getMyTests');
        // Sort by newest created first
        const sortedTests = response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setTests(sortedTests);
      } catch (err) {
        console.error("Failed to fetch tests:", err);
        setError("Failed to load your tests. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  // --- Helpers ---
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', 
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'LIVE': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'DRAFT': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'ENDED': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  // --- Filter Logic ---
  const filteredTests = tests.filter(test => 
    test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.test_id.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-[#0D1117] text-gray-300 p-6 font-sans">
      
      {/* Header Section */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">My Tests</h1>
            <p className="text-gray-500 text-sm">Manage and monitor your assessments</p>
          </div>
          
          <button 
            onClick={() => navigate('/')} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20"
          >
            + Create New Test
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-800 rounded-xl leading-5 bg-[#161B22] text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors"
            placeholder="Search by Test Title or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto">
        
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Loader2 className="w-8 h-8 mb-2 animate-spin text-blue-500" />
            <p>Loading your tests...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center h-64 text-red-400 bg-red-900/10 border border-red-900/30 rounded-xl">
            <AlertCircle className="w-6 h-6 mr-2" />
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredTests.length === 0 && (
          <div className="text-center py-20 bg-[#161B22] border border-gray-800 rounded-xl">
            <Activity className="w-12 h-12 mx-auto text-gray-600 mb-3 opacity-50" />
            <h3 className="text-lg font-medium text-white">No tests found</h3>
            <p className="text-gray-500 text-sm mt-1">You haven't created any tests matching your criteria.</p>
          </div>
        )}

        {/* Test Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!loading && !error && filteredTests.map((test) => (
            <div 
              key={test.test_id}
              onClick={() => {
                if (test.status === 'ENDED') {
                    // If Ended -> View Analysis
                    navigate(`/test-details/${test.test_id}`);
                } else {
                    // If Draft/Live -> Go to Host Dashboard
                    navigate(`/hostTestView/${test.test_id}`);
                }
              }}
              className="group bg-[#161B22] border border-gray-800 rounded-xl p-5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/10 transition-all cursor-pointer flex flex-col"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-3">
                <div className={`px-2 py-1 rounded text-[10px] font-bold border tracking-wider ${getStatusColor(test.status)}`}>
                  {test.status}
                </div>
                {test.status === 'ENDED' ? (
                    <FileText className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
                ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
                )}
              </div>

              {/* Title & ID */}
              <h3 className="text-lg font-bold text-white mb-1 truncate group-hover:text-blue-400 transition-colors">
                {test.title || "Untitled Test"}
              </h3>
              <p className="text-xs font-mono text-gray-500 mb-4 truncate">
                ID: {test.test_id}
              </p>

              {/* Divider */}
              <div className="h-px bg-gray-800 w-full my-2"></div>

              {/* Details */}
              <div className="mt-auto space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Created: {formatDate(test.created_at)}</span>
                </div>
                
                {test.start_time ? (
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-400/80">Started: {formatDate(test.start_time)}</span>
                  </div>
                ) : (
                    <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-400/80">Not Started</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>Duration: {test.duration} mins</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyTests;