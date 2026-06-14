import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel, ArrowLeft, Home } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-['Outfit'] relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-navy-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 -right-20 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />

      <div className="relative z-10 text-center space-y-10 max-w-lg">
        <div className="inline-flex p-5 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl">
          <Gavel className="text-blue-400" size={56} />
        </div>

        <div className="space-y-4">
          <h1 className="text-[120px] font-black text-white/10 leading-none tracking-tighter">404</h1>
          <h2 className="text-3xl font-black text-white tracking-tight -mt-6">Page introuvable</h2>
          <p className="text-slate-400 font-medium">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all"
          >
            <ArrowLeft size={18} /> Retour
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 transition-all"
          >
            <Home size={18} /> Accueil
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
