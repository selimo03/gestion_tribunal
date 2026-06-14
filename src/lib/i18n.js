// =============================================================================
// i18n minimal — couvre navigation, titres principaux et éléments visibles
// =============================================================================

const SETTINGS_KEY = 'justice_tchad_settings';

const TRANSLATIONS = {
  fr: {
    // Sidebar
    'menu.dashboard':    'Dashboard',
    'menu.affaires':     'Affaires',
    'menu.audiences':    'Audiences',
    'menu.parties':      'Parties',
    'menu.juges':        'Juges',
    'menu.avocats':      'Avocats',
    'menu.stats':        'Statistiques',
    'menu.demandes':     'Demandes',
    'menu.audit':        'Audit',
    'menu.users':        'Utilisateurs',
    'menu.settings':     'Paramètres',
    'menu.profile':      'Profil',
    'menu.principal':    'Menu Principal',
    'app.subtitle':      'Système Judiciaire',
    // Headers
    'header.subtitle':   'Système Judiciaire National',
    'header.search':     'Rechercher un dossier...',
    'header.logout':     'Quitter',
    // Page titles
    'page.dashboard':    'Tableau de bord',
    'page.affaires':     'Gestion des Affaires',
    'page.audiences':    'Planning des Audiences',
    'page.parties':      'Annuaire des Parties',
    'page.juges':        'Magistrats',
    'page.avocats':      'Avocats du Barreau',
    'page.demandes':     "Demandes d'inscription",
    'page.stats':        'Statistiques',
    'page.audit':        "Journaux d'Audit",
    'page.profile':        'Mon Profil',
    'page.users':          'Gestion des Utilisateurs',
    'page.settings':       'Paramètres',
    'page.notifications':  'Notifications',
    'page.rapports':       'Rapports & Exports',
  },
  en: {
    'menu.dashboard':    'Dashboard',
    'menu.affaires':     'Cases',
    'menu.audiences':    'Hearings',
    'menu.parties':      'Parties',
    'menu.juges':        'Judges',
    'menu.avocats':      'Lawyers',
    'menu.stats':        'Statistics',
    'menu.demandes':     'Requests',
    'menu.audit':        'Audit',
    'menu.users':        'Users',
    'menu.settings':     'Settings',
    'menu.profile':      'Profile',
    'menu.principal':    'Main Menu',
    'app.subtitle':      'Judicial System',
    'header.subtitle':   'National Judicial System',
    'header.search':     'Search a case file...',
    'header.logout':     'Logout',
    'page.dashboard':    'Dashboard',
    'page.affaires':     'Case Management',
    'page.audiences':    'Hearings Schedule',
    'page.parties':      'Parties Directory',
    'page.juges':        'Magistrates',
    'page.avocats':      'Bar Association',
    'page.demandes':     'Registration Requests',
    'page.stats':        'Statistics',
    'page.audit':        'Audit Logs',
    'page.profile':        'My Profile',
    'page.users':          'User Management',
    'page.settings':       'Settings',
    'page.notifications':  'Notifications',
    'page.rapports':       'Reports & Exports',
  },
  ar: {
    'menu.dashboard':    'لوحة التحكم',
    'menu.affaires':     'القضايا',
    'menu.audiences':    'الجلسات',
    'menu.parties':      'الأطراف',
    'menu.juges':        'القضاة',
    'menu.avocats':      'المحامون',
    'menu.stats':        'الإحصائيات',
    'menu.demandes':     'الطلبات',
    'menu.audit':        'التدقيق',
    'menu.users':        'المستخدمون',
    'menu.settings':     'الإعدادات',
    'menu.profile':      'الملف الشخصي',
    'menu.principal':    'القائمة الرئيسية',
    'app.subtitle':      'النظام القضائي',
    'header.subtitle':   'النظام القضائي الوطني',
    'header.search':     'البحث عن ملف...',
    'header.logout':     'خروج',
    'page.dashboard':    'لوحة التحكم',
    'page.affaires':     'إدارة القضايا',
    'page.audiences':    'جدول الجلسات',
    'page.parties':      'دليل الأطراف',
    'page.juges':        'القضاة',
    'page.avocats':      'نقابة المحامين',
    'page.demandes':     'طلبات التسجيل',
    'page.stats':        'الإحصائيات',
    'page.audit':        'سجلات التدقيق',
    'page.profile':        'ملفي الشخصي',
    'page.users':          'إدارة المستخدمين',
    'page.settings':       'الإعدادات',
    'page.notifications':  'الإشعارات',
    'page.rapports':       'التقارير والتصديرات',
  },
};

// Cache module-level : relire localStorage une seule fois par session
let _cachedLang = null;

export function getCurrentLanguage() {
  if (_cachedLang) return _cachedLang;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const s = JSON.parse(stored);
      if (s.language && TRANSLATIONS[s.language]) {
        _cachedLang = s.language;
        return _cachedLang;
      }
    }
  } catch { /* ignore */ }
  _cachedLang = 'fr';
  return _cachedLang;
}

// Invalide le cache lors d'un changement de langue (appelé par Settings.jsx)
export function setLanguage(lang) {
  _cachedLang = TRANSLATIONS[lang] ? lang : 'fr';
}

export function t(key) {
  const lang = getCurrentLanguage();
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.fr[key] || key;
}

export function isRTL() {
  return getCurrentLanguage() === 'ar';
}

// Applique l'attribut dir sur <html> selon la langue
export function applyLanguageDirection() {
  document.documentElement.setAttribute('dir', isRTL() ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', getCurrentLanguage());
}
