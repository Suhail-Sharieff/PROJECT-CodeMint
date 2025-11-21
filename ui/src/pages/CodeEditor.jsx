import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, CheckCircle, XCircle, AlertTriangle, Loader2, 
  Terminal, Plus, Trash2, GripHorizontal 
} from 'lucide-react';
import api from '../services/api';

const CodeEditor = ({
  value,
  language,
  onChange,
  onLanguageChange,
  readOnly = false,
}) => {
  // --- State ---
  const [activeTab, setActiveTab] = useState('testcase'); // 'testcase' | 'result'
  
  // Multiple Test Cases State
  const [testCases, setTestCases] = useState([
    { id: 1, input: '', expected: '' },
    { id: 2, input: '', expected: '' }
  ]);
  const [activeTestCaseId, setActiveTestCaseId] = useState(1);

  // Results State (Array of results corresponding to test cases)
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [languageList, setLanguageList] = useState([]);
  const [isLanguagesLoading, setIsLanguagesLoading] = useState(false);

  // Panel Resize State
  const [panelHeight, setPanelHeight] = useState(250);
  const [isDragging, setIsDragging] = useState(false);

  // --- Fetch Languages ---
  useEffect(() => {
    const fetchLanguages = async () => {
      if (readOnly) return;
      setIsLanguagesLoading(true);
      try {
        const response = await api.get(`editor/getLanguages`);
        setLanguageList(response.data);
        if (!language && response.data.length > 0) {
            const defaultLang = response.data.find(l => l.name.includes("JavaScript")) || response.data[0];
            if (onLanguageChange) onLanguageChange(defaultLang.name);
        }
      } catch (error) {
        console.error("Failed to fetch languages:", error);
      } finally {
        setIsLanguagesLoading(false);
      }
    };
    fetchLanguages();
  }, [readOnly]);

  // --- Resize Logic ---
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 100 && newHeight < window.innerHeight - 200) setPanelHeight(newHeight);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isDragging]);

  // --- Helpers ---
  const getMonacoLanguage = (judge0Name) => {
    if (!judge0Name) return 'plaintext';
    const name = judge0Name.toLowerCase();
    if (name.includes('javascript') || name.includes('node')) return 'javascript';
    if (name.includes('python')) return 'python';
    if (name.includes('java')) return 'java';
    if (name.includes('c++') || name.includes('cpp')) return 'cpp';
    if (name.includes('c (')) return 'c';
    return 'plaintext';
  };

  const handleEditorChange = (val) => {
    if (onChange) onChange(val);
  };

  // --- Test Case Management ---
  const updateTestCase = (field, value) => {
    setTestCases(prev => prev.map(tc => 
      tc.id === activeTestCaseId ? { ...tc, [field]: value } : tc
    ));
  };

  const addTestCase = () => {
    const newId = testCases.length > 0 ? Math.max(...testCases.map(t => t.id)) + 1 : 1;
    setTestCases([...testCases, { id: newId, input: '', expected: '' }]);
    setActiveTestCaseId(newId);
  };

  const removeTestCase = (id, e) => {
    e.stopPropagation();
    if (testCases.length === 1) return; // Don't delete the last one
    const newCases = testCases.filter(tc => tc.id !== id);
    setTestCases(newCases);
    if (activeTestCaseId === id) setActiveTestCaseId(newCases[0].id);
  };

  // --- RUN LOGIC (Parallel Execution) ---
  const handleRunCode = async () => {
    setIsLoading(true);
    setActiveTab('result');
    setTestResults(null);
    if (panelHeight < 100) setPanelHeight(250);

    try {
      const selectedLangObj = languageList.find(l => l.name === language);
      const language_id = selectedLangObj ? selectedLangObj.id : 63;

      // Map each test case to a promise
      const promises = testCases.map(testCase => 
        api.post(`editor/submitCode`, {
          language_id,
          source_code: value,
          stdin: testCase.input,
          expected_output: testCase.expected
        }).then(res => ({
            ...res.data, 
            testCaseId: testCase.id,
            input: testCase.input,
            expected: testCase.expected
        })).catch(err => ({
            status: { id: 0, description: "Error" },
            stderr: err.message,
            testCaseId: testCase.id,
            input: testCase.input,
            expected: testCase.expected
        }))
      );

      // Wait for all to finish
      const results = await Promise.all(promises);
      setTestResults(results);

    } catch (error) {
      console.error("Execution error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Helpers ---
  const getStatusColor = (statusId) => {
    if (statusId === 3) return 'text-emerald-500'; 
    if (statusId === 4) return 'text-red-500';     
    return 'text-yellow-500';                       
  };

  const getOverallStatus = () => {
    if (!testResults) return null;
    const allPassed = testResults.every(r => r.status?.id === 3);
    if (allPassed) return { text: "Accepted", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" };
    
    const error = testResults.find(r => r.status?.id !== 3 && r.status?.id !== 4);
    if (error) return { text: error.status?.description || "Error", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20" };

    return { text: "Wrong Answer", color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" };
  };

  const activeResult = testResults?.find(r => r.testCaseId === activeTestCaseId);
  const activeInput = testCases.find(t => t.id === activeTestCaseId);

  return (
    <div className="flex flex-col h-full border border-[#30363D] rounded-lg overflow-hidden bg-[#0D1117] text-gray-300 font-sans shadow-xl">
      
      {/* --- TOOLBAR --- */}
      {!readOnly && (
        <div className="flex-shrink-0 flex items-center justify-between p-3 bg-[#161B22] border-b border-[#30363D]">
           <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lang:</span>
              {isLanguagesLoading ? (
                 <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</div>
              ) : (
                <select
                    value={language}
                    onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
                    className="max-w-[200px] px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-gray-300 text-xs rounded focus:outline-none focus:border-emerald-500 transition-colors"
                >
                    {languageList.map((lang) => <option key={lang.id} value={lang.name}>{lang.name}</option>)}
                </select>
              )}
            </div>
          </div>
          <button
            onClick={handleRunCode}
            disabled={isLoading}
            className={`flex items-center gap-2 px-5 py-1.5 rounded text-sm font-semibold transition-all ${isLoading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'}`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isLoading ? 'Running...' : 'Run'}</span>
          </button>
        </div>
      )}

      {/* --- EDITOR --- */}
      <div className="flex-1 relative min-h-0"> 
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          value={value}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", wordWrap: 'on', readOnly: readOnly, automaticLayout: true, padding: { top: 16, bottom: 16 }, background: '#0D1117' }}
        />
      </div>

      {/* --- RESIZE HANDLE --- */}
      {!readOnly && (
        <div onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }} className="h-1.5 bg-[#161B22] border-y border-[#30363D] cursor-row-resize flex items-center justify-center hover:bg-blue-500/20 transition-colors z-10 group">
          <div className="w-8 h-1 rounded-full bg-gray-600 group-hover:bg-blue-400 transition-colors" />
        </div>
      )}

      {/* --- BOTTOM PANEL --- */}
      {!readOnly && (
        <div style={{ height: panelHeight }} className="flex flex-col bg-[#0D1117]">
          
          {/* Tabs (Testcase vs Result) */}
          <div className="flex items-center bg-[#161B22] border-b border-[#30363D]">
            <button onClick={() => setActiveTab('testcase')} className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-r border-[#30363D] relative ${activeTab === 'testcase' ? 'bg-[#0D1117] text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}>
              {activeTab === 'testcase' && <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500" />}
              <Terminal className="w-3 h-3" /> Testcases
            </button>
            <button onClick={() => setActiveTab('result')} className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-r border-[#30363D] relative ${activeTab === 'result' ? 'bg-[#0D1117] text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}>
               {activeTab === 'result' && <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500" />}
              Test Results
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT SIDEBAR: Case Selector */}
            <div className="w-32 bg-[#161B22] border-r border-[#30363D] flex flex-col p-2 space-y-1 overflow-y-auto">
                {testCases.map((tc, idx) => {
                    const result = testResults?.find(r => r.testCaseId === tc.id);
                    const statusColor = result ? getStatusColor(result.status?.id) : 'text-gray-400';
                    
                    return (
                        <button
                            key={tc.id}
                            onClick={() => setActiveTestCaseId(tc.id)}
                            className={`flex items-center justify-between px-3 py-2 rounded text-xs text-left group ${activeTestCaseId === tc.id ? 'bg-[#21262d] text-white' : 'text-gray-400 hover:bg-[#21262d]'}`}
                        >
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${result ? statusColor.replace('text-', 'bg-') : 'bg-gray-500'}`}></div>
                                Case {idx + 1}
                            </div>
                            {!readOnly && testCases.length > 1 && (
                                <Trash2 onClick={(e) => removeTestCase(tc.id, e)} className="w-3 h-3 opacity-0 group-hover:opacity-100 hover:text-red-400" />
                            )}
                        </button>
                    )
                })}
                <button onClick={addTestCase} className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-[#21262d] rounded">
                    <Plus className="w-3 h-3" /> Add Case
                </button>
            </div>

            {/* RIGHT CONTENT: Inputs/Outputs */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                
                {activeTab === 'testcase' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Input (Stdin)</label>
                            <textarea
                                value={activeInput?.input || ''}
                                onChange={(e) => updateTestCase('input', e.target.value)}
                                className="w-full h-24 bg-[#161B22] border border-[#30363D] rounded p-3 text-sm font-mono text-gray-300 focus:border-emerald-500 focus:outline-none resize-none"
                                placeholder="Enter input..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Expected Output</label>
                            <textarea
                                value={activeInput?.expected || ''}
                                onChange={(e) => updateTestCase('expected', e.target.value)}
                                className="w-full h-24 bg-[#161B22] border border-[#30363D] rounded p-3 text-sm font-mono text-gray-300 focus:border-emerald-500 focus:outline-none resize-none"
                                placeholder="Enter expected output..."
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'result' && (
                    <div className="h-full">
                        {!testResults && !isLoading && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
                                <Play className="w-10 h-10 mb-2 opacity-20" />
                                <p>Run code to see results</p>
                            </div>
                        )}

                        {isLoading && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                                <Loader2 className="w-8 h-8 mb-2 animate-spin text-emerald-500" />
                                Running {testCases.length} test cases...
                            </div>
                        )}

                        {testResults && !isLoading && (
                            <div className="space-y-4 animate-in fade-in">
                                {/* Overall Status Banner */}
                                <div className={`p-3 rounded border flex items-center gap-3 ${getOverallStatus()?.bg}`}>
                                    {getOverallStatus()?.text === "Accepted" ? <CheckCircle className="w-5 h-5 text-emerald-500"/> : <XCircle className="w-5 h-5 text-red-500"/>}
                                    <h4 className={`font-bold text-sm ${getOverallStatus()?.color}`}>{getOverallStatus()?.text}</h4>
                                </div>

                                {/* Specific Case Details */}
                                {activeResult ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Input</label>
                                                <div className="bg-[#161B22] border border-[#30363D] p-2 rounded text-sm font-mono text-gray-300">{activeResult.input}</div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Expected</label>
                                                <div className="bg-[#161B22] border border-[#30363D] p-2 rounded text-sm font-mono text-gray-300">{activeResult.expected}</div>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Output</label>
                                            <div className={`bg-[#161B22] border p-2 rounded text-sm font-mono ${activeResult.status?.id === 3 ? 'border-emerald-500/50 text-white' : 'border-red-500/50 text-red-200'}`}>
                                                {activeResult.stdout || activeResult.stderr || activeResult.compile_output || "No output"}
                                            </div>
                                        </div>
                                        
                                        {activeResult.stderr && (
                                            <div className="p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-200 font-mono whitespace-pre-wrap">
                                                {activeResult.stderr}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500 text-sm mt-10">Select a test case to view details</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;