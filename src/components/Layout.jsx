import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Calendar as CalendarIcon,
  Users, BarChart, LogOut, Sun, Moon, Menu,
  ShieldAlert, Gavel, Search, Bell, UserCircle,
  UsersIcon, Settings as SettingsIcon, X, Scale, UserCheck,
  BellRing, FileBarChart
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { cn, Badge } from './UI';
import { canAccessRoute, normalizeRole, getRoleLabel, getRoleColor } from '../lib/permissions';
import { api } from '../services/api';
import { t } from '../lib/i18n';

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const role = normalizeRole(user?.role || 'huissier');
  const [demandesCount, setDemandesCount] = useState(0);

  // Récupère le nombre de demandes en attente + temps réel
  // Filtre Realtime restreint aux profils en attente pour éviter de recompter
  // sur tous les updates de profils (last_seen, etc.).
  useEffect(() => {
    if (!['super_admin', 'gestionnaire'].includes(role)) return;

    const loadCount = () => {
      api.getDemandesEnAttenteCount().then(setDemandesCount).catch(() => setDemandesCount(0));
    };
    loadCount();

    const channel = supabase
      .channel('demandes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profils', filter: 'statut_compte=eq.pending' },
        loadCount,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profils' },
        (payload) => {
          // Une demande pending devenue approuve/refuse n'arrive plus via le filtre ci-dessus
          if (payload.old?.statut_compte === 'pending' && payload.new?.statut_compte !== 'pending') {
            loadCount();
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [role]);

  const allMenuItems = [
    { icon: LayoutDashboard, label: t('menu.dashboard'),      path: '/dashboard'     },
    { icon: Briefcase,       label: t('menu.affaires'),        path: '/affaires'      },
    { icon: CalendarIcon,    label: t('menu.audiences'),       path: '/audiences'     },
    { icon: Users,           label: t('menu.parties'),         path: '/parties'       },
    { icon: Gavel,           label: t('menu.juges'),           path: '/juges'         },
    { icon: Scale,           label: t('menu.avocats'),         path: '/avocats'       },
    { icon: BarChart,        label: t('menu.stats'),           path: '/stats'         },
    { icon: FileBarChart,    label: 'Rapports',                path: '/rapports'      },
    { icon: UserCheck,       label: t('menu.demandes'),        path: '/demandes', badge: demandesCount },
    { icon: ShieldAlert,     label: t('menu.audit'),           path: '/audit'         },
    { icon: UsersIcon,       label: t('menu.users'),           path: '/users'         },
    { icon: BellRing,        label: 'Notifications',           path: '/notifications' },
    { icon: SettingsIcon,    label: t('menu.settings'),        path: '/settings'      },
    { icon: UserCircle,      label: t('menu.profile'),         path: '/profile'       },
  ];

  const menuItems = allMenuItems.filter(item => canAccessRoute(role, item.path));

  // Ferme le sidebar uniquement sur mobile
  const handleNavClick = () => {
    if (window.innerWidth < 1024) toggleSidebar();
  };

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-[70] w-64 bg-[#020617] text-white flex flex-col border-r border-white/5 transition-transform duration-300",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-7 border-b border-white/5">
          <div className="bg-gradient-to-br from-navy-600 to-blue-500 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <Gavel className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">Justice<span className="text-blue-400">Tchad</span></h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{t('app.subtitle')}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black mb-4 px-3">{t('menu.principal')}</p>
          {menuItems.map((item) => (
            <NavLink key={item.path} to={item.path} onClick={handleNavClick}>
              {({ isActive }) => (
                <span className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group w-full",
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}>
                  <item.icon size={18} className="shrink-0" />
                  <span className="font-semibold text-sm flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profil utilisateur */}
        <div className="px-4 py-5 border-t border-white/5">
          <div
            onClick={() => { navigate('/profile'); handleNavClick(); }}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
          >
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <>{(user?.prenom?.[0] || '?')}{(user?.nom?.[0] || '')}</>
              )}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-white">
                {user?.prenom} {user?.nom}
              </p>
              <span className={cn(
                'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border inline-block mt-0.5',
                getRoleColor(user?.role)
              )}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

// ─── Header ──────────────────────────────────────────────────────────────────
const Header = ({ toggleSidebar, darkMode, toggleDarkMode }) => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications]         = useState([]);
  const [searchTerm, setSearchTerm]               = useState('');
  const [searchResults, setSearchResults]         = useState([]);
  const [showSearch, setShowSearch]               = useState(false);
  const [showMobileSearch, setShowMobileSearch]   = useState(false);
  const searchRef = useRef(null);

  // Notifications réelles depuis Supabase
  useEffect(() => {
    if (showNotifications) {
      api.getNotifications().then(setNotifications).catch(() => setNotifications([]));
    }
  }, [showNotifications]);

  // Recherche globale avec debounce 300ms
  const debounceRef = useRef(null);
  const handleSearch = useCallback((val) => {
    setSearchTerm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await api.searchAffaires(val);
      setSearchResults(results);
      setShowSearch(results.length > 0);
    }, 300);
  }, []);

  // Fermer la recherche si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard')         return t('page.dashboard');
    if (path.startsWith('/affaires'))  return t('page.affaires');
    if (path === '/audiences')         return t('page.audiences');
    if (path === '/parties')           return t('page.parties');
    if (path === '/juges')             return t('page.juges');
    if (path === '/avocats')           return t('page.avocats');
    if (path === '/demandes')          return t('page.demandes');
    if (path === '/stats')             return t('page.stats');
    if (path === '/audit')             return t('page.audit');
    if (path === '/profile')           return t('page.profile');
    if (path === '/users')             return t('page.users');
    if (path === '/settings')          return t('page.settings');
    if (path === '/notifications')     return t('page.notifications');
    if (path === '/rapports')          return t('page.rapports');
    return 'JusticeTchad';
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const statutColors = {
    en_cours: 'text-blue-500',
    jugee: 'text-emerald-500',
    appelee: 'text-amber-500',
    classee: 'text-slate-400',
  };

  return (
    <header className="sticky top-0 z-[50] flex items-center justify-between px-6 h-16 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/50">

      {/* Gauche */}
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl lg:hidden transition-colors">
          <Menu size={22} />
        </button>
        <div>
          <h2 className="text-lg font-black text-navy-900 dark:text-white tracking-tight leading-tight">{getPageTitle()}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Système Judiciaire National</p>
        </div>
      </div>

      {/* Droite */}
      <div className="flex items-center gap-2">

        {/* Bouton recherche mobile */}
        <button
          onClick={() => setShowMobileSearch(true)}
          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors lg:hidden"
          aria-label="Rechercher"
        >
          <Search size={20} />
        </button>

        {/* Overlay recherche mobile */}
        {showMobileSearch && (
          <div className="fixed inset-0 z-[110] flex flex-col bg-white dark:bg-[#020617] p-4 lg:hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Rechercher un dossier..."
                  value={searchTerm}
                  onChange={e => handleSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-medium w-full text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                />
              </div>
              <button
                onClick={() => { setShowMobileSearch(false); setSearchTerm(''); setSearchResults([]); }}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {searchResults.map(r => (
                  <div key={r.id}
                    onClick={() => { navigate(`/affaires/${r.id}`); setShowMobileSearch(false); setSearchTerm(''); }}
                    className="px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-black text-blue-600 dark:text-blue-400">{r.num_dossier}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest">{r.type_affaire}</p>
                    </div>
                    <span className={cn('text-[10px] font-black uppercase', statutColors[r.statut] || 'text-slate-400')}>
                      {r.statut?.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {searchTerm.length >= 2 && searchResults.length === 0 && (
              <p className="text-center text-slate-400 text-sm font-bold py-8">Aucun résultat</p>
            )}
          </div>
        )}

        {/* Recherche globale réelle */}
        <div ref={searchRef} className="relative hidden lg:block">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 w-56 xl:w-72">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Rechercher un dossier..."
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearch(true)}
              className="bg-transparent border-none outline-none text-sm font-medium w-full text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button onClick={() => { setSearchTerm(''); setSearchResults([]); setShowSearch(false); }}>
                <X size={14} className="text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[100]">
              {searchResults.map(r => (
                <div key={r.id}
                  onClick={() => { navigate(`/affaires/${r.id}`); setShowSearch(false); setSearchTerm(''); }}
                  className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-black text-blue-600 dark:text-blue-400">{r.num_dossier}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{r.type_affaire}</p>
                  </div>
                  <span className={cn('text-[10px] font-black uppercase', statutColors[r.statut] || 'text-slate-400')}>
                    {r.statut?.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications réelles */}
        <div className="relative">
          <button onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[100]">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="font-black text-xs uppercase tracking-widest text-navy-900 dark:text-white">Audiences à venir</span>
                {notifications.length > 0 && <Badge variant="en_cours">{notifications.length}</Badge>}
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400 text-sm font-bold">
                  Aucune audience dans les 7 prochains jours
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id}
                    onClick={() => { setShowNotifications(false); navigate(n.path); }}
                    className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors last:border-0"
                  >
                    <p className="text-sm font-bold text-navy-900 dark:text-white">{n.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{n.desc}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Mode sombre */}
        <button onClick={toggleDarkMode} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Déconnexion */}
        <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors group">
          <LogOut size={18} className="text-red-400 group-hover:text-red-500" />
          <span className="text-sm font-bold text-slate-500 group-hover:text-red-500 hidden sm:block">Quitter</span>
        </button>
      </div>
    </header>
  );
};

// ─── Layout principal ─────────────────────────────────────────────────────────
export const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#020617] transition-colors duration-300 font-['Outfit']">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(o => !o)} />

      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Header
          toggleSidebar={() => setIsSidebarOpen(o => !o)}
          darkMode={darkMode}
          toggleDarkMode={() => setDarkMode(d => !d)}
        />

        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        <footer className="px-8 py-6 border-t border-slate-200 dark:border-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">
            © 2026 Tribunal de Grande Instance N'Djamena · JusticeTchad v2.0
          </p>
        </footer>
      </div>

    </div>
  );
};
