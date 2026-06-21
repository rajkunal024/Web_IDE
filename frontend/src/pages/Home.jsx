import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  FiFolder, FiPlus, FiStar, FiSearch, FiLogOut, 
  FiMoreVertical, FiCopy, FiTrash2, FiFileText, FiGrid, FiList, 
  FiFilter, FiCode, FiCamera
} from 'react-icons/fi';

const Home = () => {
  const navigate = useNavigate();
  const { user, logout, isGuest, preferences, updatePreferences, updateProfile, uploadAvatar } = useAuth();

  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLang, setNewLang] = useState('python');

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [profileStatus, setProfileStatus] = useState(''); // 'saving' | 'success' | 'avatar_success' | ''
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Context Menu / Options dropdown
  const [activeMenu, setActiveMenu] = useState(null); // projectId

  // Error/Success state
  const [error, setError] = useState('');

  const fetchProjects = useCallback(async () => {
    try {
      if (isGuest) {
        const local = localStorage.getItem('aether_guest_projects');
        let list = local ? JSON.parse(local) : [];
        
        // Apply search client-side
        if (search) {
          list = list.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
        }
        
        // Apply sort client-side
        list.sort((a, b) => {
          if (sort === 'alphabetical') return a.title.localeCompare(b.title);
          if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
          return new Date(b.createdAt) - new Date(a.createdAt); // newest & fallback
        });
        
        setProjects(list);
      } else {
        const res = await api.get('/projects', {
          params: { search, sort }
        });
        if (res.data.success) {
          setProjects(res.data.projects);
        }
      }
    } catch (err) {
      console.error("Error loading projects:", err.message);
    }
  }, [isGuest, search, sort]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newTitle) return;
    setError('');

    try {
      if (isGuest) {
        // Create local guest project
        const guestId = 'guest_' + Math.random().toString(36).substring(2, 15);
        const newProj = {
          _id: guestId,
          title: newTitle,
          language: newLang,
          favorite: false,
          isShared: false,
          lastOpened: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const local = localStorage.getItem('aether_guest_projects');
        const list = local ? JSON.parse(local) : [];
        list.unshift(newProj);
        localStorage.setItem('aether_guest_projects', JSON.stringify(list));

        // Create default file for guest in localStorage
        let defaultContent = 'print("Hello from Guest Mode!")\n';
        let defaultFilename = 'main.py';
        const lang = newLang.toLowerCase();
        if (lang === 'c') {
          defaultFilename = 'main.c';
          defaultContent = '#include <stdio.h>\n\nint main() {\n    printf("Hello from Guest!\\n");\n    return 0;\n}\n';
        } else if (lang === 'cpp' || lang === 'c++') {
          defaultFilename = 'main.cpp';
          defaultContent = '#include <iostream>\n\nint main() {\n    std::cout << "Hello from Guest C++!" << std::endl;\n    return 0;\n}\n';
        } else if (lang === 'java') {
          defaultFilename = 'Main.java';
          defaultContent = 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Guest Java!");\n    }\n}\n';
        } else if (lang === 'javascript' || lang === 'js') {
          defaultFilename = 'index.js';
          defaultContent = 'console.log("Hello from Guest JS!");\n';
        } else if (lang === 'typescript' || lang === 'ts') {
          defaultFilename = 'index.ts';
          defaultContent = 'console.log("Hello from Guest TS!");\n';
        } else if (lang === 'go') {
          defaultFilename = 'main.go';
          defaultContent = 'package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello from Guest Go!")\n}\n';
        } else if (lang === 'rust') {
          defaultFilename = 'main.rs';
          defaultContent = 'fn main() {\n    println!("Hello from Guest Rust!");\n}\n';
        } else if (lang === 'r') {
          defaultFilename = 'main.r';
          defaultContent = 'cat("Hello from Guest R!\\n")\n';
        } else if (lang === 'ruby') {
          defaultFilename = 'main.rb';
          defaultContent = 'puts "Hello from Guest Ruby!"\n';
        } else if (lang === 'php') {
          defaultFilename = 'index.php';
          defaultContent = '<?php\necho "Hello from Guest PHP!\\n";\n';
        }

        const newFile = {
          _id: 'file_' + Math.random().toString(36).substring(2, 15),
          projectId: guestId,
          name: defaultFilename,
          type: 'file',
          parentId: null,
          content: defaultContent
        };
        
        localStorage.setItem(`aether_guest_files_${guestId}`, JSON.stringify([newFile]));

        setShowCreateModal(false);
        setNewTitle('');
        navigate(`/editor/${guestId}`);
      } else {
        // Create DB project
        const res = await api.post('/projects', {
          title: newTitle,
          language: newLang
        });
        if (res.data.success) {
          setShowCreateModal(false);
          setNewTitle('');
          navigate(`/editor/${res.data.project._id}`);
        } else {
          setError(res.data.message);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating project');
    }
  };

  const handleFavorite = async (projectId, e) => {
    e.stopPropagation();
    try {
      if (isGuest) {
        const local = localStorage.getItem('aether_guest_projects');
        const list = local ? JSON.parse(local) : [];
        const index = list.findIndex(p => p._id === projectId);
        if (index !== -1) {
          list[index].favorite = !list[index].favorite;
          localStorage.setItem('aether_guest_projects', JSON.stringify(list));
          fetchProjects();
        }
      } else {
        await api.post(`/projects/${projectId}/favorite`);
        fetchProjects();
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleDuplicate = async (projectId, e) => {
    e.stopPropagation();
    setActiveMenu(null);
    try {
      if (isGuest) {
        const local = localStorage.getItem('aether_guest_projects');
        const list = local ? JSON.parse(local) : [];
        const original = list.find(p => p._id === projectId);
        if (original) {
          const newId = 'guest_' + Math.random().toString(36).substring(2, 15);
          const duplicated = {
            ...original,
            _id: newId,
            title: `${original.title} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          list.unshift(duplicated);
          localStorage.setItem('aether_guest_projects', JSON.stringify(list));

          // Duplicate files in localStorage
          const originalFilesLocal = localStorage.getItem(`aether_guest_files_${projectId}`);
          const originalFiles = originalFilesLocal ? JSON.parse(originalFilesLocal) : [];
          const duplicatedFiles = originalFiles.map(file => ({
            ...file,
            _id: 'file_' + Math.random().toString(36).substring(2, 15),
            projectId: newId
          }));
          localStorage.setItem(`aether_guest_files_${newId}`, JSON.stringify(duplicatedFiles));

          fetchProjects();
        }
      } else {
        await api.post(`/projects/${projectId}/duplicate`);
        fetchProjects();
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleDelete = async (projectId, e) => {
    e.stopPropagation();
    setActiveMenu(null);
    if (!window.confirm("Are you sure you want to permanently delete this project?")) return;
    try {
      if (isGuest) {
        const local = localStorage.getItem('aether_guest_projects');
        let list = local ? JSON.parse(local) : [];
        list = list.filter(p => p._id !== projectId);
        localStorage.setItem('aether_guest_projects', JSON.stringify(list));
        
        // Clean up files
        localStorage.removeItem(`aether_guest_files_${projectId}`);
        fetchProjects();
      } else {
        await api.delete(`/projects/${projectId}`);
        fetchProjects();
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleTheme = () => {
    const nextTheme = preferences.theme === 'dark' ? 'light' : 'dark';
    updatePreferences({ theme: nextTheme });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image size must be less than 2MB");
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError("File must be a valid image");
      return;
    }

    setUploadError('');
    setAvatarUploading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result;
        setAvatarPreview(base64Data);
        
        const res = await uploadAvatar(base64Data);
        if (res.success) {
          setProfileStatus('avatar_success');
          setTimeout(() => setProfileStatus(''), 3000);
        } else {
          setUploadError(res.message || "Failed to upload avatar");
        }
      } catch (err) {
        setUploadError(err.response?.data?.message || err.message || "Upload failed");
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    setProfileStatus('saving');
    setUploadError('');

    try {
      const res = await updateProfile({ name: profileName });
      if (res.success) {
        setProfileStatus('success');
        setTimeout(() => {
          setProfileStatus('');
          setShowProfileModal(false);
        }, 1500);
      } else {
        setUploadError(res.message || "Failed to update profile");
        setProfileStatus('');
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || "Failed to update profile");
      setProfileStatus('');
    }
  };

  return (
    <div className={`min-h-screen font-sans ${preferences.theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#09080F] text-slate-100'} relative transition-colors duration-300`}>
      {/* Background radial glow */}
      {preferences.theme !== 'light' && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/5 blur-[140px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/5 blur-[140px] pointer-events-none" />
        </>
      )}

      {/* Top Navbar */}
      <nav className={`fixed top-0 left-0 w-full z-40 border-b px-6 md:px-12 py-4 flex justify-between items-center ${preferences.theme === 'light' ? 'bg-white/80 border-slate-200' : 'glass border-white/5'}`}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
            Ω
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
            AETHER STUDIO
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/playground')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition cursor-pointer"
          >
            <FiCode /> Quick Playground
          </button>
          
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-xl text-sm transition border ${preferences.theme === 'light' ? 'hover:bg-slate-100 border-slate-200 text-slate-700' : 'hover:bg-white/5 border-white/5 text-slate-300'}`}
          >
            {preferences.theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>

          <div className="h-5 w-[1px] bg-white/10" />

          {/* User profile widget */}
          <div 
            onClick={() => {
              setProfileName(user?.name || '');
              setAvatarPreview(user?.avatar || '');
              setUploadError('');
              setProfileStatus('');
              setShowProfileModal(true);
            }}
            className={`flex items-center gap-3 pl-1 cursor-pointer transition p-1.5 rounded-xl ${preferences.theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}
            title="Profile Settings"
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt="Avatar" 
                className="h-9 w-9 rounded-xl object-cover border border-purple-500/20 shadow-inner"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-300 uppercase shadow-inner">
                {user?.name ? user.name[0] : 'U'}
              </div>
            )}
            <div className="hidden md:block">
              <p className="text-xs font-bold leading-tight">{user?.name || 'Developer'}</p>
              <p className="text-[10px] text-slate-500 leading-none">@{user?.userId || 'guest'}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-red-400 transition cursor-pointer"
              title="Logout"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto pt-28 pb-16 px-6 md:px-12">
        {/* Profile Card / Welcome banner */}
        <div className={`p-8 rounded-2xl mb-10 border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${preferences.theme === 'light' ? 'bg-white border-slate-200' : 'glass border-white/5'}`}>
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt="Profile Avatar" 
                className="h-16 w-16 rounded-2xl object-cover border-2 border-purple-500/30 shadow-lg"
              />
            ) : (
              <div className={`h-16 w-16 rounded-2xl border flex items-center justify-center text-2xl font-black uppercase shadow-inner bg-gradient-to-tr ${preferences.theme === 'light' ? 'from-purple-100 to-indigo-100 border-purple-200 text-purple-700' : 'from-purple-500/20 to-indigo-500/20 border-purple-500/20 text-purple-300'}`}>
                {user?.name ? user.name[0] : 'U'}
              </div>
            )}
            <div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-2 uppercase ${preferences.theme === 'light' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-purple-500/10 text-purple-300 border-purple-500/20'}`}>
                {isGuest ? 'Guest Sandbox Session' : 'Active Account'}
              </span>
              <h1 className={`text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${preferences.theme === 'light' ? 'from-slate-950 via-slate-800 to-slate-700' : 'from-white via-slate-100 to-slate-400'}`}>
                Hello, {user?.name || 'Developer'}!
              </h1>
              <p className="text-slate-500 text-sm mt-1">Create or resume your code environments instantly.</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-md shadow-purple-500/10 hover:shadow-purple-500/25 flex items-center gap-2 text-white transition hover:scale-[1.02] cursor-pointer"
          >
            <FiPlus /> New Sandbox
          </button>
        </div>

        {/* Filters and List view header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none text-sm transition duration-300 ${preferences.theme === 'light' ? 'bg-white border-slate-200 focus:border-purple-500/50' : 'bg-white/[0.02] border-white/5 focus:border-purple-500/50 focus:bg-white/[0.04]'}`}
            />
          </div>

          {/* Sort & layout switches */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5">
              <FiFilter className="text-slate-500 text-xs" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={`p-2 rounded-xl text-xs border cursor-pointer outline-none ${preferences.theme === 'light' ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-950/80 border-white/5 text-slate-300'}`}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>

            <div className="h-5 w-[1px] bg-white/10" />

            <div className={`flex rounded-xl p-0.5 border ${preferences.theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/80 border-white/5'}`}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-sm transition cursor-pointer ${viewMode === 'grid' ? (preferences.theme === 'light' ? 'bg-white text-purple-600 shadow' : 'bg-purple-500/10 text-purple-400') : 'text-slate-500 hover:text-slate-300'}`}
              >
                <FiGrid />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-sm transition cursor-pointer ${viewMode === 'list' ? (preferences.theme === 'light' ? 'bg-white text-purple-600 shadow' : 'bg-purple-500/10 text-purple-400') : 'text-slate-500 hover:text-slate-300'}`}
              >
                <FiList />
              </button>
            </div>
          </div>
        </div>

        {/* Project List */}
        {projects.length === 0 ? (
          <div className={`p-16 rounded-2xl text-center border ${preferences.theme === 'light' ? 'bg-white border-slate-200' : 'glass border-white/5'}`}>
            <FiFolder className="mx-auto text-4xl text-slate-600 mb-4" />
            <h3 className="text-lg font-bold mb-1">No Sandbox Projects</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
              Create your first isolated workspace using C, C++, Python, Rust, Go, or Java code environments.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm cursor-pointer"
            >
              Create Project
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project._id}
                onClick={() => navigate(`/editor/${project._id}`)}
                className={`group p-6 rounded-2xl border cursor-pointer hover:border-purple-500/30 transition duration-300 relative flex flex-col justify-between min-h-[170px] ${preferences.theme === 'light' ? 'bg-white border-slate-200' : 'glass border-white/5 hover:bg-white/[0.02]'}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/5 text-purple-400 flex items-center justify-center border border-purple-500/10">
                      <FiCode className="text-lg" />
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={(e) => handleFavorite(project._id, e)}
                        className={`p-1.5 rounded-lg border text-sm transition cursor-pointer ${project.favorite ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : (preferences.theme === 'light' ? 'border-slate-200 text-slate-400 hover:text-amber-400' : 'border-white/5 text-slate-500 hover:text-amber-400')}`}
                      >
                        <FiStar />
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === project._id ? null : project._id);
                          }}
                          className={`p-1.5 rounded-lg border text-sm transition cursor-pointer ${preferences.theme === 'light' ? 'border-slate-200 text-slate-400 hover:bg-slate-50' : 'border-white/5 text-slate-500 hover:bg-white/5'}`}
                        >
                          <FiMoreVertical />
                        </button>
                        {activeMenu === project._id && (
                          <div className={`absolute right-0 mt-1 w-32 rounded-xl border shadow-xl z-20 overflow-hidden font-sans ${preferences.theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/95 border-white/10 text-slate-200'}`}>
                            <button
                              onClick={(e) => handleDuplicate(project._id, e)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition ${preferences.theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}
                            >
                              <FiCopy /> Duplicate
                            </button>
                            <button
                              onClick={(e) => handleDelete(project._id, e)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-red-400 transition ${preferences.theme === 'light' ? 'hover:bg-red-50' : 'hover:bg-red-950/15'}`}
                            >
                              <FiTrash2 /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg leading-snug group-hover:text-purple-300 transition duration-300 pr-4 truncate">
                    {project.title}
                  </h3>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-4">
                  <span>Last opened {new Date(project.lastOpened).toLocaleDateString()}</span>
                  {project.isShared && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">SHARED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className={`rounded-2xl border divide-y ${preferences.theme === 'light' ? 'bg-white border-slate-200 divide-slate-200' : 'glass border-white/5 divide-white/5'}`}>
            {projects.map((project) => (
              <div
                key={project._id}
                onClick={() => navigate(`/editor/${project._id}`)}
                className={`flex justify-between items-center p-4 cursor-pointer hover:bg-white/[0.01] transition duration-300`}
              >
                <div className="flex items-center gap-3">
                  <FiFileText className="text-purple-400 text-lg" />
                  <div>
                    <h4 className="font-semibold text-sm">{project.title}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      Last opened {new Date(project.lastOpened).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {project.isShared && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">SHARED</span>
                  )}
                  <button
                    onClick={(e) => handleFavorite(project._id, e)}
                    className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${project.favorite ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : (preferences.theme === 'light' ? 'border-slate-200 text-slate-400' : 'border-white/5 text-slate-500')}`}
                  >
                    <FiStar />
                  </button>
                  <button
                    onClick={(e) => handleDelete(project._id, e)}
                    className={`p-1.5 rounded-lg border text-xs text-slate-500 hover:text-red-400 transition cursor-pointer ${preferences.theme === 'light' ? 'border-slate-200' : 'border-white/5'}`}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl relative fade-in ${preferences.theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'glass border-white/10 text-slate-100'}`}>
            <h3 className={`text-xl font-bold mb-1 ${preferences.theme === 'light' ? 'text-slate-950' : 'bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent'}`}>New Sandbox Workspace</h3>
            <p className="text-slate-500 text-xs mb-6">Choose compiler details and project tags</p>

            {error && <div className="text-xs text-red-400 p-2 mb-4 bg-red-950/20 rounded border border-red-900/30">{error}</div>}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="My Python Sandbox"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none text-sm transition ${preferences.theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500' : 'bg-white/[0.02] border-white/5 text-slate-100 focus:border-purple-500/50'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">Primary Language Environment</label>
                <select
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none text-sm transition ${preferences.theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500' : 'bg-slate-950 border-white/5 text-slate-300 focus:border-purple-500/50'}`}
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript (Node)</option>
                  <option value="typescript">TypeScript</option>
                  <option value="c">C (GCC)</option>
                  <option value="cpp">C++ (G++)</option>
                  <option value="java">Java (OpenJDK)</option>
                  <option value="go">Go Language</option>
                  <option value="rust">Rust</option>
                  <option value="r">R Language</option>
                  <option value="ruby">Ruby</option>
                  <option value="php">PHP</option>
                </select>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTitle('');
                    setError('');
                  }}
                  className={`flex-1 py-3 rounded-xl font-semibold border transition text-sm cursor-pointer ${preferences.theme === 'light' ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-sm transition cursor-pointer"
                >
                  Create Sandbox
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border border-white/10 shadow-2xl relative fade-in ${preferences.theme === 'light' ? 'bg-white text-slate-900 border-slate-200' : 'glass text-slate-100'}`}>
            <h3 className={`text-xl font-bold mb-1 ${preferences.theme === 'light' ? 'text-slate-950' : 'bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent'}`}>Profile Settings</h3>
            <p className="text-slate-500 text-xs mb-6">Update your display details and avatar image</p>

            {uploadError && <div className="text-xs text-red-400 p-2 mb-4 bg-red-950/20 rounded border border-red-900/30">{uploadError}</div>}
            {profileStatus === 'success' && <div className="text-xs text-emerald-400 p-2 mb-4 bg-emerald-950/20 rounded border border-emerald-900/30">Profile updated successfully!</div>}
            {profileStatus === 'avatar_success' && <div className="text-xs text-emerald-400 p-2 mb-4 bg-emerald-950/20 rounded border border-emerald-900/30">Avatar uploaded to ImageKit successfully!</div>}

            <div className="flex flex-col items-center mb-6">
              <div 
                onClick={() => !avatarUploading && fileInputRef.current?.click()}
                className="relative group h-24 w-24 rounded-2xl overflow-hidden border border-purple-500/30 bg-purple-500/5 cursor-pointer flex items-center justify-center shadow-lg transition-transform active:scale-95 animate-fade-in"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 flex items-center justify-center text-3xl font-black text-purple-300 uppercase shadow-inner">
                    {user?.name ? user.name[0] : 'U'}
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity duration-200">
                  <FiCamera className="text-white text-lg" />
                  <span className="text-[10px] text-white font-bold uppercase tracking-wider">Change</span>
                </div>

                {avatarUploading && (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-1">
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[9px] text-purple-300 font-bold uppercase">Uploading</span>
                  </div>
                )}
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
                className="hidden" 
                accept="image/*"
              />

              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-2.5 hover:text-purple-300 transition"
              >
                Select New Photo
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none text-sm transition ${preferences.theme === 'light' ? 'bg-slate-50 border-slate-200 focus:border-purple-500' : 'bg-white/[0.02] border-white/5 focus:border-purple-500/50'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">Email (Read-only)</label>
                <input
                  type="text"
                  disabled
                  value={user?.email || ''}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none text-sm opacity-50 cursor-not-allowed ${preferences.theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-white/[0.01] border-white/5'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">User ID (Read-only)</label>
                <input
                  type="text"
                  disabled
                  value={user?.userId || ''}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none text-sm opacity-50 cursor-not-allowed ${preferences.theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-white/[0.01] border-white/5'}`}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileModal(false);
                    setUploadError('');
                    setProfileStatus('');
                  }}
                  className={`flex-1 py-3 rounded-xl font-semibold border transition text-sm cursor-pointer ${preferences.theme === 'light' ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileStatus === 'saving'}
                  className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-sm transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {profileStatus === 'saving' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Details'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
