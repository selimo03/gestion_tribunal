import React from 'react';
import { Globe, Mail, Linkedin, Award, BookOpen } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';

const About = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] transition-colors duration-500 font-['Outfit']">
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -z-10"></div>

      <PublicNavbar />

      <main className="pt-12 sm:pt-20 pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-16 sm:space-y-24">

          {/* Hero Section */}
          <section className="text-center space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-900 text-white text-[10px] font-black uppercase tracking-[0.3em]">
              <Award size={14} className="text-blue-400" /> Profil du Créateur
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-navy-900 dark:text-white tracking-tight">
              L'esprit derrière <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-navy-400">JusticeTchad.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-base sm:text-xl text-slate-500 font-medium">
              Découvrez la vision, le parcours et les ambitions du développeur de cette plateforme révolutionnaire.
            </p>
          </section>

          {/* Developer Card */}
          <section className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-navy-900 rounded-[2rem] sm:rounded-[3rem] blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative glass-card p-8 sm:p-12 md:p-20 rounded-[2.5rem] sm:rounded-[3.5rem] border-white/10 flex flex-col md:flex-row items-center gap-8 sm:gap-16 overflow-hidden">
              <div className="relative shrink-0">
                <div className="w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-full flex items-center justify-center text-4xl sm:text-7xl font-black border border-white/20 shadow-2xl relative z-10">
                  SF
                </div>
                <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
              </div>
              <div className="space-y-4 sm:space-y-6 text-center md:text-left flex-1">
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-navy-900 dark:text-white tracking-tighter">Fatime Salim Ossou</h2>
                  <p className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400">Étudiant en Informatique — ENASTIC • Créateur de JusticeTchad</p>
                </div>
                <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic">
                  "Ma mission est de prouver que la technologie peut transformer les institutions les plus traditionnelles. JusticeTchad n'est pas qu'un logiciel, c'est un pas vers une justice plus équitable et accessible pour tous les Tchadiens."
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3 sm:gap-4">
                  <a href="mailto:salimossoufatime@gmail.com" className="btn btn-secondary !rounded-2xl px-6 sm:px-8 text-sm">
                    <Mail size={16} /> Email
                  </a>
                  <a href="https://www.linkedin.com/in/fatime-salim-ossou-b88ab43bb" target="_blank" rel="noopener noreferrer" className="btn btn-secondary !rounded-2xl px-6 sm:px-8 text-sm">
                    <Linkedin size={16} /> LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Vision & Mission */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-slide-up [animation-delay:400ms]">
            <div className="glass-card p-10 rounded-[2.5rem] space-y-6 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
               <div className="w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Globe size={28} />
               </div>
               <h3 className="text-2xl font-black text-navy-900 dark:text-white tracking-tight">Vision Nationale</h3>
               <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                 Numériser l'ensemble des tribunaux du Tchad pour éliminer la paperasse, réduire la corruption et accélérer le traitement des dossiers de 70%.
               </p>
            </div>

            <div className="glass-card p-10 rounded-[2.5rem] space-y-6 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
               <div className="w-14 h-14 bg-navy-800 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-navy-800/20">
                  <BookOpen size={28} />
               </div>
               <h3 className="text-2xl font-black text-navy-900 dark:text-white tracking-tight">Parcours Académique</h3>
               <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                 Ce projet s'inscrit dans le cadre du module "Bases de Données Avancées" (BDA) à l'ENASTIC, alliant théorie SQL complexe et architecture logicielle moderne.
               </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default About;
