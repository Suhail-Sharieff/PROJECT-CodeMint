import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play, CheckCircle, XCircle, Loader2,
  Terminal, Plus, Trash2, Lock
} from 'lucide-react';
import api from '../services/api';

// --- CONFIG ---
const DEBOUNCE_MS = 1000; // Wait 1s after typing stops before auto-saving

// --- BOILERPLATE TEMPLATES ---
const BOILERPLATES = {
  javascript: `// JavaScript Node.js\n\nconst fs = require('fs');\nconst stdin = fs.readFileSync('/dev/stdin', 'utf-8');\n\nfunction solution(input) {\n    // Your code here\n    console.log("Output from JS");\n}\n\nsolution(stdin);`,
  python: `# Python 3\nimport sys\n\ndef solution():\n    # Read all input from stdin\n    input_data = sys.stdin.read()\n    # Your code here\n    print("Output from Python")\n\nif __name__ == "__main__":\n    solution()`,
  java: `// Java\nimport java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Your code here\n        System.out.println("Output from Java");\n    }\n}`,
  cpp: `// C++\n#include <iostream>\n#include <string>\n\nusing namespace std;\n\nint main() {\n    // Your code here\n    string input;\n    cin >> input;\n    cout << "Output from C++" << endl;\n    return 0;\n}`,
  c: `// C\n#include <stdio.h>\n\nint main() {\n    // Your code here\n    printf("Output from C");\n    return 0;\n}`,
  go: `// Go\npackage main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Output from Go")\n}`,
  plaintext: `// Write your code here...`
};

