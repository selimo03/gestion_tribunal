import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle, Gavel } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setStatus('success');
        setTimeout(() => navigate('/login'), 3000);
      } else if (event === 'TOKEN_REFRESHED') {
        setStatus('success');
        setTimeout(() => navigate('/login'), 3000);
      }
    });

    // Timeout si rien ne se passe
    const timeout = setTimeout(() => {
      if (status === 'loading') setStatus('error');
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-['Outfit'] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]" />

      <div className="w-full max-w-md relative z-10">
        <div className="glass-card p-12 rounded-[3rem] border-white/5 shadow-2xl text-center space-y-8">
          <div className="inline-flex p-4 bg-white/5 rounded-3xl border border-white/10">
            <Gavel className="text-blue-400" size={40} />
          </div>

          {status === 'loading' && (
            <>
              <Loader2 className="animate-spin text-blue-400 mx-auto" size={48} />
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">Confirmation en cours...</h2>
                <p className="text-slate-400">Vérification de votre adresse email.</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="p-4 bg-emerald-500/20 rounded-full text-emerald-400 inline-flex mx-auto">
                <CheckCircle2 size={48} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">Email confirmé !</h2>
                <p className="text-slate-400">Votre compte est activé. Redirection vers la connexion...</p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="p-4 bg-red-500/20 rounded-full text-red-400 inline-flex mx-auto">
                <XCircle size={48} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">Lien invalide</h2>
                <p className="text-slate-400">Le lien de confirmation a expiré ou est invalide.</p>
              </div>
              <button onClick={() => navigate('/login')} className="btn btn-primary w-full !py-4">
                Retour à la connexion
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmail;
