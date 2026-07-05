import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, Activity, FileText, AlertTriangle, CheckCircle2, 
  XCircle, Terminal, Send, Sun, Moon, HelpCircle, 
  RefreshCw, Play, ArrowRight, ArrowLeft, ShieldAlert, BrainCircuit,
  MessageSquare, Sparkles, AlertOctagon, HeartPulse, Edit3, Eye, EyeOff
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

const cleanChatReply = (text) => {
  if (!text) return '';
  let clean = text.replace(/^\[Mock AI Assistant\]:\s*/i, '');
  clean = clean.replace(/Ask me specific questions like:[\s\S]*?(\n\n|$)/gi, '');
  clean = clean.replace(/Solution:\s*Ask me specific questions[\s\S]*/gi, '');
  clean = clean.replace(/^#+\s+/gm, '');
  clean = clean.replace(/^(Answer|Reason|Solution|Verification|Prevention|Summary|Fix):\s*/gmi, '');
  clean = clean.replace(/\*\*/g, '');
  clean = clean.replace(/^[\s\t]*[\*\-\•]\s+/gm, '');
  clean = clean.replace(/`/g, '');
  clean = clean.replace(/\n{3,}/g, '\n\n');
  return clean.trim();
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [view, setView] = useState((localStorage.getItem('token') && localStorage.getItem('user')) ? (localStorage.getItem('currentView') || 'dashboard') : 'home');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  
  const [uploadTab, setUploadTab] = useState('file'); // 'file' or 'paste'
  const [darkMode, setDarkMode] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [pastedLogs, setPastedLogs] = useState('');
  const [uploadHistory, setUploadHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Protect private routes from unauthenticated navigation and synchronize view state
  useEffect(() => {
    const unauthenticatedViews = ['home', 'login', 'signup', 'forgot'];
    if (!token || !user) {
      if (!unauthenticatedViews.includes(view)) {
        setView('login');
      }
    } else {
      if (unauthenticatedViews.includes(view)) {
        setView('dashboard');
      } else {
        localStorage.setItem('currentView', view);
      }
    }
  }, [view, token, user]);
  
  // Authentication & Profile states
  const [authMode, setAuthMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [showPassword, setShowPassword] = useState(false);
  
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Active Dashboard navigation tab
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'analysis', 'history', 'profile', 'settings'

  // History panel advanced filters & actions
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'analyzed', 'parsed'
  const [renameId, setRenameId] = useState(null);
  const [renameVal, setRenameVal] = useState('');

  // Profile Edit forms
  const [profileName, setProfileName] = useState(user ? user.name : '');
  const [profileAccountType, setProfileAccountType] = useState(user ? (user.accountType || 'Developer') : 'Developer');
  const [profileEditing, setProfileEditing] = useState(false);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);

  const messagesEndRef = useRef(null);

  // Apply Dark Mode Class
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [darkMode]);

  // Load upload history if authenticated
  useEffect(() => {
    if (user && token) {
      fetchUploadHistory();
      setProfileName(user.name);
      setProfileAccountType(user.accountType || 'Developer');
    }
  }, [user, token]);

  const authFetch = async (url, options = {}) => {
    const API_BASE = import.meta.env.VITE_API_URL || '';
    const cleanUrl = (API_BASE && url.startsWith('/api/')) ? url.substring(4) : url;
    const finalUrl = `${API_BASE}${cleanUrl}`;
    const headers = options.headers || {};
    const storedToken = token || localStorage.getItem('token');
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }
    return fetch(finalUrl, { ...options, headers });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Login failed');
      
      localStorage.setItem('token', json.token);
      localStorage.setItem('user', JSON.stringify(json.user));
      setToken(json.token);
      setUser(json.user);
      setAuthPassword('');
      setErrorMsg('');
      setView('dashboard');
      setActiveTab('dashboard');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authName, email: authEmail, password: authPassword })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Registration failed');
      
      localStorage.setItem('token', json.token);
      localStorage.setItem('user', JSON.stringify(json.user));
      setToken(json.token);
      setUser(json.user);
      setAuthName('');
      setAuthPassword('');
      setErrorMsg('');
      setView('dashboard');
      setActiveTab('dashboard');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setForgotSuccess('');
    try {
      const res = await authFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, newPassword: forgotNewPassword })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Reset failed');
      
      setForgotSuccess(json.message);
      setForgotEmail('');
      setForgotNewPassword('');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setData(null);
    setChatMessages([]);
    setView('landing');
    setActiveTab('dashboard');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName, accountType: profileAccountType })
      });
      const json = await res.json();
      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(json.user));
        setUser(json.user);
        setProfileEditing(false);
      } else {
        setErrorMsg(json.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUploadHistory = async () => {
    try {
      const res = await authFetch('/api/history');
      const json = await res.json();
      if (Array.isArray(json)) {
        setUploadHistory(json);
      }
    } catch (err) {
      console.error('Error fetching upload history:', err);
    }
  };

  const selectHistoryItem = async (id) => {
    try {
      setUploading(true);
      setErrorMsg('');
      const res = await authFetch(`/api/dashboard?id=${id}`);
      const json = await res.json();
      if (json.stats) {
        setData(json);
        localStorage.setItem('selectedLogId', id);
        setView('dashboard');
        setActiveTab('dashboard');
        if (json.chats) {
          const chats = json.chats.map(c => {
            const timeStr = c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return [
              { sender: 'user', text: c.message, timestamp: timeStr },
              { sender: 'ai', text: cleanChatReply(c.reply), timestamp: timeStr }
            ];
          }).flat();
          setChatMessages(chats);
        } else {
          setChatMessages([]);
        }
      }
    } catch (err) {
      console.error('Error loading history item:', err);
      setErrorMsg('Failed to load selected log from history.');
    } finally {
      setUploading(false);
    }
  };

  const deleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this log from history?')) return;
    try {
      const res = await authFetch(`/api/analysis/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const remaining = uploadHistory.filter(item => item.id !== id);
        setUploadHistory(remaining);
        if (data && data.id === id) {
          if (remaining.length > 0) {
            selectHistoryItem(remaining[0].id);
          } else {
            setData(null);
            setChatMessages([]);
            setView('landing');
          }
        }
      }
    } catch (err) {
      console.error('Error deleting history item:', err);
    }
  };

  const renameHistoryItem = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await authFetch(`/api/analysis/${id}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: renameVal })
      });
      if (res.ok) {
        setRenameId(null);
        setRenameVal('');
        fetchUploadHistory();
        if (data && data.id === id) {
          setData(prev => ({ ...prev, filename: renameVal }));
        }
      }
    } catch (err) {
      console.error('Error renaming item:', err);
    }
  };

  const reanalyzeHistoryItem = async (e, id) => {
    e.stopPropagation();
    try {
      setAnalyzing(true);
      const res = await authFetch('/api/analyze-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        selectHistoryItem(id);
      }
    } catch (err) {
      console.error('Error reanalyzing log:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Scroll to bottom of chat when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [chatMessages.length]);

  // Fetch current analysis (e.g. latest analyzed log)
  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);
      const preservedId = localStorage.getItem('selectedLogId');
      const url = preservedId ? `/api/dashboard?id=${preservedId}` : '/api/dashboard';
      const res = await authFetch(url);
      const json = await res.json();
      if (json.stats) {
        setData(json);
        // Load chat history if present
        if (json.chats) {
          const chats = json.chats.map(c => {
            const timeStr = c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return [
              { sender: 'user', text: c.message, timestamp: timeStr },
              { sender: 'ai', text: cleanChatReply(c.reply), timestamp: timeStr }
            ];
          }).flat();
          setChatMessages(chats);
        } else {
          setChatMessages([]);
        }
      } else {
        setData(null);
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'dashboard') {
      fetchDashboardData();
    }
  }, [view]);

  // File Drop handling
  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    setUploading(true);
    setErrorMsg('');
    setData(null);
    setChatMessages([]);
    
    const formData = new FormData();
    formData.append('logFile', file);

    try {
      // 1. Upload File
      const uploadRes = await authFetch('/api/upload-log', {
        method: 'POST',
        body: formData
      });
      const uploadJson = await uploadRes.json();
      
      if (!uploadRes.ok) {
        throw new Error(uploadJson.error || 'Failed to upload log file');
      }

      const logId = uploadJson.id;
      setUploading(false);
      setAnalyzing(true);

      // 2. Trigger AI Analysis
      const analyzeRes = await authFetch('/api/analyze-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: logId })
      });
      const analyzeJson = await analyzeRes.json();

      if (!analyzeRes.ok) {
        throw new Error(analyzeJson.error || 'Failed to analyze log file');
      }

      // 3. Complete and Transition view
      setAnalyzing(false);
      localStorage.setItem('selectedLogId', logId);
      await selectHistoryItem(logId);
      fetchUploadHistory();

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred during processing');
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt', '.log']
    },
    multiple: false
  });

  // Pasted Log Submission
  const handlePasteSubmit = async (e) => {
    e.preventDefault();
    if (!pastedLogs.trim()) {
      setErrorMsg('Please paste some log lines before submission.');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    setData(null);
    setChatMessages([]);

    try {
      const res = await authFetch('/api/upload-raw-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: pastedLogs })
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to parse pasted log content');
      }

      setUploading(false);
      const logId = json.id;
      localStorage.setItem('selectedLogId', logId);
      await selectHistoryItem(logId);
      fetchUploadHistory();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred during parsing of raw logs');
      setUploading(false);
    }
  };

  // Chat message submission
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !data) return;

    const userText = chatInput;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userText, timestamp: timeStr }]);
    setChatLoading(true);

    try {
      // Build context-aware message to send to the backend
      let contextMessage = userText;
      if (chatMessages.length > 0) {
        const history = chatMessages.slice(-6).map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
        contextMessage = `Recent Conversation History:\n${history}\n\nUser current follow-up question: ${userText}\n\nInstruction: Act as a natural conversational AI assistant (like ChatGPT/Claude). Answer ONLY the user's current question directly in 100-200 words. Do not repeat previous summaries, do not generate reports, do not use markdown headings, bold text, or lists. Respond in plain, simple English.`;
      } else {
        contextMessage = `User question: ${userText}\n\nInstruction: Act as a natural conversational AI assistant (like ChatGPT/Claude). Answer ONLY the user's current question directly in 100-200 words. Do not repeat previous summaries, do not generate reports, do not use markdown headings, bold text, or lists. Respond in plain, simple English.`;
      }

      const res = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: contextMessage,
          id: data.id
        })
      });
      
      if (!res.ok) throw new Error('Failed to get chat response');
      const json = await res.json();
      
      const cleanReply = cleanChatReply(json.reply);
      const aiTimeStr = json.timestamp ? new Date(json.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : timeStr;
      setChatMessages(prev => [...prev, { sender: 'ai', text: cleanReply, timestamp: aiTimeStr }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Error: Failed to fetch response from backend.', timestamp: timeStr }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Trigger load-demo directly from backend
  const handleTryDemo = async () => {
    setUploading(true);
    setErrorMsg('');
    setData(null);
    setChatMessages([]);
    try {
      const res = await authFetch('/api/load-demo', {
        method: 'POST'
      });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load demo');
      }
      
      setData(json);
      // Load chats if any
      if (json.chats) {
        const chats = json.chats.map(c => {
          const timeStr = c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          return [
            { sender: 'user', text: c.message, timestamp: timeStr },
            { sender: 'ai', text: cleanChatReply(c.reply), timestamp: timeStr }
          ];
        }).flat();
        setChatMessages(chats);
      }
      setView('dashboard');
      fetchUploadHistory();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to initialize demo. Is the server running?');
    } finally {
      setUploading(false);
    }
  };

  // Recharts level colors
  const LEVEL_COLORS = {
    INFO: '#3b82f6',
    DEBUG: '#64748b',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    FATAL: '#7f1d1d',
    SUCCESS: '#10b981'
  };

  // Format Level Data for Pie Chart
  const getPieData = () => {
    if (!data?.stats?.levelCounts) return [];
    return Object.entries(data.stats.levelCounts)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  };

  // Format Module Data for Bar Chart
  const getBarData = () => {
    if (!data?.stats?.moduleCounts) return [];
    return Object.entries(data.stats.moduleCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  if (!user || !token) {
    if (view === 'home') {
      return (
        <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
          {/* Navigation Bar */}
          <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200 px-6 py-4 flex items-center justify-between dark:bg-slate-950/80 dark:border-slate-800/80">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
              <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-lg shadow-lg shadow-violet-500/20 text-white">
                <BrainCircuit className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-500 dark:from-violet-400 dark:to-indigo-400">
                  LogPilot AI
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                title="Toggle theme"
              >
                {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              </button>
              <button
                onClick={() => { setView('login'); setErrorMsg(''); setForgotSuccess(''); }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Sign In
              </button>
              <button
                onClick={() => { setView('signup'); setErrorMsg(''); }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-650 text-white text-xs font-semibold hover:shadow-lg hover:shadow-violet-600/30 transition-all"
              >
                Sign Up
              </button>
            </div>
          </header>

          {/* Hero Section */}
          <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto space-y-12 my-auto">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-650 border border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20 text-xs font-semibold">
                <Sparkles className="w-4.5 h-4.5 text-violet-500 dark:text-violet-400 animate-pulse" />
                SRE Automated Incident Diagnostics Platform
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
                Resolve Server Errors <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-indigo-400">
                  In Real-Time With AI
                </span>
              </h1>

              <p className="text-slate-500 max-w-xl mx-auto text-xs md:text-sm dark:text-slate-400 leading-relaxed">
                LogPilot AI parses raw server logs, isolates faulty dependencies, calculates system health trends, and guides developers with structured SRE architectural fixes.
              </p>
            </div>

            <div className="flex items-center gap-4 justify-center">
              <button
                onClick={() => { setView('signup'); setErrorMsg(''); }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-lg hover:shadow-violet-600/30 transition-all"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setView('login'); setErrorMsg(''); setForgotSuccess(''); }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-50 transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Sign In
              </button>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full text-left pt-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 dark:bg-slate-900/30 dark:border-slate-800">
                <div className="text-violet-600 dark:text-violet-400 font-bold flex items-center gap-2 text-sm">
                  <Terminal className="w-5 h-5" /> Optimised Parsing
                </div>
                <p className="text-slate-550 text-xs dark:text-slate-400 leading-relaxed">
                  Processes unstructured error stacks line-by-line using high-performance regex matching strategies.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 dark:bg-slate-900/30 dark:border-slate-800">
                <div className="text-violet-600 dark:text-violet-400 font-bold flex items-center gap-2 text-sm">
                  <BrainCircuit className="w-5 h-5" /> Root Cause analysis
                </div>
                <p className="text-slate-550 text-xs dark:text-slate-400 leading-relaxed">
                  Traces exceptions directly to culprit system dependencies with fully-detailed prevention plans.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 dark:bg-slate-900/30 dark:border-slate-800">
                <div className="text-violet-600 dark:text-violet-400 font-bold flex items-center gap-2 text-sm">
                  <MessageSquare className="w-5 h-5" /> Incident chat
                </div>
                <p className="text-slate-550 text-xs dark:text-slate-400 leading-relaxed">
                  Drill down into logs with the contextual chatbot to verify resolutions, test fixes, or inspect metrics.
                </p>
              </div>
            </div>
          </main>

          <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-400 dark:border-slate-900 dark:bg-slate-950/40 mt-auto flex-shrink-0">
            © 2026 LogPilot AI Platform. All rights reserved.
          </footer>
        </div>
      );
    }

    // Portal view: Login / SignUp / Forgot password cards
    return (
      <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        {/* Top Navigation Bar */}
        <nav className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between dark:bg-slate-950/80 dark:border-slate-800/80 sticky top-0 z-50 flex-shrink-0">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
            <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-lg shadow-lg shadow-violet-500/20 text-white">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-500 dark:from-violet-400 dark:to-indigo-400">
              LogPilot AI
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" onClick={() => setView('home')} className="hover:text-violet-605 dark:hover:text-violet-400 transition-all">Features</a>
            <a href="#docs" onClick={() => setView('home')} className="hover:text-violet-605 dark:hover:text-violet-400 transition-all">Documentation</a>
            <a href="#about" onClick={() => setView('home')} className="hover:text-violet-605 dark:hover:text-violet-400 transition-all">About</a>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5 text-violet-500" />}
            </button>

            <button
              onClick={() => { setView('login'); setErrorMsg(''); setForgotSuccess(''); }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                view === 'login'
                  ? 'bg-violet-650 text-white border-violet-650 hover:bg-violet-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setView('signup'); setErrorMsg(''); setForgotSuccess(''); }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                view === 'signup'
                  ? 'bg-violet-650 text-white border-violet-650 hover:bg-violet-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              Sign Up
            </button>
          </div>
        </nav>

        {/* Card Centered Container */}
        <div className="flex-1 flex justify-center items-center p-6">
          <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-xl space-y-6 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="p-3 bg-gradient-to-tr from-violet-600 to-indigo-650 rounded-2xl text-white">
              <BrainCircuit className="w-8 h-8 animate-pulse" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight mt-3">
              {view === 'login' ? 'Sign In to LogPilot' : view === 'signup' ? 'Create SRE Account' : 'Reset Portal Password'}
            </h1>
            <p className="text-xs text-slate-450 max-w-xs dark:text-slate-500">
              Secure, SRE-standard automated anomaly diagnosis
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 text-xs flex items-start gap-2 text-left">
              <XCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {forgotSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:text-emerald-400 text-xs flex items-start gap-2 text-left">
              <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
              <span>{forgotSuccess}</span>
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:border-violet-500 caret-violet-600 dark:caret-violet-400 focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500">Password</label>
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setErrorMsg(''); setForgotSuccess(''); }}
                    className="text-xs text-violet-500 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:border-violet-500 caret-violet-600 dark:caret-violet-400 focus:ring-1 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-slate-350 text-violet-605 focus:ring-violet-500 focus:ring-opacity-25"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Remember Me</span>
                </label>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-650 text-white font-semibold text-xs shadow-lg hover:shadow-violet-600/30 transition-all animate-pulse"
              >
                Sign In
              </button>
            </form>
          )}

          {view === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Full Name</label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:border-violet-500 caret-violet-600 dark:caret-violet-400 focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:border-violet-500 caret-violet-600 dark:caret-violet-400 focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:border-violet-500 caret-violet-600 dark:caret-violet-400 focus:ring-1 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-650 text-white font-semibold text-xs shadow-lg hover:shadow-violet-600/30 transition-all"
              >
                Create Account
              </button>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Email Address</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:border-violet-500 caret-violet-600 dark:caret-violet-400 focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:border-violet-500 caret-violet-600 dark:caret-violet-400 focus:ring-1 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-655 text-white font-semibold text-xs shadow-lg hover:shadow-violet-600/30 transition-all"
              >
                Reset Password
              </button>
            </form>
          )}

          <div className="text-center pt-2">
            {view === 'login' && (
              <p className="text-xs text-slate-500">
                Don't have an account?{' '}
                <button onClick={() => { setView('signup'); setErrorMsg(''); setForgotSuccess(''); }} className="text-violet-500 hover:underline font-semibold">
                  Sign Up
                </button>
              </p>
            )}
            {view === 'signup' && (
              <p className="text-xs text-slate-500">
                Already have an account?{' '}
                <button onClick={() => { setView('login'); setErrorMsg(''); setForgotSuccess(''); }} className="text-violet-500 hover:underline font-semibold">
                  Sign In
                </button>
              </p>
            )}
            {view === 'forgot' && (
              <p className="text-xs text-slate-500">
                Remember your password?{' '}
                <button onClick={() => { setView('login'); setErrorMsg(''); setForgotSuccess(''); }} className="text-violet-500 hover:underline font-semibold">
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

  const pieData = getPieData();
  const hasPieData = pieData.length > 0 && pieData.some(d => d.value > 0);
  const barData = getBarData();
  const hasBarData = barData.length > 0 && barData.some(d => d.count > 0);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      
      {/* Header Banner */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200 px-6 py-4 flex items-center justify-between dark:bg-slate-950/80 dark:border-slate-800/80">
        <div className="flex items-center gap-3 cursor-pointer flex-shrink-0" onClick={() => { setView('dashboard'); setActiveTab('dashboard'); }}>
          <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-lg shadow-lg shadow-violet-500/20 text-white">
            <BrainCircuit className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-500 dark:from-violet-400 dark:to-indigo-400">
              LogPilot AI
            </span>
            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-full border border-violet-500/20">
              v1.0
            </span>
          </div>
        </div>

        {/* Tab Navigation if inside dashboard */}
        {view === 'dashboard' && (
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mx-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-slate-800 text-violet-650 dark:text-violet-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'analysis'
                  ? 'bg-white dark:bg-slate-800 text-violet-650 dark:text-violet-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              Log Analysis
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-800 text-violet-650 dark:text-violet-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              Upload History
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-slate-800 text-violet-650 dark:text-violet-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-slate-800 text-violet-650 dark:text-violet-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              Settings
            </button>
          </div>
        )}

        <nav className="flex items-center gap-4 flex-shrink-0">
          {view === 'dashboard' && (
            <button 
              onClick={() => setView('landing')} 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 transition-colors text-sm font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Upload Logs
            </button>
          )}
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-105 dark:border-slate-805"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          {user && (() => {
            const firstLetter = user.name ? user.name.trim().charAt(0).toUpperCase() : '?';
            return (
              <div className="relative">
                {/* Profile Trigger Button */}
                <button
                  onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
                  className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800 focus:outline-none group"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-650 to-indigo-650 text-white text-xs font-bold flex items-center justify-center border border-violet-500/35 shadow-sm">
                      {firstLetter}
                    </div>
                    {/* Online status green dot */}
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 bg-emerald-500" />
                  </div>
                  
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-violet-605 transition-colors">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                      {user.accountType || 'Developer'}
                    </span>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {avatarDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAvatarDropdownOpen(false)} />
                    
                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-50 dark:bg-slate-900 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                      <button
                        onClick={() => {
                          setView('dashboard');
                          setActiveTab('profile');
                          setAvatarDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        My Profile
                      </button>
                      <button
                        onClick={() => {
                          setView('dashboard');
                          setActiveTab('settings');
                          setAvatarDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          setView('dashboard');
                          setActiveTab('history');
                          setAvatarDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        Upload History
                      </button>
                      <button
                        onClick={() => {
                          setView('dashboard');
                          setActiveTab('profile');
                          setAvatarDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        Change Password
                      </button>
                      <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />
                      <button
                        onClick={() => {
                          setAvatarDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </nav>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-row overflow-hidden relative">
        
        {/* Upload History / Activity Panel Sidebar */}
        {sidebarOpen ? (
          <aside className="w-72 border-r border-slate-200 bg-slate-50 dark:border-slate-800/85 dark:bg-slate-950 flex flex-col flex-shrink-0 transition-all duration-300">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-sm tracking-wide uppercase">
                <Activity className="w-4 h-4 text-violet-500" />
                Upload History
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded hover:bg-slate-250 dark:hover:bg-slate-900 text-slate-500"
                title="Hide sidebar"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* Sidebar search and filters */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 flex-shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              >
                <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Logs</option>
                <option value="analyzed" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">AI Analyzed</option>
                <option value="parsed" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Parsed Only</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {uploadHistory.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                  No log uploads yet.
                </div>
              ) : (
                (() => {
                  const filtered = uploadHistory.filter(item => {
                    const matchesSearch = item.filename.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesStatus = filterStatus === 'all' || 
                      (filterStatus === 'analyzed' && item.status === 'analyzed') ||
                      (filterStatus === 'parsed' && item.status === 'parsed');
                    return matchesSearch && matchesStatus;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                        No matching logs found.
                      </div>
                    );
                  }

                  return filtered.map((item) => {
                    const isActive = data && data.id === item.id;
                    const isRenaming = renameId === item.id;
                    const dateStr = new Date(item.uploadDate).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    // format size
                    let sizeStr = '0 B';
                    if (item.fileSize) {
                      const k = 1024;
                      const sizes = ['B', 'KB', 'MB'];
                      const i = Math.floor(Math.log(item.fileSize) / Math.log(k));
                      sizeStr = parseFloat((item.fileSize / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                    }

                    return (
                      <div
                        key={item.id}
                        onClick={() => !isRenaming && selectHistoryItem(item.id)}
                        className={`group p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 relative ${
                          isActive
                            ? 'border-violet-500 bg-violet-500/5 shadow-sm dark:bg-violet-950/20'
                            : 'border-slate-200 bg-white hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <FileText className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-500' : 'text-slate-400'}`} />
                            {isRenaming ? (
                              <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={renameVal}
                                  onChange={(e) => setRenameVal(e.target.value)}
                                  className="px-1.5 py-0.5 rounded border border-slate-350 text-xs w-full bg-white dark:bg-slate-950 dark:border-slate-800"
                                />
                                <button
                                  onClick={(e) => renameHistoryItem(e, item.id)}
                                  className="px-1.5 py-0.5 rounded bg-violet-600 text-white text-[10px] font-bold"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setRenameId(null); }}
                                  className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]"
                                >
                                  X
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate" title={item.filename}>
                                {item.filename}
                              </span>
                            )}
                          </div>
                          {!isRenaming && item.healthScore !== null && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              item.healthScore > 75 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            }`}>
                              {item.healthScore}%
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          <div className="flex items-center gap-1">
                            <span>{dateStr}</span>
                            <span>•</span>
                            <span>{sizeStr}</span>
                          </div>
                          {!isRenaming && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenameId(item.id);
                                  setRenameVal(item.filename);
                                }}
                                className="hover:text-violet-500 p-0.5"
                                title="Rename log file"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => reanalyzeHistoryItem(e, item.id)}
                                className="hover:text-violet-500 p-0.5"
                                title="Reanalyze log file"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => deleteHistoryItem(e, item.id)}
                                className="hover:text-red-500 p-0.5 text-slate-400"
                                title="Remove from history"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </aside>
        ) : (
          <div className="absolute left-4 top-4 z-20">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Show upload history"
            >
              <Activity className="w-4 h-4 text-violet-500" />
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-y-auto">
          
          {/* Landing Page */}
          {view === 'landing' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto space-y-10">
            
            {/* Hero Section */}
            <div className="space-y-4 pt-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20 text-sm font-medium">
                <Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-400 animate-pulse" />
                AI-Powered Log Intelligence & Diagnosis
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
                Zero in on Root Causes <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-indigo-400">
                  in Seconds, Not Hours
                </span>
              </h1>

              <p className="text-slate-600 max-w-2xl mx-auto text-base md:text-lg font-normal dark:text-slate-400">
                LogPilot AI parses raw logs, builds real-time system health models, detects anomalies, and uses Groq Llama-3 to automatically recommend direct fixes.
              </p>
            </div>

            {/* Configurable Input Box tabs */}
            <div className="w-full max-w-2xl mx-auto space-y-4">
              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-3 text-left">
                  <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Error:</span> {errorMsg}
                  </div>
                </div>
              )}

              {/* Tab Selector */}
              <div className="flex items-center justify-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 max-w-xs mx-auto">
                <button
                  onClick={() => setUploadTab('file')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    uploadTab === 'file'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Log File
                </button>
                <button
                  onClick={() => setUploadTab('paste')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    uploadTab === 'paste'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  Paste Raw Logs
                </button>
              </div>

              {/* Tab 1: File Dropzone */}
              {uploadTab === 'file' && (
                <div 
                  {...getRootProps()} 
                  className={`p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden ${
                    isDragActive 
                      ? 'border-violet-500 bg-violet-500/5 shadow-inner' 
                      : 'border-slate-300 bg-white hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <input {...getInputProps()} />
                  
                  {uploading || analyzing ? (
                    <div className="flex flex-col items-center justify-center py-6 space-y-4">
                      <RefreshCw className="w-12 h-12 text-violet-500 animate-spin" />
                      <div>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                          {uploading ? 'Parsing Log File...' : 'Generating AI Diagnosis...'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {uploading ? 'Reading entries and metrics' : 'Querying Groq Llama models'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 space-y-4">
                      <div className="p-4 bg-slate-100 border border-slate-200 rounded-full text-slate-600 dark:bg-slate-800 dark:border-slate-750 dark:text-slate-300">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">
                          Drag and drop your <code className="text-violet-600 bg-violet-50 px-1 py-0.5 rounded border border-violet-100 dark:text-violet-400 dark:bg-violet-950/20 dark:border-violet-500/20">.log</code> or <code className="text-violet-600 bg-violet-50 px-1 py-0.5 rounded border border-violet-100 dark:text-violet-400 dark:bg-violet-950/20 dark:border-violet-500/20">.txt</code> here
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          or click to browse local files
                        </p>
                      </div>
                      <div className="text-xs text-slate-500 bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 px-3 py-1.5 rounded-full">
                        Max file size: 50MB. Safe parsing enforced.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Paste Raw Logs Textarea */}
              {uploadTab === 'paste' && (
                <form onSubmit={handlePasteSubmit} className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={pastedLogs}
                      onChange={(e) => setPastedLogs(e.target.value)}
                      placeholder="Paste your log rows here...&#10;E.g.&#10;2026-07-03T07:00:01Z [INFO] gateway: Init session&#10;2026-07-03T07:00:15Z [ERROR] billing: stripe handshake error: timeout"
                      disabled={uploading}
                      className="w-full h-48 p-4 font-mono text-xs rounded-2xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 dark:placeholder-slate-650"
                    />
                    {pastedLogs.trim() && (
                      <button
                        type="button"
                        onClick={() => setPastedLogs('')}
                        className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    disabled={uploading || !pastedLogs.trim()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Analyzing Pasted Text...
                      </>
                    ) : (
                      <>
                        <Terminal className="w-4 h-4" />
                        Parse & Analyze Text
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Quick Demo Launch & Manual Upload */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleTryDemo}
                disabled={uploading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold hover:bg-slate-50 hover:text-slate-950 transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 disabled:opacity-50"
              >
                {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                Launch Demo Dashboard
              </button>
              
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.log,.txt';
                  input.onchange = (e) => {
                    if (e.target.files.length > 0) {
                      onDrop(e.target.files);
                    }
                  };
                  input.click();
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-600/30 transition-all"
              >
                Upload sample-app.log
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Core Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full text-left pt-2">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 dark:bg-slate-900/30 dark:border-slate-900">
                <div className="text-violet-600 dark:text-violet-400 font-bold flex items-center gap-2">
                  <Terminal className="w-5 h-5" /> Simple Parser
                </div>
                <p className="text-slate-600 text-sm dark:text-slate-400">
                  Instantly extracts modules, timestamps, warnings, error rates, and calculates health metrics using regex patterns.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 dark:bg-slate-900/30 dark:border-slate-900">
                <div className="text-violet-600 dark:text-violet-400 font-bold flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5" /> Groq AI Diagnosis
                </div>
                <p className="text-slate-600 text-sm dark:text-slate-400">
                  Explains exactly which module triggered the anomaly, details the root cause, and generates precise steps to fix it.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 dark:bg-slate-900/30 dark:border-slate-900">
                <div className="text-violet-600 dark:text-violet-400 font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" /> Interactive chat
                </div>
                <p className="text-slate-600 text-sm dark:text-slate-400">
                  Discuss issues directly with an SRE agent. Ask why a transaction terminated or how to refactor connection handling.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
            {dashboardLoading || uploading || analyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-20 bg-white border border-slate-200 rounded-2xl dark:bg-slate-900/40 dark:border-slate-800">
                <RefreshCw className="w-10 h-10 animate-spin text-violet-650" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {uploading ? 'Parsing and Uploading Log File...' : analyzing ? 'Running Groq SRE AI Diagnosis...' : 'Loading SRE Incident Workspace...'}
                  </p>
                  <p className="text-xs text-slate-500">Please wait while we update your telemetry dashboard</p>
                </div>
              </div>
            ) : (data === null && ['dashboard', 'analysis', 'history'].includes(activeTab)) ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 border-2 border-dashed border-slate-250 dark:border-slate-800 rounded-3xl py-16 bg-white dark:bg-slate-900/30">
                <div className="p-4 bg-violet-500/10 text-violet-500 rounded-full animate-bounce">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="max-w-md space-y-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No telemetry log loaded yet</h3>
                  <p className="text-xs text-slate-500">
                    To populate the charts and run AI incident analysis, please upload a server log file or initialize the demo dataset.
                  </p>
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <button
                    onClick={() => setView('landing')}
                    className="px-5 py-2.5 rounded-xl bg-violet-650 hover:bg-violet-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" /> Upload Log
                  </button>
                  <button
                    onClick={handleTryDemo}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 dark:bg-slate-800 dark:border-slate-750 dark:text-slate-300 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" /> Try Demo Log
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Top current log details banner */}
                {data && (
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-205 p-4 rounded-2xl dark:bg-slate-900/30 dark:border-slate-800 flex-shrink-0">
                    <div>
                      <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current active knowledge base</h2>
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <FileText className="w-4.5 h-4.5 text-violet-500" />
                        {data?.filename || 'Pasted Log Snippet'}
                      </p>
                    </div>

                    {/* Mobile tabs */}
                    <div className="flex lg:hidden items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full md:w-auto">
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${
                          activeTab === 'dashboard' ? 'bg-white dark:bg-slate-800 text-violet-650 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        Stats
                      </button>
                      <button
                        onClick={() => setActiveTab('analysis')}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${
                          activeTab === 'analysis' ? 'bg-white dark:bg-slate-800 text-violet-650 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        AI Fixes
                      </button>
                      <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${
                          activeTab === 'history' ? 'bg-white dark:bg-slate-800 text-violet-650 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        History
                      </button>
                      <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${
                          activeTab === 'profile' ? 'bg-white dark:bg-slate-800 text-violet-650 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        Profile
                      </button>
                    </div>

                    <button
                      onClick={() => setView('landing')}
                      className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Upload New Logs
                    </button>
                  </div>
                )}

            {/* TAB CONTENT: 1. DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between dark:bg-slate-900/40 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 text-xs">Health Score</span>
                    <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mt-2">
                      {data ? `${data.stats.healthScore}%` : '—'}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between dark:bg-slate-900/40 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 text-xs">Total Entries</span>
                    <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mt-2">
                      {data ? (data.stats.totalLogs ?? data.stats.totalLines ?? '0') : '0'}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between dark:bg-slate-900/40 dark:border-slate-800">
                    <span className="text-red-500 text-xs">Error Rows</span>
                    <div className="text-3xl font-extrabold tracking-tight text-red-500 mt-2">
                      {data ? data.stats.levelCounts.ERROR : '—'}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between dark:bg-slate-900/40 dark:border-slate-800">
                    <span className="text-amber-500 text-xs">Warnings</span>
                    <div className="text-3xl font-extrabold tracking-tight text-amber-500 mt-2">
                      {data ? data.stats.levelCounts.WARNING : '—'}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between dark:bg-slate-900/40 dark:border-slate-800">
                    <span className="text-emerald-500 text-xs">Successful Rows</span>
                    <div className="text-3xl font-extrabold tracking-tight text-emerald-500 mt-2">
                      {data ? data.stats.levelCounts.SUCCESS : '—'}
                    </div>
                  </div>
                </div>

                {/* Charts segment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800">
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-4">Error Level Distribution</h3>
                    <div className="h-64 flex flex-col justify-center">
                      {!hasPieData ? (
                        <div className="flex flex-col items-center justify-center text-center space-y-3 py-6">
                          {data?.stats?.healthScore === 100 ? (
                            <>
                              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full">
                                <CheckCircle2 className="w-8 h-8 animate-pulse" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Excellent! No issues detected in this log file.</p>
                                <p className="text-[10px] text-slate-500 mt-1">System is healthy. Nothing to visualize.</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full">
                                <AlertTriangle className="w-8 h-8" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No errors found in the uploaded log.</p>
                                <p className="text-[10px] text-slate-500 mt-1">No chart data available.</p>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={LEVEL_COLORS[entry.name] || '#8884d8'} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: darkMode ? '#0f172a' : '#ffffff', 
                                borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                                color: darkMode ? '#f1f5f9' : '#0f172a',
                                fontSize: '11px',
                                borderRadius: '8px'
                              }}
                              itemStyle={{ color: darkMode ? '#f1f5f9' : '#0f172a' }}
                              labelStyle={{ color: darkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value) => <span className="text-slate-700 dark:text-slate-350 font-semibold">{value}</span>} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800">
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-4">Top Modules by Log Count</h3>
                    <div className="h-64 flex flex-col justify-center">
                      {!hasBarData ? (
                        <div className="flex flex-col items-center justify-center text-center space-y-3 py-6">
                          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full">
                            <Terminal className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No chart data available.</p>
                            <p className="text-[10px] text-slate-500 mt-1">No active modules found in log telemetry.</p>
                          </div>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip 
                              cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                              contentStyle={{ 
                                backgroundColor: darkMode ? '#0f172a' : '#ffffff', 
                                borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                                color: darkMode ? '#f1f5f9' : '#0f172a',
                                fontSize: '11px',
                                borderRadius: '8px'
                              }}
                              itemStyle={{ color: darkMode ? '#f1f5f9' : '#0f172a' }}
                              labelStyle={{ color: darkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {/* Raw logs list */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/30 dark:border-slate-900">
                  <h3 className="text-md font-bold mb-4 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-violet-500" /> Raw Logs (Sample - First 100 entries)
                  </h3>
                  <div className="overflow-x-auto max-h-96 rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-650 border-b border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 sticky top-0">
                        <tr>
                          <th className="p-3">Line</th>
                          <th className="p-3">Timestamp</th>
                          <th className="p-3">Level</th>
                          <th className="p-3">Module</th>
                          <th className="p-3">Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                        {data?.logsSample?.map((log, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/20">
                            <td className="p-3 font-mono text-[10px] text-slate-500">{log.lineNumber || (idx + 1)}</td>
                            <td className="p-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.level === 'FATAL' ? 'bg-red-100 text-red-700' :
                                log.level === 'ERROR' ? 'bg-red-50 text-red-600' :
                                log.level === 'WARNING' ? 'bg-amber-50 text-amber-600' :
                                log.level === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' :
                                'bg-blue-50 text-blue-600'
                              }`}>
                                {log.level}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-slate-700 font-mono text-[11px] dark:text-slate-300">{log.module}</td>
                            <td className="p-3 text-slate-600 font-mono text-[11px] break-all dark:text-slate-400">{log.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. LOG DIAGNOSIS & AI RECOMMENDATIONS */}
            {activeTab === 'analysis' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-md bg-gradient-to-tr from-violet-500/5 to-indigo-500/5 dark:bg-slate-900/40 dark:border-slate-800 dark:from-violet-950/20 dark:to-indigo-950/20 shadow-violet-500/5">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-4">
                      <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
                      AI-Powered Diagnostic Analysis
                    </h3>

                    {data?.aiAnalysis ? (
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">Executive Summary</h4>
                          <p className="text-slate-800 dark:text-slate-200 leading-relaxed text-sm">{data.aiAnalysis.executiveSummary}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2 space-y-2">
                            <h4 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">Root Cause Analysis</h4>
                            <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-300">
                              {data.aiAnalysis.rootCause}
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">Severity Impact</h4>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-650 border border-red-500/30">
                                <AlertOctagon className="w-3.5 h-3.5" />
                                {data.aiAnalysis.severity || 'High'}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">Culprit Module</h4>
                              <span className="inline-block px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono dark:bg-slate-800 dark:border-slate-800 dark:text-slate-200">
                                {data.aiAnalysis.affectedModule || 'authService'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800/50">
                          <div>
                            <h4 className="text-xs font-semibold text-amber-600 tracking-wider uppercase mb-2 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Recommended Action Fixes
                            </h4>
                            <div className="text-slate-800 dark:text-slate-300 text-sm whitespace-pre-line leading-relaxed">
                              {data.aiAnalysis.recommendedFix}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold text-violet-600 tracking-wider uppercase mb-2 flex items-center gap-1">
                              <BrainCircuit className="w-4 h-4" /> Preventive Measures
                            </h4>
                            <div className="text-slate-800 dark:text-slate-300 text-sm whitespace-pre-line leading-relaxed">
                              {data.aiAnalysis.preventiveMeasures}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 space-y-3">
                        <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
                        <p className="text-sm">Evaluating logs on Groq Llama AI...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column Chat widget */}
                <div className="lg:col-span-1 flex flex-col bg-white border border-slate-200 rounded-2xl h-[calc(100vh-220px)] dark:bg-slate-900/40 dark:border-slate-800">
                  <div className="p-4 border-b border-slate-200 flex items-center gap-2 dark:border-slate-800">
                    <MessageSquare className="w-4.5 h-4.5 text-violet-500" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Incident Assistant</h3>
                      <p className="text-[10px] text-slate-500">Ask questions about logs</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <div className="p-1.5 rounded-full bg-violet-600 text-white text-[9px] font-bold mt-0.5">AI</div>
                      <div className="p-3 rounded-2xl bg-slate-100 text-slate-800 text-xs leading-relaxed dark:bg-slate-800 dark:text-slate-200">
                        Ask me anything about the anomalies detected. Try: <em>"Why did this fail?"</em> or <em>"How do we fix the DB timeout?"</em>
                      </div>
                    </div>

                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex items-start gap-2 max-w-[90%] ${msg.sender === 'user' ? 'ml-auto justify-end' : ''}`}>
                        {msg.sender === 'ai' && (
                          <div className="p-1.5 rounded-full bg-violet-600 text-white text-[9px] font-bold mt-0.5 flex-shrink-0">AI</div>
                        )}
                        <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} gap-0.5`}>
                          <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                            msg.sender === 'user' ? 'bg-violet-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none dark:bg-slate-800 dark:text-slate-200'
                          }`}>
                            {msg.text}
                          </div>
                          {msg.timestamp && (
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 px-1">{msg.timestamp}</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 rounded-full bg-violet-600 text-white text-[9px] font-bold mt-0.5">AI</div>
                        <div className="p-3 rounded-2xl bg-slate-100 text-slate-400 text-xs flex items-center gap-1.5 dark:bg-slate-800">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-500" />
                          Analyzing...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-800/80">
                    <div className="relative">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask a question..."
                        disabled={!data || chatLoading}
                        className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-202 rounded-xl text-xs focus:outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim() || !data || chatLoading}
                        className="absolute right-1.5 top-1.5 p-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-30"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. UPLOAD HISTORY METADATA TABLE */}
            {activeTab === 'history' && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/30 dark:border-slate-900 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-md font-bold text-slate-900 dark:text-slate-100">Audit History & Knowledge Repository</h3>
                    <p className="text-xs text-slate-500">Persistent list of all uploads across active sessions</p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-650 border-b border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                      <tr>
                        <th className="p-3">File Name</th>
                        <th className="p-3">Upload Date & Time</th>
                        <th className="p-3">File Size</th>
                        <th className="p-3">Analysis Status</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-205 dark:divide-slate-800/60">
                      {uploadHistory.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-slate-400 dark:text-slate-500">
                            No logs uploaded yet.
                          </td>
                        </tr>
                      ) : (
                        uploadHistory.map((item) => {
                          const isRenaming = renameId === item.id;
                          const dateStr = new Date(item.uploadDate).toLocaleString();
                          
                          // size calculation
                          let sizeStr = '0 B';
                          if (item.fileSize) {
                            const k = 1024;
                            const sizes = ['B', 'KB', 'MB'];
                            const i = Math.floor(Math.log(item.fileSize) / Math.log(k));
                            sizeStr = parseFloat((item.fileSize / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                          }

                          return (
                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/20">
                              <td className="p-3 font-semibold text-slate-700 dark:text-slate-200 font-mono">
                                {isRenaming ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={renameVal}
                                      onChange={(e) => setRenameVal(e.target.value)}
                                      className="px-2 py-1 rounded border border-slate-350 bg-white text-xs text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                                    />
                                    <button
                                      onClick={(e) => renameHistoryItem(e, item.id)}
                                      className="px-2 py-1 rounded bg-violet-600 text-white text-[10px] font-bold"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setRenameId(null)}
                                      className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => selectHistoryItem(item.id)}
                                    className="hover:underline hover:text-violet-500 text-left"
                                  >
                                    {item.filename}
                                  </button>
                                )}
                              </td>
                              <td className="p-3 text-slate-500 dark:text-slate-400">{dateStr}</td>
                              <td className="p-3 text-slate-500 dark:text-slate-400">{sizeStr}</td>
                              <td className="p-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.status === 'analyzed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400' :
                                  item.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400' :
                                  'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-400'
                                }`}>
                                  {item.status || 'analyzed'}
                                </span>
                              </td>
                              <td className="p-3 flex items-center gap-2">
                                <button
                                  onClick={() => selectHistoryItem(item.id)}
                                  className="text-xs font-semibold px-2 py-1 rounded bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400"
                                >
                                  Open
                                </button>
                                <button
                                  onClick={(e) => {
                                    setRenameId(item.id);
                                    setRenameVal(item.filename);
                                  }}
                                  className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                                >
                                  Rename
                                </button>
                                <button
                                  onClick={(e) => reanalyzeHistoryItem(e, item.id)}
                                  className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                                >
                                  Re-analyze
                                </button>
                                <button
                                  onClick={(e) => deleteHistoryItem(e, item.id)}
                                  className="text-xs font-semibold px-2 py-1 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-450"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 4. USER PROFILE */}
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Profile Card Summary */}
                <div className="md:col-span-1 p-6 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 flex flex-col items-center text-center space-y-4">

                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">{user.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      {user.accountType || 'Developer'}
                    </span>
                  </div>

                  <div className="w-full border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-2 text-left text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Account Created</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Log Uploads</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{uploadHistory.length}</span>
                    </div>
                  </div>
                </div>

                {/* Profile Editor form */}
                <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 space-y-4">
                  <h3 className="text-md font-bold text-slate-900 dark:text-slate-100">Update Profile Details</h3>
                  <p className="text-xs text-slate-500">Change your public profile details and account metadata.</p>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">Full Name</label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Alex Mercer"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 caret-violet-600 dark:caret-violet-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">Account Type</label>
                      <select
                        value={profileAccountType}
                        onChange={(e) => setProfileAccountType(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                      >
                        <option value="Developer" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Developer</option>
                        <option value="SRE Engineer" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">SRE Engineer</option>
                        <option value="DevOps Lead" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">DevOps Lead</option>
                        <option value="System Architect" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">System Architect</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-violet-650 hover:bg-violet-605 text-white font-semibold text-xs shadow-md transition-all"
                    >
                      Save Changes
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 5. SYSTEM SETTINGS */}
            {activeTab === 'settings' && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 space-y-6">
                <div>
                  <h3 className="text-md font-bold text-slate-900 dark:text-slate-100">System Preferences</h3>
                  <p className="text-xs text-slate-500">Customize the user experience and clear local storage credentials.</p>
                </div>

                <div className="max-w-md space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dark Theme Mode</span>
                      <p className="text-[10px] text-slate-550">Toggle dark mode visual layout</p>
                    </div>
                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        darkMode ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {darkMode ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-red-500">Cache Reset</span>
                      <p className="text-[10px] text-slate-550">Clears auth tokens and logs out</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-lg bg-red-500/10 text-red-650 hover:bg-red-500/20 text-xs font-bold transition-all"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
            )}

              </>
            )}
          </div>
        )}
        </div>

      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500 dark:border-slate-900 dark:bg-slate-950/40">
        © 2026 LogPilot AI Platform. Operating under safe execution modes.
      </footer>

    </div>
  );
}

export default App;
