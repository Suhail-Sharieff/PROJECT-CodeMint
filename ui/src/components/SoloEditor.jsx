import React, { useState } from 'react';
import CodeEditor from '../pages/CodeEditor';

const SoloEditor = () => {
  // State to hold code and language
  const [code, setCode] = useState(''); 
  const [language, setLanguage] = useState(''); // Leave empty; CodeEditor will fetch default (JS) on load

  return (
    <div className="h-screen bg-[#0D1117] flex flex-col overflow-hidden">
      {/* Optional: Simple Header */}
      <div className="p-4 border-b border-gray-800 bg-[#161B22] flex justify-between items-center">
        <h1 className="text-white font-bold text-lg">Playground</h1>
        <div className="text-xs text-gray-500">Solo Mode</div>
      </div>

      {/* The Editor Instance */}
      <div className="flex-1 p-4 overflow-hidden">
        <CodeEditor
          value={code}
          language={language}
          onChange={setCode}
          onLanguageChange={setLanguage}
        />
      </div>
    </div>
  );
};

export default SoloEditor;