const CodeEditor = ({
  value,
  language,
  onChange,           // Immediate UI update (Required for controlled component)
  onEmit,             // Debounced update (API calls, Sockets, Auto-save)
  onLanguageChange,
  readOnly = false,
  initialTestCases,
  onScoreUpdate,
  questionId,
  isBattle=false
}) => {
  // --- Refs for Debouncing ---
  const editorRef = useRef(null);
  const latestValueRef = useRef(value || "");
  const timerRef = useRef(null);

  // console.log(isBattle);
  

  // --- State ---
  const [activeTab, setActiveTab] = useState('testcase');
  const [testCases, setTestCases] = useState([{ id: 1, input: '', expected: '', is_hidden: 0 }]);
  const [activeTestCaseId, setActiveTestCaseId] = useState(1);
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [languageList, setLanguageList] = useState([]);
  const [isLanguagesLoading, setIsLanguagesLoading] = useState(false);
  const [panelHeight, setPanelHeight] = useState(250);
  const [isDragging, setIsDragging] = useState(false);

  // --- DEBOUNCE LOGIC START ---

  // 1. Low-level emit (fire-and-forget)
  const emitNow = useCallback((payload) => {//prevents fn being created for eevery render
    if (!onEmit) return;
    try {
      onEmit(payload);
    } catch (e) {
      console.error("Editor emit failed", e);
    }
  }, [onEmit]);

  // 2. Schedule Emit (The Debouncer)
  const scheduleEmit = useCallback((payload) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      emitNow(payload);
      timerRef.current = null;
    }, DEBOUNCE_MS);
  }, [emitNow]);

  // 3. Flush (Force send immediately - used on Run/Blur/Unmount)
  const flushEmit = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      
      // Send a Snapshot when flushing to be safe
      emitNow({
        type: "SNAPSHOT",
        questionId,
        code: latestValueRef.current,
        ts: Date.now(),
        isFlush: true
      });
    }
  }, [emitNow, questionId]);

  // 4. Handle Editor Mount (Attach Blur Listeners)
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Listen for changes to create Deltas (Optional, but good for detailed history)
    editor.onDidChangeModelContent((e) => {
      // We only schedule the emit here.
      // The actual state update happens in handleEditorChange below.
      scheduleEmit({
        type: "DELTA",
        questionId,
        changes: e.changes, // Array of changes from Monaco
        code: editor.getValue(), // Include full code just in case
        ts: Date.now(),
      });
    });

    // Flush immediately when user clicks away
    editor.onDidBlurEditorWidget(() => {
      flushEmit();
    });
  };

  // 5. Cleanup on Unmount
  useEffect(() => {
    return () => {
      flushEmit();
    };
  }, [flushEmit]);

  // --- DEBOUNCE LOGIC END ---


  // --- HELPER: Normalize Judge0 Name to Simple Key ---
  const getMonacoLanguage = (judge0Name) => {
    if (!judge0Name) return 'plaintext';
    const name = judge0Name.toLowerCase();
    if (name.includes('javascript') || name.includes('node')) return 'javascript';
    if (name.includes('python')) return 'python';
    if (name.includes('java')) return 'java';
    if (name.includes('c++') || name.includes('cpp')) return 'cpp';
    if (name.includes('c (')) return 'c';
    if (name.includes('go')) return 'go';
    return 'plaintext';
  };

  // --- 1. Fetch Languages on Mount ---
  useEffect(() => {
    const fetchLanguages = async () => {
      if (readOnly) return;
      setIsLanguagesLoading(true);
      try {
        const response = await api.get(`editor/getLanguages`);
        setLanguageList(response.data);

        if (!language && response.data.length > 0) {
          const defaultLangObj = response.data.find(l => l.name.includes("JavaScript")) || response.data[0];
          const defaultName = defaultLangObj.name;
          if (onLanguageChange) onLanguageChange(defaultName);
          if (!value && onChange) {
            const simpleKey = getMonacoLanguage(defaultName);
            onChange(BOILERPLATES[simpleKey] || BOILERPLATES.plaintext);
          }
        }
      } catch (error) {
        console.error("Failed to fetch languages:", error);
      } finally {
        setIsLanguagesLoading(false);
      }
    };

    fetchLanguages();
  }, [readOnly]);

  // --- 2. Sync Test Cases when Props Change ---
  useEffect(() => {
    if (initialTestCases && initialTestCases.length > 0) {
      const processedCases = initialTestCases.map(tc => ({
        ...tc,
        is_hidden: (tc.is_hidden === 1 || tc.is_hidden === true) ? 1 : 0
      }));
      setTestCases(processedCases);
      setActiveTestCaseId(processedCases[0].id);
      setTestResults(null);
    } else {
      if (!questionId) {
        setTestCases([{ id: 1, input: '', expected: '', is_hidden: 0 }]);
        setActiveTestCaseId(1);
      }
    }
  }, [initialTestCases, questionId]);

  // --- Handle Language Change ---
  const handleLanguageSelect = (e) => {
    const newLangName = e.target.value;
    if (onLanguageChange) onLanguageChange(newLangName);
    const simpleKey = getMonacoLanguage(newLangName);
    const template = BOILERPLATES[simpleKey] || BOILERPLATES.plaintext;
    
    // Update immediately
    if (onChange) onChange(template);
    
    // Also trigger an emit since the content changed drastically
    latestValueRef.current = template;
    scheduleEmit({ type: "SNAPSHOT", code: template, questionId, ts: Date.now() });
  };

  // --- Intercept Editor Change ---
  const handleEditorChange = (val) => {
    // 1. Update Refs for the debouncer
    latestValueRef.current = val ?? "";
    
    // 2. Call parent onChange immediately (Ui responsiveness)
    if (onChange) onChange(val);

    // 3. Fallback: If onDidChangeModelContent fails or isn't used, 
    // we schedule a snapshot here to be safe.
    // (The debouncer inside scheduleEmit handles the "don't emit every char" part)
    scheduleEmit({
        type: "SNAPSHOT",
        questionId,
        code: latestValueRef.current,
        ts: Date.now(),
    });
  };

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

  // --- Helpers for Test Case Logic ---
  const updateTestCase = (field, value) => {
    setTestCases(prev => prev.map(tc => {
      if (tc.id === activeTestCaseId && tc.is_hidden === 1) return tc;
      return tc.id === activeTestCaseId ? { ...tc, [field]: value } : tc
    }));
  };

  const addTestCase = () => {
    const newId = testCases.length > 0 ? Math.max(...testCases.map(t => t.id)) + 1 : 1;
    setTestCases([...testCases, { id: newId, input: '', expected: '', is_hidden: 0 }]);
    setActiveTestCaseId(newId);
  };

  const removeTestCase = (id, e) => {
    e.stopPropagation();
    const targetCase = testCases.find(tc => tc.id === id);
    if (targetCase?.is_hidden === 1) return;

    if (testCases.length === 1) return;
    const newCases = testCases.filter(tc => tc.id !== id);
    setTestCases(newCases);
    if (activeTestCaseId === id) setActiveTestCaseId(newCases[0].id);
  };

  // --- Run Code Logic ---
  const handleRunCode = async () => {
    // CRITICAL: Flush any pending code changes before running!
    flushEmit();

    setIsLoading(true);
    setActiveTab('result');
    setTestResults(null);
    if (panelHeight < 100) setPanelHeight(250);

    try {
      const selectedLangObj = languageList.find(l => l.name === language);
      const language_id = selectedLangObj ? selectedLangObj.id : 63;
      let responseData;

      if (questionId) {
        const response = await api.post(`/editor/submitCode`, {
          language_id,
          source_code: value, // Uses current prop value (should be synced)
          question_id: questionId,
          isBattle:isBattle
        });
        responseData = response.data;
      }
      else {
        if(isBattle) console.log("Battle run ");
        
        const promises = testCases.map(testCase =>
          api.post(`/editor/submitCode`, {
            language_id,
            source_code: value,
            stdin: testCase.input,
            expected_output: testCase.expected,
            isBattle:isBattle
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
        const results = await Promise.all(promises);
        responseData = { results };
      }

      if (responseData) {
        const resultsArray = Array.isArray(responseData) ? responseData : (responseData.results || []);
        setTestResults(resultsArray);
        if (typeof responseData.score === 'number' && onScoreUpdate) {
          onScoreUpdate(responseData.score);
        }
      }

    } catch (error) {
      console.error("Execution error:", error);
      setTestResults([{
        status: { id: 0, description: "Execution Error" },
        stderr: error.response?.data?.message || error.message,
        testCaseId: activeTestCaseId
      }]);
    } finally {
      setIsLoading(false);
    }
  };

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
                  onChange={handleLanguageSelect}
                  className="max-w-[250px] px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-gray-300 text-xs rounded focus:outline-none focus:border-emerald-500 transition-colors"
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
          onMount={handleEditorDidMount} // ADDED: Mount handler for Blur/Deltas
          onChange={handleEditorChange}  // UPDATED: Wrapper for onChange + Debounce
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            wordWrap: 'on',
            readOnly: readOnly,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            background: '#0D1117'
          }}
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

          <div className="flex-1 flex overflow-hidden">
            {/* CASE SELECTOR SIDEBAR */}
            <div className="w-36 bg-[#161B22] border-r border-[#30363D] flex flex-col p-2 space-y-1 overflow-y-auto">
              {testCases.map((tc, idx) => {
                const result = testResults?.find(r => r.testCaseId === tc.id);
                const statusColor = result ? getStatusColor(result.status?.id) : 'text-gray-400';
                return (
                  <button key={tc.id} onClick={() => setActiveTestCaseId(tc.id)} className={`flex items-center justify-between px-3 py-2 rounded text-xs text-left group ${activeTestCaseId === tc.id ? 'bg-[#21262d] text-white' : 'text-gray-400 hover:bg-[#21262d]'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${result ? statusColor.replace('text-', 'bg-') : 'bg-gray-500'}`}></div>
                      Case {idx + 1}
                    </div>

                    {tc.is_hidden === 1 ? (
                      <Lock className="w-3 h-3 text-gray-600" />
                    ) : (
                      !questionId && testCases.length > 1 && <Trash2 onClick={(e) => removeTestCase(tc.id, e)} className="w-3 h-3 opacity-0 group-hover:opacity-100 hover:text-red-400" />
                    )}

                  </button>
                )
              })}
              {!questionId && (
                <button onClick={addTestCase} className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-[#21262d] rounded"><Plus className="w-3 h-3" /> Add Case</button>
              )}
            </div>

            {/* RIGHT CONTENT */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">

              {/* --- INPUT / EXPECTED TAB --- */}
              {activeTab === 'testcase' && (
                <div className="h-full">
                  {activeInput?.is_hidden === 1 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3 select-none">
                      <div className="p-4 bg-[#161B22] rounded-full border border-[#30363D]">
                        <Lock className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-sm font-semibold text-gray-300">Hidden Test Case</h3>
                        <p className="text-xs max-w-[200px] mx-auto mt-1">The input and expected output for this test case are hidden.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Input (Stdin)</label>
                        <textarea
                          value={activeInput?.input || ''}
                          onChange={(e) => updateTestCase('input', e.target.value)}
                          readOnly={!!questionId}
                          className="w-full h-24 bg-[#161B22] border border-[#30363D] rounded p-3 text-sm font-mono text-gray-300 focus:border-emerald-500 focus:outline-none resize-none"
                          placeholder="Enter input..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Expected Output</label>
                        <textarea
                          value={activeInput?.expected || ''}
                          onChange={(e) => updateTestCase('expected', e.target.value)}
                          readOnly={!!questionId}
                          className="w-full h-24 bg-[#161B22] border border-[#30363D] rounded p-3 text-sm font-mono text-gray-300 focus:border-emerald-500 focus:outline-none resize-none"
                          placeholder="Enter expected output..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- RESULT TAB --- */}
              {activeTab === 'result' && (
                <div className="h-full">
                  {!testResults && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
                      <Play className="w-10 h-10 mb-2 opacity-20" />
                      <p>Run code to see results</p>
                    </div>
                  )}
                  {isLoading && <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm"><Loader2 className="w-8 h-8 mb-2 animate-spin text-emerald-500" />Running {testCases.length} test cases...</div>}

                  {testResults && !isLoading && (
                    <div className="space-y-4 animate-in fade-in">
                      <div className={`p-3 rounded border flex items-center gap-3 ${getOverallStatus()?.bg}`}>
                        {getOverallStatus()?.text === "Accepted" ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                        <h4 className={`font-bold text-sm ${getOverallStatus()?.color}`}>{getOverallStatus()?.text}</h4>
                      </div>

                      {activeResult ? (
                        activeInput?.is_hidden === 1 ? (
                          <div className="mt-8 text-center p-6 rounded-lg border border-[#30363D] bg-[#161B22]/50">
                            <div className="flex items-center justify-center mb-3">
                              {activeResult.status?.id === 3
                                ? <CheckCircle className="w-10 h-10 text-emerald-500 opacity-80" />
                                : <XCircle className="w-10 h-10 text-red-500 opacity-80" />
                              }
                            </div>
                            <h3 className={`text-sm font-bold mb-1 ${activeResult.status?.id === 3 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {activeResult.status?.id === 3 ? 'Passed Hidden Test' : 'Failed Hidden Test'}
                            </h3>
                            <p className="text-xs text-gray-500">Input, expected output, and stdout are hidden for this test case.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div><label className="block text-xs font-bold text-gray-500 mb-1">Input</label><div className="bg-[#161B22] border border-[#30363D] p-2 rounded text-sm font-mono text-gray-300">{activeResult.input}</div></div>
                              <div><label className="block text-xs font-bold text-gray-500 mb-1">Expected</label><div className="bg-[#161B22] border border-[#30363D] p-2 rounded text-sm font-mono text-gray-300">{activeResult.expected}</div></div>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Output</label>
                              <div className={`bg-[#161B22] border p-2 rounded text-sm font-mono ${activeResult.status?.id === 3 ? 'border-emerald-500/50 text-white' : 'border-red-500/50 text-red-200'}`}>
                                {activeResult.stdout || activeResult.stderr || activeResult.compile_output || "No output"}
                              </div>
                            </div>
                          </div>
                        )
                      ) : <div className="text-center text-gray-500 text-sm mt-10">Select a test case to view details</div>}
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