import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Gavel,
  Home,
  Sparkles,
  Info,
  LogIn,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';

const navLinks = [
  { to: '/',         label: 'Accueil',         icon: Home     },
  { to: '/features', label: 'Fonctionnalités',  icon: Sparkles },
  { to: '/about',    label: 'À Propos',         icon: Info     },
];

const PublicNavbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('darkMode') === 'true'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  return (
    <nav className="sticky top-0 w-full pt-4 px-4 sm:px-6 z-50 font-['Outfit']">
      <div className="glass-card max-w-7xl mx-auto rounded-[1.5rem] sm:rounded-[2rem] px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">

        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 sm:gap-3">
          <div className="bg-gradient-to-br from-navy-800 to-navy-600 p-2 sm:p-2.5 rounded-xl shadow-lg shadow-navy-500/20">
            <Gavel className="text-white" size={20} />
          </div>
          <span className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white tracking-tighter">
            Justice<span className="text-navy-500">Tchad</span>
          </span>
        </NavLink>

        {/* Desktop — liens avec indicateur actif + icônes */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
              >
                {({ isActive }) => (
                  <span className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
                    transition-all duration-200 cursor-pointer
                    ${isActive
                      ? 'bg-navy-900 text-white shadow-lg shadow-navy-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-navy-700 dark:hover:text-white'
                    }
                  `}>
                    <Icon size={15} />
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4 ml-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title="Changer de thème"
            >
              {darkMode
                ? <Sun size={18} className="text-yellow-400" />
                : <Moon size={18} />
              }
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 btn btn-primary !py-2 !px-5 text-sm shadow-xl shadow-navy-500/20"
            >
              <LogIn size={16} />
              Connexion
            </button>
          </div>
        </div>

        {/* Mobile — burger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile — menu déroulant */}
      {menuOpen && (
        <div className="md:hidden glass-card max-w-7xl mx-auto mt-2 rounded-[1.5rem] px-4 py-4 flex flex-col gap-2">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
            >
              {({ isActive }) => (
                <span className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold
                  transition-all duration-200
                  ${isActive
                    ? 'bg-navy-900 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }
                `}>
                  <Icon size={16} />
                  {label}
                </span>
              )}
            </NavLink>
          ))}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-1">
            <button
              onClick={() => { setMenuOpen(false); navigate('/login'); }}
              className="btn btn-primary w-full text-sm gap-2"
            >
              <LogIn size={16} /> Connexion
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default PublicNavbar;
