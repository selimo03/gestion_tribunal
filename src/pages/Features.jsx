import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Clock, BarChart, Lock, Zap, Globe, Database } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';

const Features = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
      <PublicNavbar />

      <main className="pt-12 pb-20 px-4">
        <div className="max-w-6xl mx-auto space-y-24">
          {/* Header */}
          <div className="text-center space-y-6">
            <div className="inline-block p-3 bg-navy-50 dark:bg-navy-900/30 rounded-2xl text-navy-600 mb-2">
              <Zap size={32} />
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-navy-900 dark:text-white uppercase tracking-tighter">
              Fonctionnalités du Système
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Une solution complète pour la numérisation des processus judiciaires au Tchad.
            </p>
          </div>

          {/* Feature Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Gestion des Dossiers",
                desc: "Création, consultation et modification des affaires en temps réel. Chaque dossier possède son propre historique sécurisé."
              },
              {
                icon: Clock,
                title: "Planning des Audiences",
                desc: "Organisation automatique des séances. Visualisation hebdomadaire claire pour éviter les surcharges de travail."
              },
              {
                icon: BarChart,
                title: "Analyses de Données",
                desc: "Graphiques interactifs montrant la répartition des affaires par statut et l'efficacité du tribunal."
              },
              {
                icon: Lock,
                title: "Sécurité des Rôles",
                desc: "Accès restreint selon votre fonction (Juge ou Avocat). Seul le personnel autorisé peut modifier les verdicts."
              },
              {
                icon: Database,
                title: "Archives Digitales",
                desc: "Stockage centralisé de toutes les pièces jointes et documents scannés, accessible instantanément."
              },
              {
                icon: Globe,
                title: "Interface Bilingue",
                desc: "Conçu pour s'adapter aux besoins linguistiques, avec une interface intuitive en français."
              }
            ].map((f, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all group">
                <div className="bg-navy-50 dark:bg-navy-900/50 p-4 rounded-2xl w-fit mb-8 text-navy-700 dark:text-navy-300 group-hover:scale-110 transition-transform">
                  <f.icon size={32} />
                </div>
                <h3 className="text-xl font-bold mb-4 dark:text-white">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </section>

          {/* CTA */}
          <div className="bg-navy-800 rounded-[3rem] p-12 md:p-20 text-center text-white space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold max-w-3xl mx-auto">Prêt à tester la puissance de JusticeTchad ?</h2>
            <button 
              onClick={() => navigate('/login')}
              className="btn bg-white text-navy-900 px-10 py-5 text-xl font-black rounded-full hover:bg-gray-100 transition-all"
            >
              Lancer le Portail
            </button>
          </div>
        </div>
      </main>

      <footer className="py-12 text-center text-gray-400 text-sm border-t border-gray-100 dark:border-slate-900">
         Propulsé par la stack React & Tailwind CSS.
      </footer>
    </div>
  );
};

export default Features;
