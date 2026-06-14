import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Scale, Lock, Sparkles, Gavel } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#020617] transition-colors duration-500 overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-navy-500/10 dark:bg-navy-500/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[100px]"></div>
      </div>

      <PublicNavbar />

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center pt-24 sm:pt-40 pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-10 relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-navy-600 dark:text-navy-400 text-xs font-black uppercase tracking-[0.2em] shadow-sm">
            <Sparkles size={14} className="animate-pulse" />
            L'excellence judiciaire numérique
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-navy-900 dark:text-white tracking-tight leading-[0.95] sm:leading-[0.9]">
            Rendre la justice <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-navy-600 via-blue-500 to-navy-400">
              instantanée & sûre.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            JusticeTchad est la plateforme de référence pour la gestion des dossiers juridiques,
            le suivi des audiences et l'analyse statistique du système judiciaire.
          </p>

          <div className="flex items-center justify-center pt-4 sm:pt-6">
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg shadow-2xl shadow-navy-500/40 group"
            >
              Démarrer maintenant
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Floating Icons — desktop only */}
          <div className="absolute top-0 -left-20 hidden lg:block opacity-20">
            <Scale size={80} className="text-navy-900 dark:text-white" />
          </div>
          <div className="absolute bottom-0 -right-20 hidden lg:block opacity-20">
            <Lock size={80} className="text-navy-900 dark:text-white" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

            {/* Colonne 1 : Logo + description */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-navy-800 to-navy-600 p-2 rounded-xl">
                  <Gavel className="text-white" size={18} />
                </div>
                <span className="text-xl font-black text-navy-900 dark:text-white tracking-tighter">
                  Justice<span className="text-navy-500">Tchad</span>
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Plateforme nationale de gestion judiciaire numérique. Sécurisée, rapide et accessible.
              </p>
            </div>

            {/* Colonne 2 : Navigation */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Navigation</h3>
              <div className="flex flex-col gap-3">
                <Link to="/features" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-navy-600 dark:hover:text-white transition-colors">Fonctionnalités</Link>
                <Link to="/about"    className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-navy-600 dark:hover:text-white transition-colors">À Propos</Link>
                <Link to="/support"  className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-navy-600 dark:hover:text-white transition-colors">Support</Link>
                <Link to="/privacy"  className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-navy-600 dark:hover:text-white transition-colors">Confidentialité</Link>
              </div>
            </div>

            {/* Colonne 3 : Infos projet */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projet</h3>
              <div className="flex flex-col gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span>Créé par <span className="font-bold text-navy-900 dark:text-white">Fatime Salim Ossou</span></span>
                <span>Module Bases de Données Avancées</span>
                <span>ENASTIC · 2026</span>
              </div>
            </div>
          </div>

          {/* Bas du footer */}
          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400 font-medium">
              © 2026 JusticeTchad · Tribunal de Grande Instance de N'Djamena
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[11px] text-slate-400 font-medium">Système opérationnel</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
