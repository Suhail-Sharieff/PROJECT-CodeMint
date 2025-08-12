import React from 'react';
import Editor from '@monaco-editor/react';

type CodeEditorProps = {
  value: string;
  language: string;
  onChange?: (value: string | undefined) => void;
  onLanguageChange?: (language: string) => void;
  readOnly?: boolean;
};

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  language,
  onChange,
  onLanguageChange,
  readOnly = false,
}) => {
  const handleEditorChange = (value: string | undefined) => {
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
    <div className="flex flex-col h-full">
      {!readOnly && onLanguageChange && (
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            {languageOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            readOnly: readOnly,
            theme: 'vs-light',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'none',
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;