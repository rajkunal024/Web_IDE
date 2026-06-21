import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { 
  FiDownload, FiArrowLeft, FiPlay, FiTerminal, FiXCircle 
} from 'react-icons/fi';

const BOILERPLATES = {
  python: 'print("Hello from Aether Playground!")\n',
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Aether Playground!");
    }
}`,
  c: `#include <stdio.h>\n\nint main() {\n    printf("Hello from Aether Playground!\\n");\n    return 0;\n}`,
  cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello from Aether Playground!" << std::endl;\n    return 0;\n}`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Aether Playground!")\n}`,
  rust: `fn main() {\n    println!("Hello from Aether Playground!");\n}`,
  javascript: `console.log("Hello from Aether Playground!");\n`,
  typescript: `console.log("Hello from Aether Playground!");\n`,
  r: 'cat("Hello from Aether Playground!\\n")\n',
  ruby: 'puts "Hello from Aether Playground!"\n',
  php: '<?php\necho "Hello from Aether Playground!\\n";\n'
};

const Playground = () => {
  const navigate = useNavigate();
  const { token, preferences } = useAuth();

  const handleHomeClick = () => {
    if (token) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };
  
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(BOILERPLATES.python);
  const [consoleLogs, setConsoleLogs] = useState([]); // [{ type: 'stdout'|'stderr'|'info'|'success', text }]
  const [programInput, setProgramInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState("IDLE");
  const [execTime, setExecTime] = useState(0);
  const [execMem, setExecMem] = useState("0 KB");

  const socketRef = useRef(null);

  // Set up socket connection
  useEffect(() => {
    const socketConn = io('http://localhost:3000');
    socketRef.current = socketConn;

    socketConn.on('connect', () => {
      console.log('Playground connected to socket runner.');
    });

    socketConn.on('stdout', (data) => {
      setConsoleLogs(prev => [...prev, { type: 'stdout', text: data }]);
    });

    socketConn.on('stderr', (data) => {
      setConsoleLogs(prev => [...prev, { type: 'stderr', text: data }]);
    });

    socketConn.on('status', (statusMsg) => {
      setTerminalStatus(statusMsg);
    });

    socketConn.on('exit', (data) => {
      setIsRunning(false);
      setExecTime(data.executionTime);
      setExecMem(data.memoryUsage);
      setConsoleLogs(prev => [...prev, { 
        type: 'info', 
        text: `\n[Exited: code ${data.code === null ? data.signal : data.code}]` 
      }]);
    });

    return () => {
      socketConn.disconnect();
    };
  }, []);

  const changeLanguage = (newLang) => {
    setLanguage(newLang);
    setCode(BOILERPLATES[newLang] || "");
    setConsoleLogs([]);
    setTerminalStatus("IDLE");
    setExecTime(0);
    setExecMem("0 KB");
  };

  const handleRunCode = () => {
    if (isRunning) return;
    setIsRunning(true);
    setTerminalStatus('INITIALIZING');
    setConsoleLogs([{ type: 'info', text: `[Running] sandbox environment...\n` }]);
    setExecTime(0);
    setExecMem('0 KB');

    let extension = 'py';
    if (language === 'java') extension = 'java';
    else if (language === 'c') extension = 'c';
    else if (language === 'cpp') extension = 'cpp';
    else if (language === 'go') extension = 'go';
    else if (language === 'rust') extension = 'rs';
    else if (language === 'typescript') extension = 'ts';
    else if (language === 'javascript') extension = 'js';

    const filename = language === 'java' ? 'Main.java' : `main.${extension}`;

    const runPayload = {
      projectId: 'playground',
      language: language === 'cpp' ? 'cpp' : language,
      entryFile: filename,
      input: programInput,
      files: [{
        _id: 'playground_code_node',
        name: filename,
        type: 'file',
        content: code
      }]
    };

    if (socketRef.current) {
      socketRef.current.emit('runCode', runPayload);
    }
  };

  const downloadProject = () => {
    let extension = "txt";
    if (language === "python") extension = "py";
    else if (language === "java") extension = "java";
    else if (language === "c") extension = "c";
    else if (language === "cpp") extension = "cpp";
    else if (language === "go") extension = "go";
    else if (language === "rust") extension = "rs";
    else if (language === "javascript") extension = "js";
    else if (language === "typescript") extension = "ts";

    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `playground_main.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentTheme = preferences?.theme || 'dark';
  let containerBg = 'bg-[#09080F] text-slate-100';
  let barBg = 'bg-[#0B0A12] border-white/5';
  let borderLine = 'border-white/5';
  let terminalBg = 'bg-black/90';

  if (currentTheme === 'light') {
    containerBg = 'bg-slate-50 text-slate-900';
    barBg = 'bg-slate-100 border-slate-200';
    borderLine = 'border-slate-200';
    terminalBg = 'bg-white text-slate-800 border-t border-slate-100';
  } else if (currentTheme === 'midnight') {
    containerBg = 'bg-midnight-bg text-slate-200';
    barBg = 'bg-midnight-bg border-midnight-border';
    borderLine = 'border-midnight-border';
    terminalBg = 'bg-slate-950';
  } else if (currentTheme === 'ocean') {
    containerBg = 'bg-ocean-bg text-slate-200';
    barBg = 'bg-ocean-bg border-ocean-border';
    borderLine = 'border-ocean-border';
    terminalBg = 'bg-black/90';
  } else if (currentTheme === 'forest') {
    containerBg = 'bg-forest-bg text-slate-200';
    barBg = 'bg-forest-bg border-forest-border';
    borderLine = 'border-forest-border';
    terminalBg = 'bg-black/90';
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden font-sans relative ${containerBg}`}>
      {/* Background radial glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/10 blur-[140px] pointer-events-none" />

      {/* Header bar */}
      <header className={`h-[56px] border-b flex justify-between items-center px-6 shrink-0 relative z-10 ${barBg}`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleHomeClick} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer"
          >
            <FiArrowLeft /> Home
          </button>
          
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg">
              Ω
            </div>
            <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
              AETHER PLAYGROUND
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <select
            onChange={(e) => changeLanguage(e.target.value)}
            value={language}
            className={`px-3 py-1.5 rounded-xl text-xs outline-none cursor-pointer font-bold border transition ${currentTheme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-white/5 text-slate-300'}`}
          >
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="r">R Language</option>
            <option value="ruby">Ruby</option>
            <option value="php">PHP</option>
          </select>

          <button 
            onClick={downloadProject}
            className={`p-2 rounded-lg border text-sm transition cursor-pointer ${currentTheme === 'light' ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-white/5 text-slate-300 hover:bg-white/5'}`}
            title="Download Code"
          >
            <FiDownload />
          </button>

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-600/10"
          >
            <FiPlay className={isRunning ? 'animate-spin' : ''} /> {isRunning ? 'Running' : 'Run Code'}
          </button>
        </div>
      </header>

      {/* Main split grid */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Left pane: Monaco Editor */}
        <div className="w-1/2 h-full flex flex-col overflow-hidden relative">
          <div className={`h-[38px] border-b flex items-center px-4 justify-between shrink-0 ${barBg}`}>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              {language === 'cpp' ? 'C++' : language} sandbox mode
            </span>
          </div>

          <div className="flex-1 relative bg-slate-950/20">
            <Editor
              onChange={(value) => setCode(value || "")}
              height="100%"
              theme={currentTheme === 'light' ? 'vs-light' : 'vs-dark'}
              language={language === 'cpp' ? 'cpp' : language}
              value={code}
              options={{
                fontSize: preferences?.fontSize || 14,
                fontFamily: preferences?.fontFamily || 'Fira Code',
                tabSize: preferences?.tabSize || 4,
                minimap: { enabled: false },
                wordWrap: 'on',
                automaticLayout: true
              }}
            />
          </div>
        </div>

        {/* Right pane: Console & Inputs */}
        <div className={`w-1/2 h-full border-l flex flex-col overflow-hidden ${borderLine}`}>
          
          {/* Top segment: Standard inputs */}
          <div className={`p-4 border-b flex flex-col gap-2 shrink-0 ${barBg}`}>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Program Standard Input (Stdin)
            </label>
            <textarea
              value={programInput}
              onChange={(e) => setProgramInput(e.target.value)}
              placeholder="Enter inputs here (one per line) to feed into stdin..."
              className={`w-full h-[80px] p-3 text-xs rounded-xl outline-none font-mono resize-none transition focus:border-purple-500/30 ${currentTheme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/80 border-white/5 text-slate-300'}`}
            />
          </div>

          {/* Console outputs area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Console Header */}
            <div className={`p-3 border-b flex justify-between items-center shrink-0 ${barBg}`}>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1">
                  <FiTerminal /> Console Workspace
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${terminalStatus.includes('exited') || terminalStatus.includes('IDLE') ? (currentTheme === 'light' ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-neutral-800 text-slate-400 border-transparent') : (currentTheme === 'light' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-purple-500/10 text-purple-300 animate-pulse border border-purple-500/20')}`}>
                  {terminalStatus}
                </span>
              </div>

              <div className="flex gap-4 text-[10px] text-slate-500 font-bold items-center">
                <span>TIME: {execTime}ms</span>
                <span>MEM: {execMem}</span>
                {consoleLogs.length > 0 && (
                  <button 
                    onClick={() => setConsoleLogs([])}
                    className="p-1 hover:text-red-400 transition"
                    title="Clear console"
                  >
                    <FiXCircle />
                  </button>
                )}
              </div>
            </div>

            {/* Terminal logs stream output */}
            <div className={`flex-1 p-4 font-mono text-xs overflow-auto select-text ${terminalBg}`}>
              {consoleLogs.length === 0 ? (
                <span className="text-slate-600 block italic">No console logs to display. Select language, write code, and click &quot;Run Code&quot;.</span>
              ) : (
                consoleLogs.map((log, index) => {
                  let logColor = currentTheme === 'light' ? 'text-slate-800' : 'text-slate-300';
                  if (log.type === 'stderr') {
                    logColor = currentTheme === 'light' ? 'text-red-600 font-medium' : 'text-rose-400';
                  } else if (log.type === 'info') {
                    logColor = currentTheme === 'light' ? 'text-purple-700 font-bold' : 'text-purple-400 font-semibold';
                  } else if (log.type === 'success') {
                    logColor = currentTheme === 'light' ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-semibold';
                  }
                  
                  return (
                    <span key={index} className={`whitespace-pre-wrap leading-relaxed ${logColor}`}>
                      {log.text}
                    </span>
                  );
                })
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Playground;
