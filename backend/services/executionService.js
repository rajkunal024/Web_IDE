const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const crypto = require('crypto');
const File = require('../models/File');
const ExecutionHistory = require('../models/ExecutionHistory');

// Helper to run shell command synchronously inside promise
function runCommandPromise(command, cwd, timeoutMs = 5000) {
  return new Promise((resolve) => {
    exec(command, { cwd, timeout: timeoutMs, maxBuffer: 512 * 1024 }, (error, stdout, stderr) => {
      resolve({
        error,
        stdout: stdout || "",
        stderr: stderr || "",
        code: error ? error.code : 0,
        signal: error ? error.signal : null,
        killed: error ? error.killed : false
      });
    });
  });
}

// Reconstruct project files tree on local disk under temp/
async function setupWorkspace(projectId, filesPayload) {
  const runId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  const workspacePath = path.join(__dirname, '..', 'temp', runId);
  fs.mkdirSync(workspacePath, { recursive: true });

  const files = filesPayload || await File.find({ projectId });
  const filesMap = new Map();
  files.forEach(f => filesMap.set(f._id.toString(), f));

  // Helper to walk parent path
  function getRelativePath(file) {
    let parts = [file.name];
    let curr = file;
    while (curr.parentId) {
      curr = filesMap.get(curr.parentId.toString());
      if (!curr) break;
      parts.unshift(curr.name);
    }
    return parts.join('/');
  }

  // Create folders first
  const folders = files.filter(f => f.type === 'folder');
  folders.forEach(folder => {
    const relPath = getRelativePath(folder);
    const fullPath = path.join(workspacePath, relPath);
    fs.mkdirSync(fullPath, { recursive: true });
  });

  // Create files
  const fileNodes = files.filter(f => f.type === 'file');
  fileNodes.forEach(file => {
    const relPath = getRelativePath(file);
    const fullPath = path.join(workspacePath, relPath);
    // Ensure parent dir exists (case where folders are empty/implicit)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.content || "", 'utf8');
  });

  return { workspacePath, files, runId };
}

// Clean up workspace
function cleanupWorkspace(workspacePath) {
  try {
    if (fs.existsSync(workspacePath)) {
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error("Workspace cleanup failed:", err);
  }
}

// Get resident memory size (RSS) for process on macOS
function getProcessMemory(pid) {
  return new Promise((resolve) => {
    exec(`ps -o rss= -p ${pid}`, (err, stdout) => {
      if (err || !stdout) {
        resolve(0); // in KB
      } else {
        resolve(parseInt(stdout.trim(), 10) || 0);
      }
    });
  });
}

// Run code execution with Socket.IO streaming support
async function executeCodeStream({ projectId, files: filesPayload, userId, language, entryFile, input, socket }) {
  const { workspacePath, files, runId } = await setupWorkspace(projectId, filesPayload);
  const lang = language.toLowerCase();
  
  socket.emit('status', 'Preparing execution workspace...');

  let entryFilename = entryFile || "";
  
  // Auto-detect entry file if not provided
  if (!entryFilename) {
    if (lang === 'python') entryFilename = 'main.py';
    else if (lang === 'c') entryFilename = 'main.c';
    else if (lang === 'cpp' || lang === 'c++') entryFilename = 'main.cpp';
    else if (lang === 'java') entryFilename = 'Main.java';
    else if (lang === 'javascript' || lang === 'js') entryFilename = 'index.js';
    else if (lang === 'typescript' || lang === 'ts') entryFilename = 'index.ts';
    else if (lang === 'go') entryFilename = 'main.go';
    else if (lang === 'r') entryFilename = 'main.r';
    else if (lang === 'ruby') entryFilename = 'main.rb';
    else if (lang === 'php') entryFilename = 'index.php';
    
    // Fallback search in files list if not found
    const matchingFile = files.find(f => f.type === 'file' && f.name.toLowerCase() === entryFilename.toLowerCase());
    if (!matchingFile) {
      const firstFile = files.find(f => f.type === 'file');
      entryFilename = firstFile ? firstFile.name : "";
    }
  }

  if (!entryFilename) {
    socket.emit('stderr', 'Error: No runnable files found in this project.\n');
    socket.emit('exit', { code: 1, signal: null, executionTime: 0, memoryUsage: '0 KB' });
    cleanupWorkspace(workspacePath);
    return;
  }

  let compileCmd = "";
  let runCmd = "";
  let runArgs = [];

  // Define commands for compilers
  if (lang === 'python') {
    runCmd = 'python3';
    runArgs = [entryFilename];
  } else if (lang === 'c') {
    compileCmd = `gcc ${entryFilename} -o main`;
    runCmd = './main';
  } else if (lang === 'cpp' || lang === 'c++') {
    compileCmd = `g++ ${entryFilename} -o main`;
    runCmd = './main';
  } else if (lang === 'java') {
    compileCmd = `javac ${entryFilename}`;
    // Strip extension for java run command
    const className = path.basename(entryFilename, '.java');
    runCmd = 'java';
    runArgs = [className];
  } else if (lang === 'javascript' || lang === 'js') {
    runCmd = 'node';
    runArgs = [entryFilename];
  } else if (lang === 'typescript' || lang === 'ts') {
    runCmd = 'npx';
    runArgs = ['ts-node', entryFilename];
  } else if (lang === 'go') {
    runCmd = 'go';
    runArgs = ['run', entryFilename];
  } else if (lang === 'rust') {
    const hasCargo = files.some(f => f.name === 'Cargo.toml');
    if (hasCargo) {
      runCmd = 'cargo';
      runArgs = ['run', '--quiet'];
    } else {
      compileCmd = `rustc ${entryFilename} -o main`;
      runCmd = './main';
    }
  } else if (lang === 'r') {
    runCmd = 'Rscript';
    runArgs = [entryFilename];
  } else if (lang === 'ruby') {
    runCmd = 'ruby';
    runArgs = [entryFilename];
  } else if (lang === 'php') {
    runCmd = 'php';
    runArgs = [entryFilename];
  } else {
    socket.emit('stderr', `Error: Language "${language}" is not supported yet.\n`);
    socket.emit('exit', { code: 1, signal: null, executionTime: 0, memoryUsage: '0 KB' });
    cleanupWorkspace(workspacePath);
    return;
  }

  // Handle compilation phase
  if (compileCmd) {
    socket.emit('status', 'Compiling source files...');
    const compResult = await runCommandPromise(compileCmd, workspacePath, 8000);
    
    // Check if compiler wasn't found
    if (compResult.error && (compResult.error.code === 127 || compResult.error.message.includes("not found"))) {
      socket.emit('stderr', `Compiler error: compiler was not found on this system. Please check server toolchain.\n`);
      socket.emit('exit', { code: 127, signal: null, executionTime: 0, memoryUsage: '0 KB' });
      await ExecutionHistory.create({ projectId, userId, language: lang, status: 'compile_error', executionTime: 0, memoryUsage: '0 KB' });
      cleanupWorkspace(workspacePath);
      return;
    }

    if (compResult.code !== 0) {
      socket.emit('stderr', compResult.stderr || compResult.stdout);
      socket.emit('exit', { code: compResult.code, signal: null, executionTime: 0, memoryUsage: '0 KB' });
      await ExecutionHistory.create({ projectId, userId, language: lang, status: 'compile_error', executionTime: 0, memoryUsage: '0 KB' });
      cleanupWorkspace(workspacePath);
      return;
    }
  }

  // Run/Execute phase
  socket.emit('status', 'Running program...');
  const startTime = Date.now();
  
  const child = spawn(runCmd, runArgs, {
    cwd: workspacePath,
    env: { ...process.env, PATH: process.env.PATH }
  });

  let killedByTimeout = false;
  let maxMemory = 0;

  // Set resource containment timeout (10 seconds)
  const timeoutId = setTimeout(() => {
    killedByTimeout = true;
    child.kill('SIGKILL');
  }, 10000);

  // Monitor process memory dynamically
  const memInterval = setInterval(async () => {
    if (child.pid) {
      const memKB = await getProcessMemory(child.pid);
      if (memKB > maxMemory) {
        maxMemory = memKB;
      }
    }
  }, 100);

  // Feed custom standard input if supplied
  if (input) {
    child.stdin.write(input);
    child.stdin.end();
  } else {
    child.stdin.end();
  }

  // Handle stdout stream
  child.stdout.on('data', (data) => {
    socket.emit('stdout', data.toString());
  });

  // Handle stderr stream
  child.stderr.on('data', (data) => {
    socket.emit('stderr', data.toString());
  });

  // Handle process completion
  child.on('close', async (code, signal) => {
    clearTimeout(timeoutId);
    clearInterval(memInterval);

    const endTime = Date.now();
    const elapsedMs = endTime - startTime;
    const formattedMem = maxMemory > 1024 
      ? `${(maxMemory / 1024).toFixed(1)} MB` 
      : `${maxMemory} KB`;

    let status = 'success';
    if (killedByTimeout) {
      status = 'timeout';
      socket.emit('stderr', '\n[Execution timed out (10s limit)]\n');
    } else if (code !== 0) {
      status = 'runtime_error';
    }

    socket.emit('status', `Program exited with code ${code === null ? signal : code}`);
    socket.emit('exit', {
      code: code,
      signal: signal,
      executionTime: elapsedMs,
      memoryUsage: formattedMem
    });

    // Record stats
    try {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(projectId)) {
        await ExecutionHistory.create({
          projectId,
          userId: userId || null,
          language: lang,
          status,
          executionTime: elapsedMs,
          memoryUsage: formattedMem
        });
      }
    } catch (dbErr) {
      console.error("DB stats log error:", dbErr);
    }

    cleanupWorkspace(workspacePath);
  });

  child.on('error', (err) => {
    clearTimeout(timeoutId);
    clearInterval(memInterval);
    socket.emit('stderr', `System execution error: ${err.message}\n`);
    socket.emit('exit', { code: 1, signal: null, executionTime: 0, memoryUsage: '0 KB' });
    cleanupWorkspace(workspacePath);
  });
}

module.exports = {
  executeCodeStream
};
