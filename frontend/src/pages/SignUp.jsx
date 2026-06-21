const SignUp = () => {
  const navigate = useNavigate();
  const { register, enterGuest } = useAuth();

  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !name || !email || !password) {
      setError('All fields are required');
      return;
    }
    if (password.length < 8 || password.length > 15) {
      setError('Password must be between 8 and 15 characters long');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await register(userId, name, email, password);
      if (res.success) {
        setSuccess('Registration successful! Redirecting to login page...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09080F] text-slate-100 font-sans flex items-center justify-center p-6 relative">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/10 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md glass p-8 rounded-2xl border border-white/5 shadow-2xl relative z-10 fade-in">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-6 cursor-pointer" onClick={() => navigate('/')}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
            Ω
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
            AETHER STUDIO
          </span>
        </div>

        <h2 className="text-2xl font-bold text-center mb-1 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Create Account</h2>
        <p className="text-slate-500 text-xs text-center mb-6">Create a free sandbox workspace profile</p>

        {error && (
          <div className="flex items-center gap-2 p-3.5 mb-6 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl">
            <FiAlertCircle className="shrink-0" /> {error}
          </div>
        )}

        {success && (
          <div className="p-3.5 mb-6 text-sm text-green-400 bg-green-950/20 border border-green-900/40 rounded-xl">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">Unique User ID</label>
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="kunal_dev"
                className="w-full pl-11 pr-4 py-2.5 bg-white/[0.02] border border-white/5 focus:border-purple-500/50 rounded-xl outline-none text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">Full Name</label>
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Kunal Raj"
                className="w-full pl-11 pr-4 py-2.5 bg-white/[0.02] border border-white/5 focus:border-purple-500/50 rounded-xl outline-none text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">Email Address</label>
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kunal@aether.io"
                className="w-full pl-11 pr-4 py-2.5 bg-white/[0.02] border border-white/5 focus:border-purple-500/50 rounded-xl outline-none text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">Password (8-15 chars)</label>
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-11 pr-4 py-2.5 bg-white/[0.02] border border-white/5 focus:border-purple-500/50 rounded-xl outline-none text-sm transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-6 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 text-white flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Register'} <FiChevronRight />
          </button>
        </form>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-white/5"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-600 font-bold uppercase tracking-wider">or</span>
          <div className="flex-grow border-t border-white/5"></div>
        </div>

        <div className="space-y-3.5">
          <button
            onClick={() => { enterGuest(); navigate('/playground'); }}
            className="w-full py-3 rounded-xl font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition duration-300 cursor-pointer text-sm"
          >
            Access in Guest Mode
          </button>

          <p className="text-center text-xs text-slate-500">
            Already have an account?{' '}
            <button 
              onClick={() => navigate('/login')}
              className="text-purple-400 font-bold hover:text-purple-300 transition"
            >
              Log In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiChevronRight, FiAlertCircle, FiUser } from 'react-icons/fi';

export default SignUp;