import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiMail, FiLock, FiKey, FiArrowLeft, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

const ResetPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Validate OTP & Reset
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle requesting OTP (forgot password)
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setSuccess('OTP code has been generated. Check the backend server terminal console!');
        setStep(2);
      } else {
        setError(res.data.message || 'Failed to generate OTP');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error occurred while requesting OTP');
    } finally {
      setLoading(false);
    }
  };

  // Handle verifying OTP and updating password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 15) {
      setError('Password must be between 8 and 15 characters long');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        otp,
        newPassword
      });
      if (res.data.success) {
        setSuccess('Your password has been updated successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(res.data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP code or token has expired');
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
        <div className="flex items-center justify-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('/')}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
            Ω
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
            AETHER STUDIO
          </span>
        </div>

        <h2 className="text-2xl font-bold text-center mb-1 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          {step === 1 ? 'Recovery Center' : 'OTP Verification'}
        </h2>
        <p className="text-slate-500 text-xs text-center mb-6">
          {step === 1 
            ? 'Request a security code to verify password ownership' 
            : 'Enter the code generated in the backend console'
          }
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3.5 mb-6 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl">
            <FiAlertCircle className="shrink-0" /> {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3.5 mb-6 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-xl">
            <FiCheckCircle className="shrink-0" /> {success}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@aether.io"
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/5 focus:border-purple-500/50 rounded-xl outline-none text-sm transition duration-300 focus:bg-white/[0.04]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-6 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Get OTP Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">Verification OTP Code</label>
              <div className="relative">
                <FiKey className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-Digit Code"
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/5 focus:border-purple-500/50 rounded-xl outline-none text-sm font-mono tracking-widest transition duration-300 focus:bg-white/[0.04]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">New Password (8-15 chars)</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/5 focus:border-purple-500/50 rounded-xl outline-none text-sm transition duration-300 focus:bg-white/[0.04]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 pl-1">Confirm New Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/5 focus:border-purple-500/50 rounded-xl outline-none text-sm transition duration-300 focus:bg-white/[0.04]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-6 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="mt-6 flex justify-between items-center text-xs">
          {step === 2 && (
            <button 
              onClick={() => { setStep(1); setError(''); setSuccess(''); }} 
              className="text-slate-400 hover:text-slate-200 transition font-semibold"
            >
              Resend OTP
            </button>
          )}
          <button 
            onClick={() => navigate('/login')} 
            className="text-purple-400 font-bold hover:text-purple-300 transition flex items-center gap-1.5 ml-auto"
          >
            <FiArrowLeft /> Back to Log In
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResetPassword;
