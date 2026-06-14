import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  ArrowLeft,
  Send,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) throw resetError;
      setIsSent(true);
    } catch (err) {
      setError(err.message || "Erreur lors de l'envoi. Vérifiez votre email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-['Outfit'] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]"></div>

      <div className="w-full max-w-lg relative z-10">
        <div className="glass-card p-12 rounded-[3rem] border-white/5 space-y-10 shadow-2xl">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-amber-500/10 rounded-3xl border border-amber-500/20">
              <ShieldAlert className="text-amber-500" size={40} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Accès <span className="text-amber-500">Oublié</span></h1>
            <p className="text-slate-400 font-medium">Récupérez vos accès sécurisés JusticeTchad.</p>
          </div>

          {!isSent ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-red-500/20">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Votre Email Professionnel</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all font-bold"
                    placeholder="nom@justice.td"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-navy-900 font-black py-5 rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-3 group"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>ENVOYER LE LIEN <Send size={20} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-8 py-4">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-emerald-500/20 rounded-full text-emerald-400">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-2xl font-black text-white">Email Envoyé !</h2>
                <p className="text-slate-400 font-medium">
                  Si l'adresse <strong className="text-white">{email}</strong> est enregistrée dans le système, vous recevrez un lien de réinitialisation dans quelques minutes.
                </p>
                <p className="text-slate-500 text-sm">Pensez à vérifier vos spams.</p>
              </div>
              <button onClick={() => navigate('/login')} className="btn btn-primary w-full !py-4">
                Retour à la connexion
              </button>
            </div>
          )}

          <div className="text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-white font-bold text-sm transition-colors uppercase tracking-widest">
              <ArrowLeft size={16} /> Retour en arrière
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
