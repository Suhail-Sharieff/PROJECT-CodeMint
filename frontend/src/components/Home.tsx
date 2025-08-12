import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Code, VideoIcon, MessageSquare } from 'lucide-react';

const Home = () => {
  const [teacherName, setTeacherName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createSession = async () => {
    if (!teacherName.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherName }),
      });
      
      const data = await response.json();
      navigate(`/teacher/${data.sessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinSession = () => {
    if (!sessionId.trim()) return;
    navigate(`/join/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
            Live Coding Classroom
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Interactive coding sessions for educational institutions
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <div className="flex flex-col items-center p-4">
              <Code className="w-12 h-12 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Live Coding</span>
            </div>
            <div className="flex flex-col items-center p-4">
              <VideoIcon className="w-12 h-12 text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Video Sessions</span>
            </div>
            <div className="flex flex-col items-center p-4">
              <MessageSquare className="w-12 h-12 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Live Chat</span>
            </div>
            <div className="flex flex-col items-center p-4">
              <Users className="w-12 h-12 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Collaborative</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Start Teaching</h2>
            <p className="text-gray-600 mb-6">
              Create a live coding session and share the link with your students
            </p>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter your name"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={createSession}
                disabled={loading || !teacherName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                {loading ? 'Creating Session...' : 'Create Session'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Join Session</h2>
            <p className="text-gray-600 mb-6">
              Enter the session ID provided by your teacher
            </p>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter session ID"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                onClick={joinSession}
                disabled={!sessionId.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                Join Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;