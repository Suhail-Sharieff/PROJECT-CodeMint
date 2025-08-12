import React, { useState, useEffect, useRef } from 'react';
import { Clock, Send, CheckCircle } from 'lucide-react';
import CodeEditor from './CodeEditor';

interface TestData {
  startTime: string;
  timeLimit: number;
  question: string;
}

interface TestInterfaceProps {
  socket: {
    emit: (event: string, ...args: any[]) => void;
  };
  testData: TestData | null;
  language: string;
}

const TestInterface: React.FC<TestInterfaceProps> = ({ socket, testData, language }) => {
  const [code, setCode] = useState('// Write your solution here...\n');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const updateTimer = useRef<number | null>(null);

  // Setup countdown timer
  useEffect(() => {
    if (testData) {
      const endTime =
        new Date(testData.startTime).getTime() + testData.timeLimit * 60 * 1000;
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);

      const timer = setInterval(() => {
        const currentRemaining = Math.max(
          0,
          Math.floor((endTime - Date.now()) / 1000)
        );
        setTimeRemaining(currentRemaining);

        socket.emit('test-timer-update', currentRemaining);

        if (currentRemaining === 0) {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [testData, socket]);

  // Send live code updates to teacher every 2 seconds
  useEffect(() => {
    if (!socket) return;

    if (updateTimer.current) clearInterval(updateTimer.current);
    updateTimer.current = setInterval(() => {
      if (testData && !isSubmitted && timeRemaining > 0) {
        socket.emit('code-change', {
          code,
          language
        });
      }
    }, 2000);

    return () => {
      if (updateTimer.current) clearInterval(updateTimer.current);
    };
  }, [socket, code, language, testData, isSubmitted, timeRemaining]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  };

  const submitCode = () => {
    if (socket && code.trim() && !isSubmitted) {
      socket.emit('submit-test', {
        code: code.trim(),
        language
      });
      setIsSubmitted(true);
    }
  };

  if (!testData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No active test</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Coding Challenge</h3>
          <div
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
              timeRemaining > 300
                ? 'bg-green-100 text-green-800'
                : timeRemaining > 60
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(timeRemaining)}</span>
          </div>
        </div>

        {isSubmitted && (
          <div className="mt-2 flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Submitted successfully!</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="w-full lg:w-1/2 p-4 border-b lg:border-b-0 lg:border-r border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3">Problem Statement:</h4>
          <div className="bg-gray-50 p-4 rounded-lg h-full overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700">
              {testData.question}
            </pre>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-800">Please paste your solution below:</h4>
              <button
                onClick={submitCode}
                disabled={!code.trim() || isSubmitted || timeRemaining === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitted ? 'Submitted' : 'Submit'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1">
            <CodeEditor
              value={code}
              language={language}
              onChange={(value) => {
                if (typeof value === 'string') setCode(value);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestInterface;
