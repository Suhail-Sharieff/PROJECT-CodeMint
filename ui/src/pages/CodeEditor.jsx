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
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
  ];

  return (
    <div className="flex flex-col h-full border border-[#30363D] rounded-lg overflow-hidden bg-[#0D1117]">
      {/* Toolbar - Only show if we can change language (not readOnly) */}
      {!readOnly && onLanguageChange && (
        <div className="flex items-center justify-between p-2 bg-[#161B22] border-b border-[#30363D]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-2">
              Language:
            </span>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="px-2 py-1 bg-[#0D1117] border border-[#30363D] text-gray-300 text-xs rounded focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-gray-500 mr-2">
            Monaco Editor
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={handleEditorChange}
          theme="vs-dark" 
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            wordWrap: 'on',
            readOnly: readOnly,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'all',
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            padding: { top: 16, bottom: 16 },
            background: '#0D1117' // Match container background
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;