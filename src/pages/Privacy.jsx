import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Gavel, 
  Moon, 
  Sun, 
  ArrowLeft,
  ShieldCheck,
  Lock,
  EyeOff,
  UserCheck,
  Server
} from 'lucide-react';

const Privacy = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] transition-colors duration-500 font-['Outfit']">
      <nav className="relative w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-navy-800 p-2 rounded-lg">
              <Gavel className="text-white" size={20} />
            </div>
            <span className="text-xl font-black text-navy-900 dark:text-white">Justice<span className="text-blue-500">Tchad</span></span>
          </Link>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      <main className="pt-20 pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Header */}
          <div className="space-y-4">
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">
                <ShieldCheck size={14} /> Sécurité de Grade Militaire
             </div>
             <h1 className="text-5xl font-black text-navy-900 dark:text-white tracking-tight">Politique de <br /><span className="text-blue-500">Confidentialité</span></h1>
             <p className="text-slate-500 font-medium text-lg">Comment nous protégeons l'intégrité des données judiciaires au Tchad.</p>
          </div>

          {/* Policy Sections */}
          <div className="grid grid-cols-1 gap-8">
             {[
               { 
                 icon: Lock, 
                 title: "Chiffrement des Données", 
                 desc: "Toutes les informations relatives aux affaires et aux verdicts sont cryptées via l'algorithme AES-256 avant d'être stockées en base de données. Même en cas d'accès non autorisé au serveur, les données restent illisibles." 
               },
               { 
                 icon: UserCheck, 
                 title: "Contrôle d'Accès", 
                 desc: "Le système utilise une authentification à deux facteurs pour les magistrats. Chaque action (consultation, modification, suppression) est journalisée et associée à un utilisateur unique pour une traçabilité totale." 
               },
               { 
                 icon: Server, 
                 title: "Souveraineté des Données", 
                 desc: "Les serveurs de JusticeTchad sont hébergés localement sur le territoire national, garantissant que les données judiciaires ne sortent jamais des frontières du Tchad." 
               },
               { 
                 icon: EyeOff, 
                 title: "Anonymisation", 
                 desc: "Pour les statistiques publiques, toutes les données personnelles sont anonymisées. Seuls les magistrats assignés à une affaire peuvent voir l'identité réelle des parties." 
               }
             ].map((item, i) => (
               <div key={i} className="glass-card p-10 rounded-[2.5rem] flex flex-col md:flex-row gap-8 items-start hover:bg-white dark:hover:bg-slate-900 transition-all">
                  <div className="w-16 h-16 bg-navy-50 dark:bg-navy-900/50 rounded-2xl flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                    <item.icon size={32} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black text-navy-900 dark:text-white tracking-tight">{item.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{item.desc}</p>
                  </div>
               </div>
             ))}
          </div>

          {/* Compliance Footer */}
          <div className="text-center space-y-8 pt-10">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Certifié conforme aux normes de cyber-sécurité nationales 2026</p>
            <button onClick={() => navigate('/')} className="btn btn-secondary !rounded-full mx-auto">
              <ArrowLeft size={18} /> Retour à l'accueil
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Privacy;
