import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Gavel, Mail, Lock, AlertCircle, Loader2, ShieldCheck, ArrowRight, Clock, XCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabaseClient';
import { api } from '../services/api';

const loginSchema = z.object({
  email: z.string().email('Email professionnel requis'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

const Login = () => {
  const navigate = useNavigate();
  const { login, refreshProfile } = useAuthStore();
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState(null); // null | 'pending' | 'refused' | 'suspended'
  const [refusalMotif, setRefusalMotif] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    setErrorType(null);
    setRefusalMotif('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        const msg = authError.message || '';
        // Backend Supabase injoignable (projet en pause, réseau coupé) : fetch échoue
        const isNetwork =
          authError.name === 'AuthRetryableFetchError' ||
          authError.status === 0 ||
          /failed to fetch|networkerror|load failed|fetch/i.test(msg);
        if (isNetwork) {
          throw new Error("Service momentanément indisponible : le serveur d'authentification est injoignable. Réessayez dans quelques instants.");
        }
        if (authError.code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) {
          throw new Error("Votre email n'a pas encore été confirmé. Vérifiez votre boîte mail (pensez aux spams).");
        }
        if (authError.status === 429 || /rate limit/i.test(msg)) {
          throw new Error('Trop de tentatives de connexion. Patientez quelques instants avant de réessayer.');
        }
        throw new Error('Identifiants incorrects. Vérifiez votre email et mot de passe.');
      }

      const user = authData.user;

      // Vérifier le statut du compte AVANT de loguer l'utilisateur
      const statut = await api.getStatutCompte(user.id);

      if (statut) {
        if (statut.statut_compte === 'pending') {
          await supabase.auth.signOut();
          setErrorType('pending');
          setError('Votre compte est en attente de validation par l\'administration. Vous recevrez une notification dès qu\'il sera approuvé.');
          return;
        }
        if (statut.statut_compte === 'refuse') {
          await supabase.auth.signOut();
          setErrorType('refused');
          setRefusalMotif(statut.motif_refus || '');
          setError('Votre demande d\'inscription a été refusée.');
          return;
        }
        if (statut.statut_compte === 'suspendu' || statut.actif === false) {
          await supabase.auth.signOut();
          setErrorType('suspended');
          setError('Votre compte a été suspendu. Contactez l\'administration.');
          return;
        }
      }

      // Compte approuvé → on continue
      login({
        id: user.id,
        email: user.email,
        nom:    user.user_metadata?.nom    || '',
        prenom: user.user_metadata?.prenom || '',
        role:   user.user_metadata?.role   || 'huissier',
        date_creation: user.created_at,
      });

      await refreshProfile();
      navigate('/dashboard');

    } catch (err) {
      setError(err.message || 'Erreur de connexion au serveur sécurisé.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] p-6 relative overflow-hidden font-['Outfit']">
      {/* Background Orbs */}
      <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-navy-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-0 -right-20 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-[450px] relative z-10 space-y-8 animate-slide-up">
        {/* Logo Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-5 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl shadow-navy-500/20">
            <Gavel className="text-blue-400" size={48} />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Portail <span className="text-blue-500">Sécurisé</span></h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.3em]">JusticeTchad National</p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="glass-card p-10 rounded-[3rem] shadow-2xl border-white/5 space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Connexion</h2>
            <p className="text-slate-400 text-sm">Authentification biométrique et numérique requise.</p>
          </div>

          {error && errorType === 'pending' && (
            <div className="bg-amber-500/10 text-amber-300 p-5 rounded-2xl border border-amber-500/30 flex items-start gap-3 animate-shake">
              <Clock size={20} className="shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-1">Compte en attente</p>
                <p className="text-xs font-medium leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {error && errorType === 'refused' && (
            <div className="bg-red-500/10 text-red-400 p-5 rounded-2xl border border-red-500/30 flex items-start gap-3 animate-shake">
              <XCircle size={20} className="shrink-0 mt-0.5 text-red-400" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-1">Demande refusée</p>
                <p className="text-xs font-medium leading-relaxed">{error}</p>
                {refusalMotif && (
                  <p className="text-xs font-medium mt-2 italic text-red-300">
                    Motif : « {refusalMotif} »
                  </p>
                )}
              </div>
            </div>
          )}

          {error && errorType === 'suspended' && (
            <div className="bg-orange-500/10 text-orange-300 p-5 rounded-2xl border border-orange-500/30 flex items-start gap-3 animate-shake">
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-orange-400" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-1">Compte suspendu</p>
                <p className="text-xs font-medium leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {error && !errorType && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-red-500/20 animate-shake">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Matricule</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                <input
                  {...register('email')}
                  type="email"
                  className={`w-full pl-12 pr-4 py-4 bg-white/5 border rounded-2xl outline-none transition-all focus:ring-4 focus:ring-blue-500/10 text-white font-medium ${
                    errors.email ? 'border-red-500/50' : 'border-white/10 group-hover:border-white/20'
                  }`}
                  placeholder="nom@tribunal.td"
                />
              </div>
              {errors.email && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Clé d'Accès</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                <input
                  {...register('password')}
                  type="password"
                  className={`w-full pl-12 pr-4 py-4 bg-white/5 border rounded-2xl outline-none transition-all focus:ring-4 focus:ring-blue-500/10 text-white font-medium ${
                    errors.password ? 'border-red-500/50' : 'border-white/10 group-hover:border-white/20'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.password.message}</p>}
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full btn btn-primary !py-4 shadow-2xl shadow-blue-500/20 group overflow-hidden relative"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    Authentification
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest px-2">
            <button
              onClick={() => navigate('/forgot-password')}
              type="button"
              className="text-slate-500 hover:text-white transition-colors"
            >
              Mot de passe oublié ?
            </button>
            <button
              onClick={() => navigate('/register')}
              type="button"
              className="text-blue-500 hover:text-blue-400 transition-colors"
            >
              Créer un compte
            </button>
          </div>

          <div className="pt-6 text-center border-t border-white/5">
            <button
              onClick={() => navigate('/support')}
              type="button"
              className="text-[10px] font-black text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-[0.2em]"
            >
              Besoin d'aide technique ?
            </button>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-3 text-slate-600">
          <ShieldCheck size={16} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sécurisé par Encryption AES-256</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
