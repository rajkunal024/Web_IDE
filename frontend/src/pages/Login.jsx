import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiChevronRight, FiAlertCircle } from 'react-icons/fi';

const Login = () => {
  const navigate = useNavigate();
  const { login, enterGuest } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('All fields are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login error occurred');
    } finally {
      setLoading(false);
    }
  };



  const handleTryGuest = () => {
    enterGuest();
    navigate('/playground');
  };

  return (
    <div className="min-h-screen bg-[#09080F] text-slate-100 font-sans flex items-center justify-center p-6 relative">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/10 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md glass p-8 rounded-2xl border border-white/5 shadow-2xl relative z-10 fade-in">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('/')}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
            Ω
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
            AETHER STUDIO
          </span>
        </div>

        <h2 className="text-2xl font-bold text-center mb-1 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Welcome Back</h2>
        <p className="text-slate-500 text-xs text-center mb-6">Enter details to launch your development suite</p>

        {error && (
          <div className="flex items-center gap-2 p-3.5 mb-6 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl">
            <FiAlertCircle className="shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">Email Address</label>
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@aether.io"
                className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/5 focus:border-purple-500/50 rounded-xl outline-none text-sm transition duration-300 focus:bg-white/[0.04]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5 pl-1">
              <label className="text-xs font-semibold text-slate-400">Password</label>
              <button 
                type="button" 
                onClick={() => navigate('/reset-password')}
                className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition outline-none"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/5 focus:border-purple-500/50 rounded-xl outline-none text-sm transition duration-300 focus:bg-white/[0.04]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-6 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 text-white flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
          >
            {loading ? 'Initiating...' : 'Log In'} <FiChevronRight />
          </button>
        </form>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-white/5"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-600 font-bold uppercase tracking-wider">or</span>
          <div className="flex-grow border-t border-white/5"></div>
        </div>

        <div className="space-y-3.5">
          <button
            onClick={handleTryGuest}
            className="w-full py-3 rounded-xl font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition duration-300 cursor-pointer text-sm"
          >
            Access in Guest Mode
          </button>

          <p className="text-center text-xs text-slate-500">
            Don&apos;t have an account?{' '}
            <button 
              onClick={() => navigate('/register')}
              className="text-purple-400 font-bold hover:text-purple-300 transition"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>

    </div>
  );
};

export default Login;