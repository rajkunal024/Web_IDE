import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCode, FiZap, FiLock, FiCpu, FiHelpCircle, FiChevronRight, FiDollarSign } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
  const navigate = useNavigate();
  const { token, isGuest, enterGuest } = useAuth();

  const handleGetStarted = () => {
    if (token) {
      navigate('/dashboard');
    } else if (isGuest) {
      navigate('/playground');
    } else {
      navigate('/login');
    }
  };

  const handleTryGuest = () => {
    enterGuest();
    navigate('/playground');
  };

  return (
    <div className="min-h-screen bg-[#09080F] text-slate-100 font-sans overflow-hidden selection:bg-purple-500 selection:text-white relative">
      {/* Background radial glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/10 blur-[140px] pointer-events-none" />

      {/* Floating Header */}
      <header className="fixed top-0 left-0 w-full z-50 glass border-b border-white/5 px-6 md:px-16 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
            Ω
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
            AETHER STUDIO
          </span>
        </div>
        <div className="flex items-center gap-4">
          {token ? (
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition duration-300 cursor-pointer"
            >
              Go to Workspace
            </button>
          ) : (
            <>
              {isGuest && (
                <button 
                  onClick={() => navigate('/playground')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition duration-300 cursor-pointer"
                >
                  Go to Playground
                </button>
              )}
              <button 
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-xl text-sm font-semibold hover:text-purple-300 transition duration-300 cursor-pointer"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-md shadow-purple-500/10 hover:shadow-purple-500/25 transition duration-300 cursor-pointer"
              >
                Register
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 md:px-16 text-center max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[90vh]">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 mb-6">
            <FiZap className="animate-pulse" /> The Future of Browser Development is Here
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold leading-[1.1] tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent mb-8"
        >
          Code, Compile & Deploy <br />
          <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-teal-400 bg-clip-text text-transparent">
            Without Limitations.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed"
        >
          Welcome to Aether Studio. A premium, browser-based online IDE designed to run isolated compiler sandboxes, stream execution logs in real-time, and manage files seamlessly.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button
            onClick={handleGetStarted}
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-xl shadow-purple-500/15 hover:shadow-purple-500/30 hover:scale-[1.02] transition duration-300 flex items-center justify-center gap-2 cursor-pointer text-white"
          >
            Start Coding Now <FiChevronRight />
          </button>
          <button
            onClick={handleTryGuest}
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-[1.02] transition duration-300 flex items-center justify-center gap-2 cursor-pointer"
          >
            Enter Guest Mode
          </button>
        </motion.div>
      </section>

      {/* Editor Mock Live Preview */}
      <section className="py-12 px-6 md:px-16 max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="glass-dark rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative"
        >
          {/* Editor Header */}
          <div className="bg-slate-950/80 px-4 py-3 flex justify-between items-center border-b border-white/5">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
            </div>
            <div className="text-xs font-mono text-slate-500">aether_session - python</div>
            <div className="w-10 h-3" />
          </div>
          {/* Main mock split */}
          <div className="flex flex-col md:flex-row h-96">
            {/* Editor Workspace */}
            <div className="flex-1 bg-slate-900/60 p-6 font-mono text-sm text-purple-300/90 overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-teal-400">def</span> <span className="text-blue-400">fibonacci</span>(n):<br />
                &nbsp;&nbsp;&nbsp;&nbsp;a, b = <span className="text-amber-400">0</span>, <span className="text-amber-400">1</span><br />
                &nbsp;&nbsp;&nbsp;&nbsp;for _ in <span className="text-blue-400">range</span>(n):<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;yield a<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;a, b = b, a + b<br /><br />
                {'print("Fibonacci series (10 terms):")'}<br />
                {'print(list(fibonacci(10)))'}
              </div>
              <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-500">
                <span>UTF-8 &nbsp;&nbsp;&nbsp; Python 3</span>
                <span className="text-green-500 font-bold px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20">READY</span>
              </div>
            </div>
            {/* Console */}
            <div className="w-full md:w-80 bg-black/90 p-6 font-mono text-sm border-t md:border-t-0 md:border-l border-white/5 flex flex-col">
              <div className="text-slate-500 uppercase tracking-widest text-xs font-bold mb-4">Console Output</div>
              <div className="flex-1 text-slate-300">
                <span className="text-purple-400 font-semibold">[Running] python main.py...</span><br />
                Fibonacci series (10 terms):<br />
                [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]<br /><br />
                <span className="text-green-400">Process exited successfully.</span>
              </div>
              <div className="text-xs text-slate-500 mt-4">Time: 12ms &nbsp;&nbsp;&nbsp; Mem: 1.2MB</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Showcase */}
      <section className="py-24 px-6 md:px-16 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Built for Elite Performance
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Experience coding with zero compromises on features, speeds, or user layout styling.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            whileHover={{ y: -5 }}
            className="glass p-8 rounded-2xl border border-white/5"
          >
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl mb-6 border border-purple-500/20">
              <FiCode />
            </div>
            <h3 className="text-xl font-bold mb-3">Monaco Editor</h3>
            <p className="text-slate-400 leading-relaxed">
              Fully integrated VS-code grade editor with code folding, autocomplete bracket closing, bracket matching, and multi-cursor support.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="glass p-8 rounded-2xl border border-white/5"
          >
            <div className="h-12 w-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center text-xl mb-6 border border-teal-500/20">
              <FiCpu />
            </div>
            <h3 className="text-xl font-bold mb-3">Isolated Sandboxes</h3>
            <p className="text-slate-400 leading-relaxed">
              Execution runs are hosted inside constrained compile and execution systems, defending against infinite cycles.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="glass p-8 rounded-2xl border border-white/5"
          >
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xl mb-6 border border-indigo-500/20">
              <FiLock />
            </div>
            <h3 className="text-xl font-bold mb-3">Nested Project Trees</h3>
            <p className="text-slate-400 leading-relaxed">
              Create complete directories structures, nest folders, duplicate files, drag & drop files to organize, and export projects cleanly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Supported Languages */}
      <section className="py-16 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6 md:px-16 text-center">
          <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-500 mb-8">Supported Execution Environments</h2>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {['Python', 'C', 'C++', 'Java', 'JavaScript', 'TypeScript', 'Go', 'Rust'].map((lang, idx) => (
              <span 
                key={idx} 
                className="text-lg md:text-xl font-semibold bg-gradient-to-r from-slate-400 to-slate-200 bg-clip-text text-transparent hover:from-purple-400 hover:to-indigo-300 transition duration-300"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section (UI Only) */}
      <section className="py-24 px-6 md:px-16 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">Pricing Plans</span>
          <h2 className="text-3xl md:text-5xl font-extrabold mt-2 mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Choose Your Sandbox Size
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Tier */}
          <div className="glass p-8 rounded-2xl border border-white/5 flex flex-col justify-between relative">
            <div>
              <h3 className="text-xl font-bold mb-2">Hobby Sandbox</h3>
              <div className="text-3xl font-extrabold flex items-center gap-1 mb-6">
                <FiDollarSign className="text-slate-400 text-2xl" />0 <span className="text-slate-500 text-sm font-normal">/ month</span>
              </div>
              <ul className="space-y-4 text-sm text-slate-400 mb-8">
                <li className="flex items-center gap-2">✓ Standard code run speeds</li>
                <li className="flex items-center gap-2">✓ Guest mode access</li>
                <li className="flex items-center gap-2">✓ Support for 8 languages</li>
                <li className="flex items-center gap-2">✓ 10-second compiler timeouts</li>
              </ul>
            </div>
            <button
              onClick={handleGetStarted}
              className="w-full py-3 rounded-xl font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition duration-300 cursor-pointer"
            >
              Sign Up Free
            </button>
          </div>

          {/* Premium Tier */}
          <div className="glass p-8 rounded-2xl border border-purple-500/25 flex flex-col justify-between relative shadow-lg shadow-purple-500/5">
            <div className="absolute top-4 right-4 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              POPULAR
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Studio Pro</h3>
              <div className="text-3xl font-extrabold flex items-center gap-1 mb-6 bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
                <FiDollarSign className="text-purple-400 text-2xl" />9 <span className="text-slate-500 text-sm font-normal">/ month</span>
              </div>
              <ul className="space-y-4 text-sm text-slate-400 mb-8">
                <li className="flex items-center gap-2">✓ Unlimited concurrent workspaces</li>
                <li className="flex items-center gap-2">✓ Custom CPU/Memory sandbox allocation</li>
                <li className="flex items-center gap-2">✓ Real-time collaboration rooms</li>
                <li className="flex items-center gap-2">✓ 24/7 priority support channel</li>
              </ul>
            </div>
            <button
              onClick={handleGetStarted}
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-md shadow-purple-500/10 hover:shadow-purple-500/25 transition duration-300 text-white cursor-pointer"
            >
              Unlock Pro Features
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6 md:px-16 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-6">
          {[
            {
              q: "How does Aether compilation sandboxes operate?",
              a: "When you execute code, our backend streams files to an isolated node environment on the host machine (or an container when Docker is deployed). The system handles compilation, feeds your custom inputs, and pipes the output stream directly back to your console."
            },
            {
              q: "Can I code without creating an account?",
              a: "Absolutely. By clicking 'Enter Guest Mode', you can instantly open our workspace. Guest projects are persisted locally in your browser storage so you don't lose progress."
            },
            {
              q: "Is there a limit on execution duration?",
              a: "For security reasons, executions in the standard tier are capped at 10 seconds. Pro sandboxes support customized thresholds."
            }
          ].map((faq, idx) => (
            <div key={idx} className="glass p-6 rounded-xl border border-white/5">
              <h4 className="font-semibold text-lg mb-2 flex items-center gap-2 text-indigo-300">
                <FiHelpCircle className="text-indigo-400 shrink-0" /> {faq.q}
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed pl-7">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-slate-500 text-sm">
        <p className="mb-4">© {new Date().getFullYear()} Aether Studio. All rights reserved.</p>
        <div className="flex justify-center gap-6">
          <a href="#" className="hover:text-slate-300 transition">Terms of Service</a>
          <a href="#" className="hover:text-slate-300 transition">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300 transition">Support</a>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
