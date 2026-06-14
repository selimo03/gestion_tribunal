import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, Loader2, AlertCircle, Gavel } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase envoie le token via le hash de l'URL
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8)       { setError('Minimum 8 caractères.'); return; }
    if (!/[A-Z]/.test(password))   { setError('Au moins une majuscule requise.'); return; }
    if (!/[0-9]/.test(password))   { setError('Au moins un chiffre requis.'); return; }
    if (password !== confirm)      { setError('Les mots de passe ne correspondent pas.'); return; }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-['Outfit'] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]" />

      <div className="w-full max-w-lg relative z-10">
        <div className="glass-card p-12 rounded-[3rem] border-white/5 space-y-10 shadow-2xl">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-blue-500/10 rounded-3xl border border-blue-500/20">
              <Gavel className="text-blue-400" size={40} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Nouveau <span className="text-blue-500">Mot de passe</span>
            </h1>
            <p className="text-slate-400 font-medium">Définissez votre nouvelle clé d'accès sécurisée.</p>
          </div>

          {success ? (
            <div className="text-center space-y-6 py-4">
              <div className="p-4 bg-emerald-500/20 rounded-full text-emerald-400 inline-flex">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-2xl font-black text-white">Mot de passe modifié !</h2>
              <p className="text-slate-400">Redirection vers la connexion dans 3 secondes...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-red-500/20">
                  <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
              )}
              {!sessionReady && (
                <div className="bg-amber-500/10 text-amber-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-amber-500/20">
                  <AlertCircle size={16} className="shrink-0" />
                  En attente de validation du lien... Assurez-vous d'avoir cliqué sur le lien depuis votre email.
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Nouveau mot de passe</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                    placeholder="••••••••••••" />
                </div>
                <p className="text-[10px] text-slate-500 font-bold ml-4">Min. 8 caractères · 1 majuscule · 1 chiffre</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Confirmer le mot de passe</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                    placeholder="••••••••••••" />
                </div>
              </div>
              <button type="submit" disabled={loading || !sessionReady}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3">
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Enregistrer le nouveau mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
