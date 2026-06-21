import { useNavigate } from 'react-router-dom';

const NoPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#09080F] text-slate-100 font-sans flex flex-col items-center justify-center p-6 text-center">
      <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20 mb-8 text-xl">
        Ω
      </div>
      <h1 className="text-8xl font-extrabold bg-gradient-to-b from-white via-slate-100 to-slate-500 bg-clip-text text-transparent leading-none mb-4">404</h1>
      <h2 className="text-xl font-bold mb-4 text-purple-400">Sandbox Lost in Space</h2>
      <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">
        The workspace you are looking for does not exist or has been deleted from Aether Studio.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition text-sm cursor-pointer shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20"
      >
        Return to Safety
      </button>
    </div>
  );
};

export default NoPage;