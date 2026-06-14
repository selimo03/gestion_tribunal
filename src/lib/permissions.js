// =============================================================================
// MATRICE DE PERMISSIONS — JusticeTchad RBAC v3.0
// 8 rôles réels — chaque rôle fait uniquement ce qui lui appartient
// =============================================================================

export const ROLES = {
  SUPER_ADMIN:  'super_admin',
  JUGE:         'juge',
  PROCUREUR:    'procureur',
  AVOCAT:       'avocat',
  GREFFIER:     'greffier',
  HUISSIER:     'huissier',
  NOTAIRE:      'notaire',
  GESTIONNAIRE: 'gestionnaire',
};

// Compatibilité avec anciens comptes (magistrat → juge, agent → huissier)
const LEGACY_ALIASES = {
  'magistrat': 'juge',
  'agent':     'huissier',
  'admin':     'super_admin',
  'ministre':  'super_admin',
};

export function normalizeRole(role) {
  return LEGACY_ALIASES[role] || role;
}

// =============================================================================
// MATRICE DES PERMISSIONS — qui peut faire quoi
// =============================================================================

export const PERMISSIONS = {

  // ── Dashboard ────────────────────────────────────────────────────────────
  // Tout le monde y accède
  'dashboard.view': [
    'super_admin', 'juge', 'procureur', 'avocat',
    'greffier', 'huissier', 'notaire', 'gestionnaire',
  ],

  // ── Affaires ─────────────────────────────────────────────────────────────
  // Voir TOUT le registre
  'affaires.view_all':      ['super_admin', 'gestionnaire', 'greffier', 'procureur'],
  // Voir uniquement ses dossiers assignés
  'affaires.view_assigned': ['juge', 'avocat', 'huissier', 'notaire'],
  // Créer un nouveau dossier
  'affaires.create':        ['super_admin', 'gestionnaire', 'greffier', 'procureur'],
  // Modifier un dossier existant
  'affaires.edit':          ['super_admin', 'gestionnaire', 'greffier', 'procureur'],
  // Supprimer — super_admin uniquement
  'affaires.delete':        ['super_admin'],
  // Assigner un dossier à un magistrat
  'affaires.assign':        ['super_admin', 'gestionnaire'],

  // ── Verdicts & Décisions ─────────────────────────────────────────────────
  // Valider / signer un dossier — juge uniquement
  'affaires.valider':  ['juge'],
  // Rendre un verdict — juge uniquement
  'decisions.create':  ['juge'],
  // Consulter les décisions rendues (notaire : pour les successions et partages judiciaires)
  'decisions.view':    ['super_admin', 'juge', 'procureur', 'gestionnaire', 'greffier', 'avocat', 'huissier', 'notaire'],

  // ── Audiences ─────────────────────────────────────────────────────────────
  // Voir les audiences
  'audiences.view':   [
    'super_admin', 'juge', 'procureur', 'avocat',
    'greffier', 'huissier', 'notaire', 'gestionnaire',
  ],
  // Programmer une audience — greffier et gestionnaire
  'audiences.create': ['super_admin', 'gestionnaire', 'greffier'],
  // Modifier une audience — le procureur peut demander un renvoi
  'audiences.edit':   ['super_admin', 'gestionnaire', 'greffier', 'procureur'],
  'audiences.delete': ['super_admin'],

  // ── Parties ───────────────────────────────────────────────────────────────
  // Voir les parties
  'parties.view':   [
    'super_admin', 'juge', 'procureur', 'avocat',
    'greffier', 'huissier', 'notaire', 'gestionnaire',
  ],
  // Enregistrer une partie
  'parties.create': ['super_admin', 'gestionnaire', 'greffier', 'procureur'],
  // Modifier une partie
  'parties.edit':   ['super_admin', 'gestionnaire', 'greffier'],
  // Supprimer
  'parties.delete': ['super_admin'],

  // ── Magistrats (table juges) — annuaire ouvert à tous les profils métier ──
  'juges.view':   ['super_admin', 'gestionnaire', 'greffier', 'juge', 'procureur', 'avocat', 'huissier', 'notaire'],
  'juges.create': ['super_admin', 'gestionnaire'],
  'juges.edit':   ['super_admin', 'gestionnaire'],

  // ── Avocats (barreau) — annuaire ouvert à tous les profils métier ─────────
  'avocats.view':   ['super_admin', 'gestionnaire', 'greffier', 'juge', 'procureur', 'avocat', 'huissier', 'notaire'],
  'avocats.create': ['super_admin', 'gestionnaire', 'greffier'],
  'avocats.edit':   ['super_admin', 'gestionnaire', 'greffier'],

  // ── Statistiques ──────────────────────────────────────────────────────────
  'stats.view':   ['super_admin', 'gestionnaire', 'juge', 'greffier'],
  'stats.export': ['super_admin', 'gestionnaire'],

  // ── Notifications — tout le monde ─────────────────────────────────────────
  'notifications.view': [
    'super_admin', 'juge', 'procureur', 'avocat',
    'greffier', 'huissier', 'notaire', 'gestionnaire',
  ],

  // ── Rapports & exports ─────────────────────────────────────────────────────
  'rapports.view':   ['super_admin', 'gestionnaire', 'juge', 'greffier'],
  'rapports.export': ['super_admin', 'gestionnaire'],

  // ── Demandes d'inscription ────────────────────────────────────────────────
  'demandes.view':      ['super_admin', 'gestionnaire'],
  'demandes.approuver': ['super_admin', 'gestionnaire'],
  'demandes.refuser':   ['super_admin', 'gestionnaire'],

  // ── Audit logs — super_admin uniquement ───────────────────────────────────
  'audit.view':   ['super_admin'],
  'audit.export': ['super_admin'],

  // ── Gestion des utilisateurs ──────────────────────────────────────────────
  'users.view':        ['super_admin', 'gestionnaire'],
  'users.create':      ['super_admin'],
  'users.edit':        ['super_admin'],
  'users.delete':      ['super_admin'],
  'users.assign_role': ['super_admin'],

  // ── Profil personnel — tout le monde ──────────────────────────────────────
  'profile.view': [
    'super_admin', 'juge', 'procureur', 'avocat',
    'greffier', 'huissier', 'notaire', 'gestionnaire',
  ],
  'profile.edit': [
    'super_admin', 'juge', 'procureur', 'avocat',
    'greffier', 'huissier', 'notaire', 'gestionnaire',
  ],
};

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

