import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Gavel, 
  Moon, 
  Sun, 
  ArrowLeft,
  MessageSquare,
  Mail,
  Phone,
  LifeBuoy,
  HelpCircle,
  ChevronDown
} from 'lucide-react';

const Support = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const faqs = [
    { q: "Comment réinitialiser mon mot de passe ?", a: "Veuillez contacter l'administrateur système de votre tribunal pour obtenir une nouvelle clé d'accès." },
    { q: "Le système est-il accessible sur mobile ?", a: "Oui, JusticeTchad est entièrement responsive et fonctionne sur tous les navigateurs modernes." },
    { q: "Les données sont-elles sécurisées ?", a: "Absolument. Toutes les données sont cryptées en AES-256 et stockées sur des serveurs sécurisés." },
    { q: "Qui peut voir les dossiers classés ?", a: "Seuls les magistrats ayant l'habilitation nécessaire peuvent consulter les dossiers en statut 'Classé'." }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] transition-colors duration-500 font-['Outfit']">
      <nav className="relative w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-navy-800 p-2 rounded-lg">
              <Gavel className="text-white" size={20} />
            </div>
            <span className="text-xl font-black text-navy-900 dark:text-white">JusticeTchad</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/about" className="text-sm font-bold text-slate-500 hover:text-navy-600 transition-colors">À Propos</Link>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-20 pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-20">
          {/* Header */}
          <div className="text-center space-y-4">
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest">
                <LifeBuoy size={14} /> Centre d'assistance
             </div>
             <h1 className="text-5xl font-black text-navy-900 dark:text-white tracking-tight">Comment pouvons-nous <br /><span className="text-blue-500">vous aider ?</span></h1>
          </div>

          {/* Contact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {[
               { icon: Mail, title: "Email", val: "support@justice.td", desc: "Réponse sous 24h" },
               { icon: Phone, title: "Téléphone", val: "+235 66 00 00 00", desc: "Lun-Ven, 8h-16h" },
               { icon: MessageSquare, title: "Chat en direct", val: "Disponible", desc: "Pour les magistrats" }
             ].map((item, i) => (
               <div key={i} className="glass-card p-8 rounded-[2.5rem] text-center space-y-4 hover:scale-105 transition-transform duration-300">
                  <div className="w-12 h-12 bg-navy-50 dark:bg-navy-900/50 rounded-2xl flex items-center justify-center mx-auto text-navy-600 dark:text-blue-400">
                    <item.icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-navy-900 dark:text-white">{item.title}</h3>
                    <p className="text-blue-600 font-bold text-sm mt-1">{item.val}</p>
                    <p className="text-xs text-slate-400 mt-2">{item.desc}</p>
                  </div>
               </div>
             ))}
          </div>

          {/* FAQ Section */}
          <section className="space-y-8">
            <h2 className="text-2xl font-black text-navy-900 dark:text-white flex items-center gap-3">
              <HelpCircle className="text-blue-500" /> Questions Fréquentes
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="glass-card p-6 rounded-3xl group cursor-pointer hover:bg-white dark:hover:bg-slate-900 transition-all">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-navy-800 dark:text-slate-200">{faq.q}</h4>
                    <ChevronDown size={18} className="text-slate-400 group-hover:rotate-180 transition-transform" />
                  </div>
                  <p className="mt-4 text-sm text-slate-500 leading-relaxed hidden group-hover:block animate-fade-in">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Back Button */}
          <div className="text-center">
            <button onClick={() => navigate('/')} className="btn btn-secondary !rounded-full mx-auto">
              <ArrowLeft size={18} /> Retour à l'accueil
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Support;
