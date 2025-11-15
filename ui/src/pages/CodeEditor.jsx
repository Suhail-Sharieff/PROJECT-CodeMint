import React from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({
  value,
  language,
  onChange,
  onLanguageChange,
  readOnly = false,
}) => {
  
  const handleEditorChange = (value) => {
    if (onChange) {
      onChange(value);
    }
  };

  const languageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' },
    { value: 'java', label: 'Java' },
    { value: 'c', label: 'C' },
  ];

  return (
    <div className="flex flex-col h-full border border-[#30363D] rounded-lg overflow-hidden">
      {/* Toolbar */}
      {!readOnly && onLanguageChange && (
        <div className="flex items-center justify-between p-3 bg-[#161B22] border-b border-[#30363D]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Language:
            </span>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-gray-300 text-sm rounded focus:outline-none focus:border-[#34D399] transition-colors"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 bg-[#0D1117]">
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={handleEditorChange}
          theme="vs-dark" // Changed to Dark Theme for CodeMint
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace", // Better font for coding
            wordWrap: 'on',
            readOnly: readOnly,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'all',
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;