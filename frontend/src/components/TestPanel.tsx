import React, { useState, useEffect } from 'react';
import { Play, Clock, Users } from 'lucide-react';

type Submission = {
  studentName: string;
  submittedAt: string | number;
};

type TestPanelProps = {
  socket: any;
  sessionId: string | undefined;
};

const TestPanel: React.FC<TestPanelProps> = ({ socket, sessionId }) => {
  const [question, setQuestion] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [isActive, setIsActive] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const startTest = () => {
    if (question.trim() && socket) {
      socket.emit('start-test', {
        question: question.trim(),
        timeLimit: timeLimit
      });
      setIsActive(true);
    }
  };

  useEffect(() => {
    if (socket) {
      const handleSubmission = (submission: Submission) => {
        setSubmissions(prev => [...prev, submission]);
      };
      socket.on('test-submission', handleSubmission);
      return () => {
        socket.off('test-submission', handleSubmission);
      };
    }
  }, [socket]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">Test Mode</h3>
        <p className="text-sm text-gray-600">Create coding challenges for students</p>
      </div>
      
      <div className="flex-1 p-4 space-y-4">
        {!isActive ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coding Question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Enter your coding question here..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Limit (minutes)
              </label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Math.max(1, Math.min(120, Number(e.target.value))))}
                min={1}
                max={120}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={startTest}
              disabled={!question.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Start Test</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-800">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Test Active</span>
              </div>
              <p className="text-sm text-green-700 mt-2">
                Students are working on the coding challenge
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Question:</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{question}</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Submissions ({submissions.length})
              </h4>
              <div className="space-y-2">
                {submissions.map((submission, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{submission.studentName}</span>
                    <span className="text-xs text-gray-500">
                      {submission.submittedAt ? new Date(submission.submittedAt).toLocaleTimeString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default TestPanel;