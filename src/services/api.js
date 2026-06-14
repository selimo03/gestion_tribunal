import { supabase } from '../lib/supabaseClient';

// =============================================================================
// API JusticeTchad — aligné sur le schéma Base_de_donnees/
// Conventions :
//   - colonnes : snake_case (affaire_id, juge_id, niveau_confidentiel, …)
//   - jointures : on utilise les FKs ajoutées par 01_schema_principal.sql
//   - statistiques : on lit directement les vues SQL (vue_kpi_dashboard, …)
// =============================================================================

// Échappe les caractères qui ont un sens spécial dans un filtre PostgREST
// (séparateur d'opérateurs / wildcards ilike) afin d'éviter une injection
// de filtre via la barre de recherche.
const sanitizePostgrest = (term) =>
  String(term || '')
    .replace(/[,()*:%_\\]/g, ' ')
    .trim();

export const api = {
  // ─── Affaires ───────────────────────────────────────────────────────────────
  getAffaires: async () => {
    const { data, error } = await supabase
      .from('affaires')
      .select('*, juges(id, nom, prenom, grade)')
      .order('date_ouverture', { ascending: false });
    if (error) throw error;
    return (data || []).map(a => ({
      ...a,
      juge_nom: a.juges
        ? `${a.juges.prenom} ${a.juges.nom}`.trim()
        : 'Non assigné',
    }));
  },

  getAffaireById: async (id) => {
    const { data, error } = await supabase
      .from('affaires')
      .select('*, juges(id, nom, prenom, grade)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return {
      ...data,
      juge_nom: data.juges
        ? `${data.juges.prenom} ${data.juges.nom}`.trim()
        : 'Non assigné',
    };
  },

  createAffaire: async (affaireData) => {
    const { data, error } = await supabase
      .from('affaires')
      .insert([affaireData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateAffaireStatut: async (id, statut) => {
    const updates = { statut };
    if (statut === 'jugee' || statut === 'classee') {
      updates.date_cloture = new Date().toISOString().split('T')[0];
    }
    const { data, error } = await supabase
      .from('affaires')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateAffaire: async (id, updates) => {
    const { data, error } = await supabase
      .from('affaires')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateNiveauConfidentiel: async (id, niveau) => {
    const { data, error } = await supabase
      .from('affaires')
      .update({ niveau_confidentiel: niveau })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteAffaire: async (id) => {
    const { error } = await supabase.from('affaires').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Version paginée côté serveur avec filtres.
   * Utilisée par Affaires.jsx pour éviter de charger tout le registre.
   * Renvoie { data, count, totalPages }
   */
  getAffairesPaginated: async ({
    page     = 1,
    pageSize = 10,
    search   = '',
    statut   = '',
    date     = '',
  } = {}) => {
    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;

    let q = supabase
      .from('affaires')
      .select('*, juges(id, nom, prenom, grade)', { count: 'exact' })
      .order('date_ouverture', { ascending: false })
      .range(from, to);

    if (statut && statut !== 'Tous') q = q.eq('statut', statut);
    if (date) q = q.gte('date_ouverture', date);
    if (search) {
      const safe = sanitizePostgrest(search);
      if (safe.length >= 2) {
        q = q.or(`num_dossier.ilike.%${safe}%,description.ilike.%${safe}%`);
      }
    }

    const { data, error, count } = await q;
    if (error) throw error;

    return {
      data: (data || []).map(a => ({
        ...a,
        juge_nom: a.juges
          ? `${a.juges.prenom} ${a.juges.nom}`.trim()
          : 'Non assigné',
      })),
      count:      count  || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /**
   * Version paginée pour les audiences.
   * Renvoie { data, count, totalPages }
   */
  getAudiencesPaginated: async ({ page = 1, pageSize = 10, search = '', type = '' } = {}) => {
    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;

    let q = supabase
      .from('audiences')
      .select('*, affaires(num_dossier), juges(nom, prenom)', { count: 'exact' })
      .order('date_audience', { ascending: true })
      .range(from, to);

    if (type && type !== 'Tous') q = q.eq('type_audience', type);
    if (search) {
      const safe = sanitizePostgrest(search);
      if (safe.length >= 2) q = q.ilike('salle', `%${safe}%`);
    }

    const { data, error, count } = await q;
    if (error) throw error;

    return {
      data: (data || []).map(a => ({
        ...a,
        num_dossier: a.affaires?.num_dossier || '',
        juge_nom:    a.juges ? `${a.juges.prenom} ${a.juges.nom}` : null,
      })),
      count:      count  || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /**
   * Version paginée pour les parties.
   * Renvoie { data, count, totalPages }
   */
  getPartiesPaginated: async ({ page = 1, pageSize = 10, search = '' } = {}) => {
    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;

    let q = supabase
      .from('parties')
      .select('*, affaires(num_dossier)', { count: 'exact' })
      .order('nom')
      .range(from, to);

    if (search) {
      const safe = sanitizePostgrest(search);
      if (safe.length >= 2) {
        q = q.or(`nom.ilike.%${safe}%,prenom.ilike.%${safe}%`);
      }
    }

    const { data, error, count } = await q;
    if (error) throw error;

    return {
      data:       data   || [],
      count:      count  || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  // ─── Juges ──────────────────────────────────────────────────────────────────
  getJuges: async ({ actifSeul = true } = {}) => {
    let q = supabase.from('juges').select('*').order('nom');
    if (actifSeul) q = q.eq('actif', true);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  createJuge: async (juge) => {
    const { data, error } = await supabase
      .from('juges')
      .insert([juge])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateJuge: async (id, updates) => {
    const { data, error } = await supabase
      .from('juges')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  toggleJugeActif: async (id, actif) => {
    const { error } = await supabase.from('juges').update({ actif }).eq('id', id);
    if (error) throw error;
  },

  // ─── Avocats ────────────────────────────────────────────────────────────────
  getAvocats: async ({ actifSeul = true } = {}) => {
    let q = supabase.from('avocats').select('*').order('nom');
    if (actifSeul) q = q.eq('actif', true);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  createAvocat: async (avocat) => {
    const { data, error } = await supabase
      .from('avocats')
      .insert([avocat])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateAvocat: async (id, updates) => {
    const { data, error } = await supabase
      .from('avocats')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  toggleAvocatActif: async (id, actif) => {
    const { error } = await supabase.from('avocats').update({ actif }).eq('id', id);
    if (error) throw error;
  },

  // ─── Parties ────────────────────────────────────────────────────────────────
  getPartiesByAffaire: async (affaireId) => {
    const { data, error } = await supabase
      .from('parties')
      .select('*, avocats(nom, prenom, cabinet)')
      .eq('affaire_id', affaireId);
    if (error) throw error;
    return data || [];
  },

  getAllParties: async () => {
    const { data, error } = await supabase
      .from('parties')
      .select('*, affaires(num_dossier)')
      .order('nom');
    if (error) throw error;
    return data || [];
  },

  addPartie: async (partieData) => {
    const { data, error } = await supabase
      .from('parties')
      .insert([partieData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ─── Audiences ──────────────────────────────────────────────────────────────
  getAudiencesByAffaire: async (affaireId) => {
    const { data, error } = await supabase
      .from('audiences')
      .select('*, affaires(num_dossier), juges(nom, prenom)')
      .eq('affaire_id', affaireId)
      .order('date_audience', { ascending: false });
    if (error) throw error;
    return (data || []).map(a => ({
      ...a,
      num_dossier: a.affaires?.num_dossier || '',
      juge_nom: a.juges ? `${a.juges.prenom} ${a.juges.nom}` : null,
    }));
  },

  getAllAudiences: async () => {
    const { data, error } = await supabase
      .from('audiences')
      .select('*, affaires(num_dossier), juges(nom, prenom)')
      .order('date_audience', { ascending: true });
    if (error) throw error;
    return (data || []).map(a => ({
      ...a,
      num_dossier: a.affaires?.num_dossier || '',
      juge_nom: a.juges ? `${a.juges.prenom} ${a.juges.nom}` : null,
    }));
  },

  getAudiencesPaginated: async ({ page = 1, pageSize = 50 } = {}) => {
    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;
    const { data, error, count } = await supabase
      .from('audiences')
      .select('*, affaires(num_dossier), juges(nom, prenom)', { count: 'exact' })
      .order('date_audience', { ascending: true })
      .range(from, to);
    if (error) throw error;
    return {
      data: (data || []).map(a => ({
        ...a,
        num_dossier: a.affaires?.num_dossier || '',
        juge_nom: a.juges ? `${a.juges.prenom} ${a.juges.nom}` : null,
      })),
      count: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  programAudience: async (audienceData) => {
    const { data, error } = await supabase
      .from('audiences')
      .insert([audienceData])
      .select('*, affaires(num_dossier)')
      .single();
    if (error) throw error;
    return { ...data, num_dossier: data.affaires?.num_dossier || '' };
  },

  // ─── Décisions / Verdicts ───────────────────────────────────────────────────
  getVerdictByAffaire: async (affaireId) => {
    const { data, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('affaire_id', affaireId)
      .order('date_decision', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  saveVerdict: async (verdictData) => {
    const { data, error } = await supabase
      .from('decisions')
      .insert([verdictData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ─── Statistiques (vues SQL pré-agrégées) ───────────────────────────────────
  getKpiDashboard: async () => {
    const { data, error } = await supabase
      .from('vue_kpi_dashboard')
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  getStatsParStatut: async () => {
    const { data, error } = await supabase
      .from('vue_stats_par_statut')
      .select('*');
    if (error) throw error;
    const names  = { en_cours: 'En cours', jugee: 'Jugées', appelee: 'En appel', classee: 'Classées' };
    const colors = { en_cours: '#3B82F6', jugee: '#10B981', appelee: '#F59E0B', classee: '#6B7280' };
    return (data || []).map(r => ({
      name:  names[r.statut] || r.statut,
      value: Number(r.total),
      color: colors[r.statut] || '#94A3B8',
    }));
  },

  getStatsParType: async () => {
    const { data, error } = await supabase.from('vue_stats_par_type').select('*');
    if (error) throw error;
    return data || [];
  },

  getActiviteMensuelle: async () => {
    const annee = new Date().getFullYear();
    const { data, error } = await supabase
      .from('vue_activite_mensuelle')
      .select('*')
      .eq('annee', annee);
    if (error) throw error;
    const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
    const counts = Array(12).fill(0);
    (data || []).forEach(r => {
      const m = Number(r.mois) - 1;
      if (m >= 0 && m < 12) counts[m] = Number(r.nouvelles_affaires);
    });
    return months.map((name, i) => ({ name, value: counts[i] }));
  },

  getChargeJuges: async () => {
    const { data, error } = await supabase.from('vue_charge_juges').select('*');
    if (error) throw error;
    return data || [];
  },

  // Compat : ancien Stats.jsx attendait ces noms
  getStats: async () => {
    const k = await api.getKpiDashboard();
    return {
      en_cours:    Number(k.affaires_en_cours),
      aujourd_hui: Number(k.audiences_aujourdhui),
      jugee_mois:  Number(k.jugees_ce_mois),
      en_attente:  Number(k.affaires_en_appel),
    };
  },
  getStatsByStatut: () => api.getStatsParStatut(),
  getActivityData: () => api.getActiviteMensuelle(),

  getRecentAffaires: async (limit = 3) => {
    const { data, error } = await supabase
      .from('affaires')
      .select('id, num_dossier, type_affaire, statut, niveau_confidentiel')
      .order('date_ouverture', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  // ─── Personnel & utilisateurs ───────────────────────────────────────────────
  getMagistrats: async () => {
    const { data } = await supabase
      .from('profils')
      .select('nom, prenom, role')
      .in('role', ['juge', 'procureur', 'gestionnaire', 'super_admin'])
      .eq('actif', true);
    return data || [];
  },

  getUserAuditLogs: async (userId, limit = 10) => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('utilisateur_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    return data || [];
  },

  getAllUsers: async () => {
    const { data, error } = await supabase
      .from('profils')
      .select('*')
      .order('nom');
    if (error) throw error;
    return data || [];
  },

  updateUserRole: async (userId, role) => {
    const { error } = await supabase.from('profils').update({ role }).eq('id', userId);
    if (error) throw error;
  },

  toggleUserStatus: async (userId, actif) => {
    const { error } = await supabase.from('profils').update({ actif }).eq('id', userId);
    if (error) throw error;
  },

  // ─── Workflow d'approbation des inscriptions ────────────────────────────────
  /**
   * Récupère toutes les demandes (pending + refusées récentes).
   * Réservé super_admin / gestionnaire (filtré par RLS).
   */
  getDemandes: async () => {
    const { data, error } = await supabase
      .from('vue_demandes_inscription')
      .select('*');
    if (error) throw error;
    return data || [];
  },

  /**
   * Compte uniquement les demandes en attente (pour le badge sidebar).
   */
  getDemandesEnAttenteCount: async () => {
    const { count, error } = await supabase
      .from('profils')
      .select('id', { count: 'exact', head: true })
      .eq('statut_compte', 'pending');
    if (error) return 0;
    return count ?? 0;
  },

  /**
   * Approuve une demande. roleEffectif=null → on prend le role_demande.
   * Sinon l'admin peut surclasser/déclasser.
   */
  approuverDemande: async (userId, roleEffectif = null) => {
    const { data, error } = await supabase.rpc('approuver_demande', {
      p_user_id:    userId,
      p_role_final: roleEffectif,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Refuse une demande. Le motif est obligatoire.
   */
  refuserDemande: async (userId, motif) => {
    if (!motif || !motif.trim()) {
      throw new Error('Le motif de refus est obligatoire');
    }
    const { data, error } = await supabase.rpc('refuser_demande', {
      p_user_id: userId,
      p_motif:   motif.trim(),
    });
    if (error) throw error;
    return data;
  },

  /**
   * Vérifie le statut du compte d'un utilisateur connecté.
   * Renvoie { statut_compte, role, role_demande, motif_refus } ou null.
   */
  getStatutCompte: async (userId) => {
    const { data, error } = await supabase
      .from('profils')
      .select('statut_compte, role, role_demande, motif_refus, actif')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  },

  // ─── Recherche ──────────────────────────────────────────────────────────────
  searchAffaires: async (term) => {
    const safe = sanitizePostgrest(term);
    if (safe.length < 2) return [];
    const { data } = await supabase
      .from('affaires')
      .select('id, num_dossier, type_affaire, statut')
      .or(`num_dossier.ilike.%${safe}%,description.ilike.%${safe}%`)
      .limit(6);
    return data || [];
  },

  // ─── Notifications (audiences à venir) ──────────────────────────────────────
  getNotifications: async () => {
    const { data } = await supabase
      .from('vue_audiences_prochaines')
      .select('*')
      .limit(8);
    return (data || []).map(a => ({
      id:    a.id,
      title: `Audience — ${a.num_dossier || 'Dossier'}`,
      desc:  `${a.date_audience} à ${a.heure_debut} · ${a.salle}`,
      path:  '/audiences',
      type:  'audience',
    }));
  },

  getUpcomingAudiences: async (limit = 3) => {
    const { data, error } = await supabase
      .from('vue_audiences_prochaines')
      .select('*')
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  // ─── Assignations dossiers ──────────────────────────────────────────────────
  getAssignations: async (affaireId) => {
    const { data, error } = await supabase
      .from('assignations_dossiers')
      .select('*, profils(nom, prenom, role)')
      .eq('affaire_id', parseInt(affaireId))
      .eq('actif', true);
    if (error) return [];
    return data || [];
  },

  assignDossier: async (affaireId, utilisateurId, roleAssigne) => {
    const { error } = await supabase
      .from('assignations_dossiers')
      .upsert({
        affaire_id:     parseInt(affaireId),
        utilisateur_id: utilisateurId,
        role_assigne:   roleAssigne,
        actif:          true,
      }, { onConflict: 'affaire_id,utilisateur_id' });
    if (error) throw error;
  },

  removeAssignation: async (affaireId, utilisateurId) => {
    const { error } = await supabase
      .from('assignations_dossiers')
      .update({ actif: false })
      .eq('affaire_id', parseInt(affaireId))
      .eq('utilisateur_id', utilisateurId);
    if (error) throw error;
  },

  // ─── Pièces jointes (Supabase Storage) ──────────────────────────────────────
  uploadPieceJointe: async (affaireId, file) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `dossier_${affaireId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('pieces-jointes').upload(path, file);
    if (error) throw error;
    return path;
  },

  getPiecesJointes: async (affaireId) => {
    const { data, error } = await supabase.storage
      .from('pieces-jointes')
      .list(`dossier_${affaireId}`, { sortBy: { column: 'created_at', order: 'desc' } });
    if (error) return [];
    return (data || []).map(f => ({
      ...f,
      path: `dossier_${affaireId}/${f.name}`,
    }));
  },

  getPieceJointeUrl: async (path) => {
    const { data } = await supabase.storage
      .from('pieces-jointes')
      .createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  },

  deletePieceJointe: async (path) => {
    const { error } = await supabase.storage.from('pieces-jointes').remove([path]);
    if (error) throw error;
  },

  // ─── Historique d'un dossier (alimenté par vue_timeline_affaire) ────────────
  getDossierHistorique: async (affaireId) => {
    const { data, error } = await supabase
      .from('vue_timeline_affaire')
      .select('*')
      .eq('affaire_id', parseInt(affaireId))
      .limit(50);
    if (error) return [];
    return data || [];
  },

  // ─── Audit logs (vérification d'intégrité de la chaîne) ─────────────────────
  getAuditLogs: async ({ limit = 50, offset = 0, search = '' } = {}) => {
    let q = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      const safe = sanitizePostgrest(search);
      if (safe.length >= 2) {
        q = q.or(`action.ilike.%${safe}%,cible_type.ilike.%${safe}%,role_au_moment.ilike.%${safe}%`);
      }
    }
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  /**
   * Vérifie l'intégrité de la chaîne d'audit côté client.
   * Re-calcule chaque hash et compare au hash stocké.
   * Renvoie { valide, premierIncoherent: <id ou null>, total: <n> }
   *
   * Format du timestamp utilisé pour le hash : ISO 8601 UTC strict en
   * millisecondes (YYYY-MM-DDTHH:MM:SS.sssZ). Doit rester identique à
   * `to_char(... AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
   * utilisé par le trigger SQL `calcul_hash_audit` (voir 08_fix_audit_chain.sql).
   */
  verifierChaineAudit: async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, timestamp, utilisateur_id, action, cible_type, cible_id, hash_precedent, hash_courant')
      .order('timestamp', { ascending: true });
    if (error) throw error;
    const logs = data || [];

    let attendu = 'GENESIS';
    for (const log of logs) {
      if (log.hash_precedent !== attendu) {
        return { valide: false, premierIncoherent: log.id, total: logs.length };
      }
      const tsCanonique = new Date(log.timestamp).toISOString(); // YYYY-MM-DDTHH:MM:SS.sssZ
      const contenu = attendu
        + (log.utilisateur_id || '')
        + log.action
        + log.cible_type
        + (log.cible_id || '')
        + tsCanonique;
      const hash = await sha256Hex(contenu);
      if (hash !== log.hash_courant) {
        return { valide: false, premierIncoherent: log.id, total: logs.length };
      }
      attendu = log.hash_courant;
    }
    return { valide: true, premierIncoherent: null, total: logs.length };
  },
};

// ─── Helper SHA-256 (utilisé par verifierChaineAudit) ─────────────────────────
async function sha256Hex(message) {
  const enc = new TextEncoder().encode(message);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