export function can(role, permission) {
  const r = normalizeRole(role);
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(r);
}

export function canAccessRoute(role, path) {
  const r = normalizeRole(role);

  // Profil & Settings : tout le monde
  if (path === '/profile')  return true;
  if (path === '/settings') return true;

  // Utilisateurs : super_admin seulement
  if (path === '/users') return r === 'super_admin';

  // Affaires : certains voient tout, d'autres seulement les leurs
  if (path === '/affaires') {
    if (can(r, 'affaires.view_all'))     return true;
    if (can(r, 'affaires.view_assigned')) return true;
    return false;
  }

  const routeMap = {
    '/dashboard':     'dashboard.view',
    '/audiences':     'audiences.view',
    '/parties':       'parties.view',
    '/juges':         'juges.view',
    '/avocats':       'avocats.view',
    '/demandes':      'demandes.view',
    '/stats':         'stats.view',
    '/audit':         'audit.view',
    '/notifications': 'notifications.view',
    '/rapports':      'rapports.view',
  };

  const perm = routeMap[path];
  if (!perm) return true;
  return can(r, perm);
}

export function getRoleLabel(role) {
  const labels = {
    'super_admin':  'Super Administrateur',
    'juge':         'Juge',
    'procureur':    'Procureur',
    'avocat':       'Avocat',
    'greffier':     'Greffier',
    'huissier':     'Huissier',
    'notaire':      'Notaire',
    'gestionnaire': 'Gestionnaire',
    // Rétrocompatibilité
    'magistrat':    'Juge',
    'agent':        'Huissier',
    'admin':        'Super Administrateur',
  };
  return labels[role] || role;
}

export function getRoleColor(role) {
  const r = normalizeRole(role);
  const colors = {
    'super_admin':  'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'juge':         'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'procureur':    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'avocat':       'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'greffier':     'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'huissier':     'bg-teal-500/20 text-teal-400 border-teal-500/30',
    'notaire':      'bg-slate-500/20 text-slate-400 border-slate-500/30',
    'gestionnaire': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  };
  return colors[r] || colors['notaire'];
}
