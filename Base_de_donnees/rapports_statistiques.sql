-- =============================================================================
-- 05_RAPPORTS_STATISTIQUES.SQL
-- Vues et fonctions pour produire les indicateurs du tableau de bord
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- VUE : RÉPARTITION DES AFFAIRES PAR STATUT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vue_stats_par_statut AS
SELECT
    statut,
    COUNT(*) AS total,
    ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) AS pourcentage
FROM affaires
GROUP BY statut;

-- ─────────────────────────────────────────────────────────────────────────────
-- VUE : RÉPARTITION DES AFFAIRES PAR TYPE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vue_stats_par_type AS
SELECT
    type_affaire,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE statut = 'en_cours') AS en_cours,
    COUNT(*) FILTER (WHERE statut = 'jugee')    AS jugees,
    COUNT(*) FILTER (WHERE statut = 'appelee')  AS en_appel,
    COUNT(*) FILTER (WHERE statut = 'classee')  AS classees
FROM affaires
GROUP BY type_affaire
ORDER BY total DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- VUE : ACTIVITÉ MENSUELLE (nouvelles affaires par mois sur l'année courante)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vue_activite_mensuelle AS
SELECT
    EXTRACT(YEAR  FROM date_ouverture)::INT AS annee,
    EXTRACT(MONTH FROM date_ouverture)::INT AS mois,
    TO_CHAR(date_ouverture, 'Mon') AS mois_nom,
    COUNT(*) AS nouvelles_affaires,
    COUNT(*) FILTER (WHERE statut = 'jugee') AS jugees_dans_mois
FROM affaires
GROUP BY annee, mois, mois_nom
ORDER BY annee DESC, mois;

-- ─────────────────────────────────────────────────────────────────────────────
-- VUE : CHARGE DE TRAVAIL PAR JUGE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vue_charge_juges AS
SELECT
    j.id AS juge_id,
    (j.prenom || ' ' || j.nom) AS juge,
    j.grade,
    j.chambre,
    COUNT(a.id) AS total_dossiers,
    COUNT(a.id) FILTER (WHERE a.statut = 'en_cours') AS en_cours,
    COUNT(a.id) FILTER (WHERE a.statut = 'jugee')    AS rendus,
    COUNT(a.id) FILTER (WHERE a.statut = 'appelee')  AS en_appel,
    ROUND(AVG(
        CASE WHEN a.date_cloture IS NOT NULL
             THEN (a.date_cloture - a.date_ouverture)
        END
    ), 1) AS duree_moy_traitement_jours
FROM juges j
LEFT JOIN affaires a ON a.juge_id = j.id
WHERE j.actif = true
GROUP BY j.id, j.prenom, j.nom, j.grade, j.chambre
ORDER BY total_dossiers DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- VUE : AUDIENCES À VENIR (7 prochains jours)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vue_audiences_prochaines AS
SELECT
    au.id,
    au.date_audience,
    au.heure_debut,
    au.salle,
    au.type_audience,
    a.num_dossier,
    a.type_affaire,
    (j.prenom || ' ' || j.nom) AS juge
FROM audiences au
JOIN affaires a ON a.id = au.affaire_id
LEFT JOIN juges j ON j.id = au.juge_id
WHERE au.date_audience BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND au.statut = 'planifiee'
ORDER BY au.date_audience, au.heure_debut;

-- ─────────────────────────────────────────────────────────────────────────────
-- VUE : INDICATEURS GLOBAUX (KPI tableau de bord)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vue_kpi_dashboard AS
SELECT
    (SELECT COUNT(*) FROM affaires WHERE statut = 'en_cours')           AS affaires_en_cours,
    (SELECT COUNT(*) FROM affaires WHERE statut = 'jugee'
        AND date_cloture >= date_trunc('month', CURRENT_DATE))          AS jugees_ce_mois,
    (SELECT COUNT(*) FROM audiences WHERE date_audience = CURRENT_DATE) AS audiences_aujourdhui,
    (SELECT COUNT(*) FROM affaires WHERE statut = 'appelee')            AS affaires_en_appel,
    (SELECT COUNT(*) FROM juges    WHERE actif = true)                  AS juges_actifs,
    (SELECT COUNT(*) FROM avocats  WHERE actif = true)                  AS avocats_actifs,
    (SELECT COUNT(*) FROM affaires
        WHERE niveau_confidentiel IN ('confidentiel','secret'))         AS dossiers_sensibles;

-- ─────────────────────────────────────────────────────────────────────────────
-- VUE : DÉLAI MOYEN DE TRAITEMENT (par type d'affaire)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vue_delais_traitement AS
SELECT
    type_affaire,
    COUNT(*) FILTER (WHERE date_cloture IS NOT NULL) AS nb_cloturees,
    ROUND(AVG(date_cloture - date_ouverture) FILTER (WHERE date_cloture IS NOT NULL), 1) AS delai_moyen_jours,
    MIN(date_cloture - date_ouverture) FILTER (WHERE date_cloture IS NOT NULL) AS delai_min,
    MAX(date_cloture - date_ouverture) FILTER (WHERE date_cloture IS NOT NULL) AS delai_max
FROM affaires
GROUP BY type_affaire;

-- ─────────────────────────────────────────────────────────────────────────────
-- VUE : ACTIVITÉ D'AUDIT PAR UTILISATEUR (qui consulte/modifie quoi)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vue_activite_utilisateurs AS
SELECT
    utilisateur_nom,
    role_au_moment,
    COUNT(*) FILTER (WHERE action = 'LECTURE')      AS lectures,
    COUNT(*) FILTER (WHERE action = 'CREATION')     AS creations,
    COUNT(*) FILTER (WHERE action = 'MODIFICATION') AS modifications,
    COUNT(*) FILTER (WHERE action = 'SUPPRESSION')  AS suppressions,
    COUNT(*) FILTER (WHERE action = 'EXPORT')       AS exports,
    MAX(timestamp) AS derniere_action
FROM audit_logs
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY utilisateur_nom, role_au_moment
ORDER BY derniere_action DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- FONCTION : Rapport personnalisable par plage de dates
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rapport_periode(
    p_debut DATE,
    p_fin   DATE
)
RETURNS TABLE (
    indicateur       TEXT,
    valeur           BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Affaires ouvertes'::TEXT,
           COUNT(*)::BIGINT FROM affaires WHERE date_ouverture BETWEEN p_debut AND p_fin
    UNION ALL
    SELECT 'Affaires jugées',
           COUNT(*) FROM affaires WHERE date_cloture BETWEEN p_debut AND p_fin AND statut = 'jugee'
    UNION ALL
    SELECT 'Audiences tenues',
           COUNT(*) FROM audiences WHERE date_audience BETWEEN p_debut AND p_fin AND statut = 'tenue'
    UNION ALL
    SELECT 'Décisions rendues',
           COUNT(*) FROM decisions WHERE date_decision BETWEEN p_debut AND p_fin
    UNION ALL
    SELECT 'Dossiers confidentiels créés',
           COUNT(*) FROM affaires
           WHERE date_ouverture BETWEEN p_debut AND p_fin
             AND niveau_confidentiel IN ('confidentiel','secret');
END;
$$ LANGUAGE plpgsql STABLE;

-- Exemple d'utilisation :
--   SELECT * FROM rapport_periode('2026-01-01', '2026-06-30');
