import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Gavel,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Briefcase,
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';

import { supabase } from '../lib/supabaseClient';

// Fix 4 : validation mot de passe renforcée
const validatePassword = (pwd) => {
  if (!pwd || pwd.length < 8)  return 'Minimum 8 caractères requis';
  if (!/[A-Z]/.test(pwd))      return 'Au moins une lettre majuscule requise';
  if (!/[0-9]/.test(pwd))      return 'Au moins un chiffre requis';
  return null;
};

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading]     = useState(false);
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    role: 'avocat'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Fix 4 : validation côté client
    const pwdError = validatePassword(formData.password);
    if (pwdError) { setFormError(pwdError); return; }
    if (!formData.nom.trim() || !formData.prenom.trim()) {
      setFormError('Le nom et le prénom sont obligatoires.'); return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nom:    formData.nom,
            prenom: formData.prenom,
            role:   formData.role,
          }
        }
      });

      if (error) throw error;

      // Si Supabase a renvoyé une session (confirmation email désactivée),
      // on la coupe pour forcer le flux validation admin.
      // Sinon (confirmation email active), session est déjà null et signOut est no-op.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await supabase.auth.signOut();

      // Affiche l'écran de confirmation avec instructions claires
      setSubmitted(true);
    } catch (error) {
      setFormError(error.message || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  // Écran de confirmation après inscription réussie
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-['Outfit'] overflow-hidden relative">
        <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px]"></div>

        <div className="w-full max-w-xl relative z-10">
          <div className="glass-card p-12 rounded-[3rem] border-white/5 space-y-8 shadow-2xl text-center">
            <div className="inline-flex p-5 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
              <CheckCircle2 className="text-emerald-500" size={48} />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-white tracking-tight">
                Demande <span className="text-emerald-500">enregistrée</span>
              </h1>
              <p className="text-slate-400 font-medium leading-relaxed">
                Votre demande d'inscription a bien été reçue pour le rôle{' '}
                <span className="text-white font-black uppercase">
                  {formData.role.replace(/_/g, ' ')}
                </span>.
              </p>
            </div>

            <div className="space-y-4 text-left">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-4">
                <Clock className="text-amber-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-amber-300 text-xs font-black uppercase tracking-widest mb-1">Étape 1 — Confirmer votre email</p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Un lien de confirmation a été envoyé à <span className="text-white font-bold">{formData.email}</span>.
                    Cliquez dessus pour activer techniquement votre compte.
                  </p>
                </div>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 flex items-start gap-4">
                <ShieldCheck className="text-blue-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-blue-300 text-xs font-black uppercase tracking-widest mb-1">Étape 2 — Validation par l'administration</p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Un super-administrateur examinera votre demande et validera le rôle attribué.
                    Vous pourrez vous connecter une fois la validation effectuée.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3"
            >
              Retour à la connexion
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-['Outfit'] overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-navy-600/20 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-xl relative z-10">
        <div className="glass-card p-12 rounded-[3rem] border-white/5 space-y-10 shadow-2xl">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-blue-500/10 rounded-3xl border border-blue-500/20">
              <Gavel className="text-blue-500" size={40} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Créer un <span className="text-blue-500">Compte</span></h1>
            <p className="text-slate-400 font-medium">Rejoignez la plateforme officielle JusticeTchad.</p>
          </div>

          {/* Avertissement visible dès le formulaire */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
            <Clock className="text-amber-400 shrink-0 mt-0.5" size={18} />
            <p className="text-amber-300 text-[11px] font-medium leading-relaxed">
              Votre demande d'inscription sera soumise à validation par un super-administrateur.
              Le rôle que vous choisissez ci-dessous est une <span className="font-black">demande</span> :
              il pourra être confirmé, modifié ou refusé.
            </p>
          </div>

          {formError && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-red-500/20">
              <AlertCircle size={18} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Prénom</label>
                 <div className="relative group">
                   <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                   <input
                    type="text"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                    placeholder="Ex: Salim"
                    onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                   />
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Nom</label>
                 <div className="relative group">
                   <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                   <input
                    type="text"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                    placeholder="Ex: Fatime"
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                   />
                 </div>
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Adresse Email Professionnelle</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                  placeholder="nom@justice.td"
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Rôle demandé</label>
              <div className="relative group">
                <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold appearance-none cursor-pointer"
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="juge"         className="bg-slate-900">Juge</option>
                  <option value="procureur"   className="bg-slate-900">Procureur de la République</option>
                  <option value="avocat"      className="bg-slate-900">Avocat</option>
                  <option value="greffier"    className="bg-slate-900">Greffier</option>
                  <option value="huissier"    className="bg-slate-900">Huissier de Justice</option>
                  <option value="notaire"     className="bg-slate-900">Notaire</option>
                  <option value="gestionnaire" className="bg-slate-900">Gestionnaire</option>
                </select>
                <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 rotate-90" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Mot de passe sécurisé</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="password"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                  placeholder="••••••••••••"
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <p className="text-[10px] text-slate-500 font-bold ml-4">
                Min. 8 caractères · 1 majuscule · 1 chiffre
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
               <ShieldCheck size={20} className="text-emerald-500" />
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vos données sont protégées par chiffrement AES-256 au Tchad.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 group"
            >
              {loading ? 'CRÉATION EN COURS...' : 'CRÉER MON COMPTE'}
              {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="text-center">
            <p className="text-slate-500 font-bold text-sm">
              Déjà un compte ? <Link to="/login" className="text-blue-500 hover:underline">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
