import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, ArrowLeft } from 'lucide-react';

const JoinSession = () => {
  const { sessionId } = useParams();
  const [studentName, setStudentName] = useState('');
  const navigate = useNavigate();

  const joinAsStudent = () => {
    if (!studentName.trim()) return;
    navigate(`/student/${sessionId}`, { state: { studentName } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </button>

        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-6">
            <Users className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800">Join Coding Session</h1>
            <p className="text-gray-600 mt-2">
              Session ID: <span className="font-mono text-blue-600">{sessionId}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && joinAsStudent()}
              />
            </div>
            
            <button
              onClick={joinAsStudent}
              disabled={!studentName.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              Join Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinSession;