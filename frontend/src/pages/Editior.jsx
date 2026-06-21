import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import io from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import JSZip from 'jszip';
import { 
  FiFolder, FiFolderPlus, FiFilePlus, FiPlay, FiShare2, FiSettings, 
  FiFile, FiTrash2, FiEdit2, FiX, 
  FiChevronDown, FiChevronRight, FiChevronLeft, FiCopy,
  FiBookmark, FiCornerDownRight, FiTerminal
} from 'react-icons/fi';

const Editior = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { token, isGuest, preferences, updatePreferences } = useAuth();
  const isLight = preferences?.theme === 'light';

  // Project state
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  
  // Tabs & active file state
  const [tabs, setTabs] = useState([]); // [{ _id, name, content, isPinned, isUnsaved }]
  const [activeTabId, setActiveTabId] = useState(null);

  // Layout widths / heights (persistent resizing)
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [consoleHeight, setConsoleHeight] = useState(220);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [consoleOpen, setConsoleOpen] = useState(true);

  // File explorer tree states
  const [expandedFolders, setExpandedFolders] = useState({}); // { folderId: boolean }
  const [editingFileId, setEditingFileId] = useState(null);
  const [editingName, setEditingName] = useState('');
  
  // Right-click context menus
  const [contextMenu, setContextMenu] = useState(null); // { x, y, nodeId, isFolder }
  const [showCreateModal, setShowCreateModal] = useState(false); // { parentId, type }
  const [createName, setCreateName] = useState('');

  // Socket run terminal states
  const [socket, setSocket] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState('IDLE');
  const [consoleLogs, setConsoleLogs] = useState([]); // [{ type: 'stdout'|'stderr'|'info'|'success', text }]
  const [programInput, setProgramInput] = useState('');
  
  // Execution stats
  const [execTime, setExecTime] = useState(0);
  const [execMem, setExecMem] = useState('0 KB');

  // Sharing states
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');

  // Settings states
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Read-only project view (incognito share link)
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Load project & files tree
  const loadProject = useCallback(async () => {
    try {
      // Check if it's a shared link first
      const pathParts = window.location.pathname.split('/');
      const isSharedView = pathParts.includes('shared');

      if (isSharedView) {
        setIsReadOnly(true);
        const tokenVal = pathParts[pathParts.length - 1];
        const res = await api.get(`/projects/shared/${tokenVal}`);
        if (res.data.success) {
          setProject(res.data.project);
          setFiles(res.data.files);
          // Auto expand root items
          const rootFolders = res.data.files.filter(f => f.type === 'folder' && !f.parentId);
          const expanded = {};
          rootFolders.forEach(f => { expanded[f._id] = true; });
          setExpandedFolders(expanded);
        }
      } else if (isGuest) {
        // Load Guest Mode from localStorage
        const localProjs = localStorage.getItem('aether_guest_projects');
        const list = localProjs ? JSON.parse(localProjs) : [];
        const found = list.find(p => p._id === projectId);
        if (found) {
          setProject(found);
          const localFiles = localStorage.getItem(`aether_guest_files_${projectId}`);
          const fileList = localFiles ? JSON.parse(localFiles) : [];
          setFiles(fileList);

          // Auto expand root items
          const rootFolders = fileList.filter(f => f.type === 'folder' && !f.parentId);
          const expanded = {};
          rootFolders.forEach(f => { expanded[f._id] = true; });
          setExpandedFolders(expanded);
        } else {
          alert("Guest project not found!");
          navigate('/dashboard');
        }
      } else {
        // Load DB Project
        const res = await api.get(`/projects/${projectId}`);
        if (res.data.success) {
          setProject(res.data.project);
          setFiles(res.data.files);

          // Auto expand root items
          const rootFolders = res.data.files.filter(f => f.type === 'folder' && !f.parentId);
          const expanded = {};
          rootFolders.forEach(f => { expanded[f._id] = true; });
          setExpandedFolders(expanded);
        } else {
          alert(res.data.message);
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error("Load project failed:", err.message);
      navigate('/dashboard');
    }
  }, [projectId, isGuest, navigate]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Connect Socket.IO
  useEffect(() => {
    const socketConn = io('http://localhost:3000');
    setSocket(socketConn);

    socketConn.on('connect', () => {
      console.log('Connected to socket console gateway.');
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

  // Save File Helper
  const saveFileContent = useCallback(async (fileId, content) => {
    try {
      if (isGuest) {
        // Save guest file locally
        const localFiles = localStorage.getItem(`aether_guest_files_${projectId}`);
        const list = localFiles ? JSON.parse(localFiles) : [];
        const idx = list.findIndex(f => f._id === fileId);
        if (idx !== -1) {
          list[idx].content = content;
          localStorage.setItem(`aether_guest_files_${projectId}`, JSON.stringify(list));
          
          // Clear tab unsaved indicator
          setTabs(prev => prev.map(t => t._id === fileId ? { ...t, isUnsaved: false } : t));
        }
      } else {
        // Save to DB
        await api.put(`/files/${fileId}`, { content });
        setTabs(prev => prev.map(t => t._id === fileId ? { ...t, isUnsaved: false } : t));
      }
    } catch (err) {
      console.error("Save file error:", err.message);
    }
  }, [projectId, isGuest]);

  // Handle auto-save
  useEffect(() => {
    if (!preferences.autoSave || isReadOnly) return;
    const interval = setInterval(() => {
      const unsaved = tabs.filter(t => t.isUnsaved);
      unsaved.forEach(async (tab) => {
        await saveFileContent(tab._id, tab.content);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [tabs, preferences.autoSave, isReadOnly, saveFileContent]);

  // Run Code Command
  const handleRunCode = useCallback(() => {
    if (isRunning || !project) return;
    setIsRunning(true);
    setTerminalStatus('INITIALIZING');
    setConsoleLogs([{ type: 'info', text: `[Running] sandbox environment...\n` }]);
    setExecTime(0);
    setExecMem('0 KB');

    // Compile tree details
    const filesData = files.map(f => ({
      _id: f._id,
      projectId: f.projectId,
      name: f.name,
      type: f.type,
      parentId: f.parentId,
      content: tabs.find(t => t._id === f._id)?.content || f.content
    }));

    const activeTab = tabs.find(t => t._id === activeTabId);
    let lang = 'javascript';
    if (activeTab) {
      const name = activeTab.name.toLowerCase();
      if (name.endsWith('.py')) lang = 'python';
      else if (name.endsWith('.java')) lang = 'java';
      else if (name.endsWith('.c')) lang = 'c';
      else if (name.endsWith('.cpp') || name.endsWith('.cc') || name.endsWith('.cxx')) lang = 'cpp';
      else if (name.endsWith('.rs')) lang = 'rust';
      else if (name.endsWith('.go')) lang = 'go';
      else if (name.endsWith('.ts')) lang = 'typescript';
      else if (name.endsWith('.js')) lang = 'javascript';
    } else if (project) {
      lang = project.title.toLowerCase().includes('python') ? 'python' : 
             project.title.toLowerCase().includes('java') ? 'java' :
             project.title.toLowerCase().includes('c++') ? 'cpp' :
             project.title.toLowerCase().includes('rust') ? 'rust' :
             project.title.toLowerCase().includes('go') ? 'go' : 'javascript';
    }

    const runPayload = {
      projectId: project._id,
      language: lang,
      entryFile: activeTab ? activeTab.name : "",
      token,
      input: programInput
    };

    if (isGuest) {
      runPayload.files = filesData;
    }

    if (socket) {
      socket.emit('runCode', runPayload);
    }
  }, [isRunning, project, files, tabs, activeTabId, token, programInput, socket, isGuest]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleShortcuts = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const activeTab = tabs.find(t => t._id === activeTabId);
        if (activeTab && activeTab.isUnsaved) {
          saveFileContent(activeTab._id, activeTab.content);
        }
      }
      // Ctrl/Cmd + Enter to run code
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
    };

    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [tabs, activeTabId, saveFileContent, handleRunCode]);

  // Open file in tab
  const openFile = (file) => {
    const tabExists = tabs.find(t => t._id === file._id);
    if (!tabExists) {
      setTabs(prev => [...prev, { 
        _id: file._id, 
        name: file.name, 
        content: file.content, 
        isPinned: false, 
        isUnsaved: false 
      }]);
    }
    setActiveTabId(file._id);
  };

  // Close file tab
  const closeTab = (fileId, e) => {
    e?.stopPropagation();
    const tabToClose = tabs.find(t => t._id === fileId);
    
    if (tabToClose?.isUnsaved && !isReadOnly) {
      if (!window.confirm("Save unsaved changes before closing?")) {
        // continue without saving
      } else {
        saveFileContent(tabToClose._id, tabToClose.content);
      }
    }

    const filtered = tabs.filter(t => t._id !== fileId);
    setTabs(filtered);

    if (activeTabId === fileId) {
      if (filtered.length > 0) {
        setActiveTabId(filtered[filtered.length - 1]._id);
      } else {
        setActiveTabId(null);
      }
    }
  };

  // Pin file tab
  const pinTab = (fileId, e) => {
    e.stopPropagation();
    setTabs(prev => prev.map(t => t._id === fileId ? { ...t, isPinned: !t.isPinned } : t));
  };

  // Virtual file tree structures node creations
  const handleCreateNode = async (e) => {
    e.preventDefault();
    if (!createName) return;

    try {
      if (isGuest) {
        const newNodeId = 'file_' + Math.random().toString(36).substring(2, 15);
        const newNode = {
          _id: newNodeId,
          projectId,
          name: createName,
          type: showCreateModal.type,
          parentId: showCreateModal.parentId || null,
          content: ''
        };

        const updated = [...files, newNode];
        setFiles(updated);
        localStorage.setItem(`aether_guest_files_${projectId}`, JSON.stringify(updated));
        
        if (newNode.type === 'file') {
          openFile(newNode);
        }
      } else {
        const res = await api.post('/files', {
          projectId,
          name: createName,
          type: showCreateModal.type,
          parentId: showCreateModal.parentId || null
        });
        if (res.data.success) {
          setFiles(prev => [...prev, res.data.file]);
          if (res.data.file.type === 'file') {
            openFile(res.data.file);
          }
        } else {
          alert(res.data.message);
        }
      }
      setShowCreateModal(false);
      setCreateName('');
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating item');
    }
  };

  // Node deletions
  const handleDeleteNode = async (nodeId, isFolder) => {
    if (!window.confirm(`Are you sure you want to delete this ${isFolder ? 'folder' : 'file'}?`)) return;
    try {
      if (isGuest) {
        let updated = [...files];
        const recursiveFilter = (parentValId) => {
          const children = updated.filter(f => f.parentId === parentValId);
          children.forEach(child => {
            if (child.type === 'folder') {
              recursiveFilter(child._id);
            }
            updated = updated.filter(f => f._id !== child._id);
          });
        };

        if (isFolder) {
          recursiveFilter(nodeId);
        }
        updated = updated.filter(f => f._id !== nodeId);

        setFiles(updated);
        localStorage.setItem(`aether_guest_files_${projectId}`, JSON.stringify(updated));
        
        // Remove from active tabs
        setTabs(prev => prev.filter(t => t._id !== nodeId));
      } else {
        await api.delete(`/files/${nodeId}`);
        setFiles(prev => prev.filter(f => f._id !== nodeId));
        setTabs(prev => prev.filter(t => t._id !== nodeId));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Node duplication
  const handleDuplicateNode = async (nodeId) => {
    try {
      if (isGuest) {
        const fileNode = files.find(f => f._id === nodeId);
        if (!fileNode) return;
        const newId = 'file_' + Math.random().toString(36).substring(2, 15);
        const duplicated = {
          ...fileNode,
          _id: newId,
          name: `${fileNode.name.split('.')[0]}_copy.${fileNode.name.split('.').slice(1).join('.') || 'txt'}`,
        };
        const updated = [...files, duplicated];
        setFiles(updated);
        localStorage.setItem(`aether_guest_files_${projectId}`, JSON.stringify(updated));
        openFile(duplicated);
      } else {
        const res = await api.post(`/files/${nodeId}/duplicate`);
        if (res.data.success) {
          setFiles(prev => [...prev, res.data.file]);
          openFile(res.data.file);
        }
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Trigger Node renaming inline
  const startRenameNode = (nodeId, currentName) => {
    setEditingFileId(nodeId);
    setEditingName(currentName);
  };

  const handleRenameSubmit = async (nodeId) => {
    if (!editingName) return;
    try {
      if (isGuest) {
        const updated = files.map(f => f._id === nodeId ? { ...f, name: editingName } : f);
        setFiles(updated);
        localStorage.setItem(`aether_guest_files_${projectId}`, JSON.stringify(updated));
        setTabs(prev => prev.map(t => t._id === nodeId ? { ...t, name: editingName } : t));
      } else {
        await api.put(`/files/${nodeId}`, { name: editingName });
        setFiles(prev => prev.map(f => f._id === nodeId ? { ...f, name: editingName } : f));
        setTabs(prev => prev.map(t => t._id === nodeId ? { ...t, name: editingName } : t));
      }
      setEditingFileId(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Rename error');
    }
  };

  // ZIP download helper
  const handleZipDownload = async () => {
    const zip = new JSZip();
    
    // Create folders & files inside ZIP
    const filesMap = new Map();
    files.forEach(f => filesMap.set(f._id.toString(), f));

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

    files.filter(f => f.type === 'file').forEach(file => {
      const relPath = getRelativePath(file);
      zip.file(relPath, file.content || "");
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}_workspace.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Share project link generator
  const handleGenerateShare = async () => {
    try {
      const res = await api.post(`/projects/${projectId}/share`, { enable: true });
      if (res.data.success) {
        setProject(res.data.project);
        setShareLink(`${window.location.origin}/editor/shared/${res.data.project.shareToken}`);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleDisableShare = async () => {
    try {
      const res = await api.post(`/projects/${projectId}/share`, { enable: false });
      if (res.data.success) {
        setProject(res.data.project);
        setShareLink('');
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  // Draggable sidebar panels helpers
  const handleSidebarMouseDown = () => {
    const handleMouseMove = (e) => {
      if (e.clientX > 150 && e.clientX < 500) {
        setSidebarWidth(e.clientX);
      }
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleConsoleMouseDown = () => {
    const handleMouseMove = (e) => {
      const height = window.innerHeight - e.clientY;
      if (height > 100 && height < 500) {
        setConsoleHeight(height);
      }
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Render Files Tree Helper
  const renderTree = (parentId = null, depth = 0) => {
    const list = files.filter(f => f.parentId === parentId);
    
    // Sort directories first
    list.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });

    return list.map(node => {
      const isFolder = node.type === 'folder';
      const isExpanded = expandedFolders[node._id];
      const isEditing = editingFileId === node._id;

      return (
        <div key={node._id} className="select-none font-sans">
          <div 
            onClick={() => {
              if (isFolder) {
                setExpandedFolders(prev => ({ ...prev, [node._id]: !prev[node._id] }));
              } else {
                openFile(node);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                nodeId: node._id,
                isFolder
              });
            }}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className={`flex items-center justify-between py-1 px-2 rounded-lg cursor-pointer transition text-xs ${activeTabId === node._id ? (isLight ? 'bg-purple-500/10 text-purple-700 font-semibold' : 'bg-purple-500/10 text-purple-300') : (isLight ? 'hover:bg-black/[0.04] text-slate-700' : 'hover:bg-white/[0.02] text-slate-400')}`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className={`${isLight ? 'text-slate-600' : 'text-slate-500'} shrink-0`}>
                {isFolder ? (isExpanded ? <FiChevronDown /> : <FiChevronRight />) : <FiFile />}
              </span>
              <span className="shrink-0 text-sm">
                {isFolder ? <FiFolder className={isLight ? 'text-indigo-600' : 'text-indigo-400'} /> : <FiFile className={isLight ? 'text-slate-500' : 'text-slate-400'} />}
              </span>
              
              {isEditing ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleRenameSubmit(node._id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit(node._id)}
                  autoFocus
                  className={`rounded px-1.5 py-0.5 outline-none text-xs w-full ${isLight ? 'bg-white border border-slate-300 text-slate-900' : 'bg-slate-900 border border-purple-500/50 text-white'}`}
                />
              ) : (
                <span className="truncate pr-2">{node.name}</span>
              )}
            </div>

            {/* Quick folder action buttons */}
            {isFolder && !isReadOnly && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 items-center">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowCreateModal({ parentId: node._id, type: 'file' }); }} 
                  className="p-1 hover:text-white"
                >
                  <FiFilePlus />
                </button>
              </div>
            )}
          </div>

          {isFolder && isExpanded && (
            <div className="relative">
              {renderTree(node._id, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Get active tab content
  const activeTab = tabs.find(t => t._id === activeTabId);

  // Define dynamic style tokens for Theme selections
  const currentTheme = preferences.theme || 'dark';
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
    <div className={`h-screen flex flex-col overflow-hidden font-sans select-none ${containerBg} transition-colors duration-300`}>
      {/* Context Menu overlay listener */}
      {contextMenu && (
        <div 
          className="fixed inset-0 z-50 cursor-default"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
        >
          <div 
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className={`absolute w-36 rounded-xl border shadow-2xl overflow-hidden font-sans ${currentTheme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/95 border-white/10 text-slate-200'}`}
          >
            {contextMenu.isFolder && !isReadOnly && (
              <>
                <button
                  onClick={() => { setShowCreateModal({ parentId: contextMenu.nodeId, type: 'file' }); setContextMenu(null); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition ${currentTheme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}
                >
                  <FiFilePlus /> New File
                </button>
                <button
                  onClick={() => { setShowCreateModal({ parentId: contextMenu.nodeId, type: 'folder' }); setContextMenu(null); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition ${currentTheme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}
                >
                  <FiFolderPlus /> New Folder
                </button>
                <hr className={`border-t ${borderLine}`} />
              </>
            )}
            {!isReadOnly && (
              <>
                <button
                  onClick={() => { startRenameNode(contextMenu.nodeId, files.find(f => f._id === contextMenu.nodeId)?.name); setContextMenu(null); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition ${currentTheme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}
                >
                  <FiEdit2 /> Rename
                </button>
                {!contextMenu.isFolder && (
                  <button
                    onClick={() => { handleDuplicateNode(contextMenu.nodeId); setContextMenu(null); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition ${currentTheme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}
                  >
                    <FiCopy /> Duplicate
                  </button>
                )}
                <hr className={`border-t ${borderLine}`} />
                <button
                  onClick={() => { handleDeleteNode(contextMenu.nodeId, contextMenu.isFolder); setContextMenu(null); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-red-400 transition ${currentTheme === 'light' ? 'hover:bg-red-50' : 'hover:bg-red-950/15'}`}
                >
                  <FiTrash2 /> Delete
                </button>
              </>
            )}
            {isReadOnly && (
              <div className="p-2.5 text-[10px] text-slate-500 font-bold text-center">READ ONLY VIEW</div>
            )}
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className={`h-[56px] border-b flex justify-between items-center px-4 shrink-0 ${barBg}`}>
        <div className="flex items-center gap-3">
          <div 
            onClick={() => navigate('/dashboard')}
            className="h-7 w-7 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg cursor-pointer"
          >
            Ω
          </div>
          <div className="flex flex-col">
            <span className={`font-bold text-xs leading-none bg-clip-text text-transparent bg-gradient-to-r ${isLight ? 'from-purple-600 to-indigo-500' : 'from-purple-400 to-indigo-300'}`}>AETHER IDE</span>
            <span className={`text-[10px] mt-0.5 max-w-[150px] truncate ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>{project?.title || 'Sandbox Studio'}</span>
          </div>
        </div>

        {/* Compile/Run controls */}
        <div className="flex items-center gap-3">
          {!isReadOnly && (
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-600/10"
            >
              <FiPlay className={isRunning ? 'animate-spin' : ''} /> {isRunning ? 'Running' : 'Run Code'}
            </button>
          )}

          {!isReadOnly && (
            <button
              onClick={() => {
                if (isGuest) {
                  alert("Please log in or register to enable public project sharing links.");
                  return;
                }
                setShowShareModal(true);
              }}
              className={`p-2 rounded-lg border text-sm transition cursor-pointer ${currentTheme === 'light' ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-white/5 text-slate-300 hover:bg-white/5'}`}
              title="Share Link"
            >
              <FiShare2 />
            </button>
          )}

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-lg border text-sm transition cursor-pointer ${currentTheme === 'light' ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-white/5 text-slate-300 hover:bg-white/5'} ${!sidebarOpen ? 'text-purple-400 border-purple-500/30 bg-purple-500/5' : ''}`}
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {sidebarOpen ? <FiChevronLeft /> : <FiChevronRight />}
          </button>

          <button
            onClick={() => setConsoleOpen(!consoleOpen)}
            className={`p-2 rounded-lg border text-sm transition cursor-pointer ${currentTheme === 'light' ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-white/5 text-slate-300 hover:bg-white/5'} ${consoleOpen ? 'text-purple-400 border-purple-500/30 bg-purple-500/5' : ''}`}
            title={consoleOpen ? "Collapse Console" : "Expand Console"}
          >
            <FiTerminal />
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className={`p-2 rounded-lg border text-sm transition cursor-pointer ${currentTheme === 'light' ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-white/5 text-slate-300 hover:bg-white/5'}`}
            title="Settings"
          >
            <FiSettings />
          </button>
        </div>
      </header>

      {/* Main split container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Explorer sidebar */}
        {sidebarOpen && (
          <aside 
            style={{ width: `${sidebarWidth}px` }} 
            className={`flex flex-col border-r h-full relative shrink-0 ${barBg}`}
          >
            <div className={`p-3 border-b flex justify-between items-center ${borderLine}`}>
              <span className={`text-[10px] uppercase tracking-widest font-bold ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Project Explorer</span>
              <div className="flex items-center gap-1.5">
                {!isReadOnly && (
                  <>
                    <button 
                      onClick={() => setShowCreateModal({ parentId: null, type: 'file' })}
                      className={`p-1 transition ${isLight ? 'text-slate-600 hover:text-purple-600' : 'text-slate-400 hover:text-purple-300'}`}
                      title="New File"
                    >
                      <FiFilePlus />
                    </button>
                    <button 
                      onClick={() => setShowCreateModal({ parentId: null, type: 'folder' })}
                      className={`p-1 transition ${isLight ? 'text-slate-600 hover:text-purple-600' : 'text-slate-400 hover:text-purple-300'}`}
                      title="New Folder"
                    >
                      <FiFolderPlus />
                    </button>
                  </>
                )}
                <button 
                  onClick={handleZipDownload}
                  className={`p-1 transition ${isLight ? 'text-slate-600 hover:text-purple-600' : 'text-slate-400 hover:text-purple-300'}`}
                  title="Export ZIP"
                >
                  <FiCornerDownRight />
                </button>
              </div>
            </div>

            {/* Tree View container */}
            <div className="flex-1 overflow-auto p-2 space-y-1">
              {files.length === 0 ? (
                <div className="p-4 text-center text-[10px] text-slate-600 font-bold uppercase tracking-wider">Empty Workspace</div>
              ) : (
                renderTree(null)
              )}
            </div>

            {/* Vertical resize handle bar */}
            <div 
              onMouseDown={handleSidebarMouseDown}
              className="absolute top-0 right-0 w-[4px] h-full hover:bg-purple-500/50 resize-h-line transition"
            />
          </aside>
        )}

        {/* Middle workspace: Editor + Console split */}
        <section className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Active Tabs panel */}
          <div className={`h-[38px] border-b flex items-center px-2 overflow-x-auto gap-1 shrink-0 ${barBg}`}>
            {tabs.map((tab) => (
              <div
                key={tab._id}
                onClick={() => setActiveTabId(tab._id)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition shrink-0 border ${activeTabId === tab._id ? (currentTheme === 'light' ? 'bg-white border-slate-200 text-purple-600 shadow-sm' : 'bg-purple-500/10 border-purple-500/25 text-purple-300') : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                <button 
                  onClick={(e) => pinTab(tab._id, e)}
                  className={`p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition text-[10px] shrink-0 ${tab.isPinned ? 'opacity-100 text-purple-400' : 'text-slate-500 hover:text-purple-400'}`}
                  title={tab.isPinned ? "Unpin Tab" : "Pin Tab"}
                >
                  <FiBookmark className={tab.isPinned ? "fill-purple-400" : ""} />
                </button>
                <span className="truncate max-w-[90px]">{tab.name}</span>
                {tab.isUnsaved && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />}
                <button 
                  onClick={(e) => closeTab(tab._id, e)}
                  className="p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition text-[10px] shrink-0"
                >
                  <FiX />
                </button>
              </div>
            ))}
            {tabs.length === 0 && (
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider pl-2">No active documents</span>
            )}
          </div>

          {/* Monaco Editor Pane */}
          <div className="flex-1 bg-slate-900/10 relative">
            {activeTab ? (
              <Editor
                height="100%"
                language={activeTab.name.toLowerCase().endsWith('.py') ? 'python' : 
                          activeTab.name.toLowerCase().endsWith('.java') ? 'java' :
                          activeTab.name.toLowerCase().endsWith('.c') ? 'c' :
                          activeTab.name.toLowerCase().endsWith('.cpp') ? 'cpp' :
                          activeTab.name.toLowerCase().endsWith('.ts') ? 'typescript' :
                          activeTab.name.toLowerCase().endsWith('.go') ? 'go' : 
                          activeTab.name.toLowerCase().endsWith('.rs') ? 'rust' : 
                          activeTab.name.toLowerCase().endsWith('.r') ? 'r' : 
                          activeTab.name.toLowerCase().endsWith('.rb') ? 'ruby' : 
                          activeTab.name.toLowerCase().endsWith('.php') ? 'php' : 'javascript'}
                value={activeTab.content}
                theme={currentTheme === 'light' ? 'vs-light' : 'vs-dark'}
                onChange={(value) => {
                  if (isReadOnly) return;
                  setTabs(prev => prev.map(t => t._id === activeTabId ? { ...t, content: value, isUnsaved: true } : t));
                }}
                options={{
                  fontSize: preferences.fontSize || 14,
                  fontFamily: preferences.fontFamily || 'Fira Code',
                  tabSize: preferences.tabSize || 4,
                  lineNumbers: preferences.lineNumbers || 'on',
                  minimap: { enabled: preferences.minimap !== false },
                  cursorStyle: preferences.cursorStyle || 'line',
                  wordWrap: preferences.wordWrap || 'off',
                  automaticLayout: true,
                  readOnly: isReadOnly
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <div>
                  <FiFile className="text-4xl text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-500">Select a file from the explorer to begin editing.</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Console Panel */}
          {consoleOpen && (
            <div 
              style={{ height: `${consoleHeight}px` }}
              className={`border-t flex flex-col overflow-hidden relative shrink-0 ${barBg}`}
            >
              {/* Horizontal resize handle */}
              <div 
                onMouseDown={handleConsoleMouseDown}
                className="absolute top-0 left-0 w-full h-[4px] hover:bg-purple-500/50 resize-v-line transition"
              />

              {/* Console header */}
              <div className={`p-3 pt-4 border-b flex justify-between items-center ${borderLine}`}>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] uppercase tracking-widest font-bold flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                    <FiTerminal /> Console Workspace
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${terminalStatus.includes('exited') || terminalStatus.includes('IDLE') ? (isLight ? 'bg-slate-200 text-slate-600' : 'bg-neutral-800 text-slate-400') : (isLight ? 'bg-purple-500/10 text-purple-600 border border-purple-500/25 animate-pulse' : 'bg-purple-500/10 text-purple-300 animate-pulse border border-purple-500/20')}`}>
                    {terminalStatus}
                  </span>
                </div>
                {/* Stats indicators */}
                <div className={`flex gap-4 text-[10px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                  <span>TIME: {execTime}ms</span>
                  <span>MEM: {execMem}</span>
                </div>
              </div>

              {/* Console splits: Inputs + Console Logs */}
              <div className="flex-1 flex overflow-hidden">
                {/* Inputs area */}
                <div className={`w-48 border-r p-3 flex flex-col ${borderLine}`}>
                  <span className={`text-[10px] uppercase font-bold mb-2 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Program Input</span>
                  <textarea
                    value={programInput}
                    onChange={(e) => setProgramInput(e.target.value)}
                    placeholder="Provide standard input..."
                    disabled={isReadOnly}
                    className={`flex-1 p-2 rounded-lg border outline-none text-xs resize-none font-mono ${currentTheme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-white/5 text-slate-300'}`}
                  />
                </div>

                {/* Stream Console Logs */}
                <div className={`flex-1 p-3 font-mono text-xs overflow-auto ${terminalBg}`}>
                  {consoleLogs.map((log, idx) => {
                    let logColor = currentTheme === 'light' ? 'text-slate-800' : 'text-slate-300';
                    if (log.type === 'stderr') logColor = currentTheme === 'light' ? 'text-red-600 font-medium' : 'text-red-400';
                    else if (log.type === 'info') logColor = currentTheme === 'light' ? 'text-purple-700 font-bold' : 'text-indigo-400';
                    return (
                      <span 
                        key={idx} 
                        className={`whitespace-pre-wrap ${logColor}`}
                      >
                        {log.text}
                      </span>
                    );
                  })}
                  {consoleLogs.length === 0 && (
                    <div className="text-slate-600 font-bold uppercase tracking-wider text-center pt-8">No terminal logs</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-6 rounded-2xl border shadow-2xl relative fade-in ${currentTheme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'glass border-white/10 text-slate-100'}`}>
            <h3 className={`text-xl font-bold mb-1 ${currentTheme === 'light' ? 'text-slate-950' : 'bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent'}`}>Editor Preferences</h3>
            <p className="text-slate-500 text-xs mb-6">Customize editor parameters & themes</p>

            <div className="space-y-4">
              {/* Theme toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Workspace Theme</label>
                <select
                  value={preferences.theme}
                  onChange={(e) => updatePreferences({ theme: e.target.value })}
                  className={`w-full px-4 py-2 rounded-xl text-xs outline-none border transition ${currentTheme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-white/5 text-slate-300'}`}
                >
                  <option value="dark">Aether Dark (Obsidian)</option>
                  <option value="light">Aether Light (Cream)</option>
                  <option value="midnight">Aether Midnight (Deep Violet)</option>
                  <option value="ocean">Aether Ocean (Teal)</option>
                  <option value="forest">Aether Forest (Green)</option>
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Editor Font Size</label>
                <input
                  type="number"
                  value={preferences.fontSize}
                  onChange={(e) => updatePreferences({ fontSize: parseInt(e.target.value, 10) || 14 })}
                  className={`w-full px-4 py-2 rounded-xl text-xs outline-none border transition ${currentTheme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-white/5 text-slate-300'}`}
                />
              </div>

              {/* Word wrap */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Word Wrap</label>
                <select
                  value={preferences.wordWrap}
                  onChange={(e) => updatePreferences({ wordWrap: e.target.value })}
                  className={`w-full px-4 py-2 rounded-xl text-xs outline-none border transition ${currentTheme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-white/5 text-slate-300'}`}
                >
                  <option value="off">Disabled</option>
                  <option value="on">Enabled</option>
                </select>
              </div>

              {/* Minimap toggle */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-semibold text-slate-400">Minimap Preview</span>
                <input
                  type="checkbox"
                  checked={preferences.minimap}
                  onChange={(e) => updatePreferences({ minimap: e.target.checked })}
                  className="cursor-pointer border-white/5 rounded"
                />
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 mt-8 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-xs transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-6 rounded-2xl border shadow-2xl relative fade-in ${currentTheme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'glass border-white/10 text-slate-100'}`}>
            <h3 className={`text-xl font-bold mb-1 ${currentTheme === 'light' ? 'text-slate-950' : 'bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent'}`}>Share Workspace</h3>
            <p className="text-slate-500 text-xs mb-6">Generate public read-only code link</p>

            <div className="space-y-4">
              {project?.isShared ? (
                <div>
                  <div className={`p-3 mb-4 text-xs font-mono select-all border rounded-lg break-all ${currentTheme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-white/5 text-slate-300'}`}>
                    {shareLink || `${window.location.origin}/editor/shared/${project.shareToken}`}
                  </div>
                  <button
                    onClick={handleDisableShare}
                    className="w-full py-2.5 rounded-xl font-semibold bg-red-950/40 text-red-400 border border-red-900/50 transition cursor-pointer text-xs"
                  >
                    Disable Public Access
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerateShare}
                  className="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-xs transition cursor-pointer"
                >
                  Generate Share Link
                </button>
              )}
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className={`w-full py-2.5 mt-6 rounded-xl font-semibold border transition text-xs cursor-pointer ${currentTheme === 'light' ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* File Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm">
          <div className={`w-full max-w-xs p-6 rounded-2xl border shadow-2xl relative fade-in ${currentTheme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'glass border-white/10 text-slate-100'}`}>
            <h3 className={`text-base font-bold mb-4 ${currentTheme === 'light' ? 'text-slate-950' : 'bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent'}`}>
              Create New {showCreateModal.type === 'folder' ? 'Folder' : 'File'}
            </h3>
            <form onSubmit={handleCreateNode} className="space-y-4">
              <input
                type="text"
                required
                placeholder={showCreateModal.type === 'folder' ? 'src' : 'app.js'}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className={`w-full px-4 py-2 rounded-xl text-xs outline-none border transition ${currentTheme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500' : 'bg-slate-950 border-white/5 text-slate-300'}`}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateName(''); }}
                  className={`flex-1 py-2 rounded-xl font-semibold border text-xs cursor-pointer ${currentTheme === 'light' ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700' : 'bg-white/5 border-white/10'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-xs cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editior;
