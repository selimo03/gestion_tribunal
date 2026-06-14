-- =============================================================================
-- 08_FIX_AUDIT_CHAIN.SQL
-- Corrections post-livraison sur la chaîne d'audit
--
-- 1. La vérification d'intégrité côté client comparait un timestamp ISO 8601
--    JavaScript ("2026-06-05T10:30:00.123Z") au format Postgres natif
--    ("2026-06-05 10:30:00.123456+00") -- les hash ne pouvaient jamais coïncider.
--    On force un format canonique commun : ISO 8601 UTC, millisecondes.
--
-- 2. La fonction `refuser_demande` traçait une décision admin légitime avec
--    l'action `ACCES_REFUSE`, polluant le KPI "Anomalies de sécurité".
--    On introduit une action distincte `REFUS_INSCRIPTION`.
--
-- ATTENTION : les entrées audit_logs déjà présentes ont été hashées avec
-- l'ancien format. Pour que la vérification d'intégrité renvoie "valide",
-- exécuter manuellement :
--     TRUNCATE audit_logs;
-- (ou re-hasher l'historique avec un script dédié).
-- =============================================================================

-- ─── 1. Étendre le CHECK constraint pour accepter REFUS_INSCRIPTION ──────────
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check
    CHECK (action IN (
        'LECTURE', 'CREATION', 'MODIFICATION', 'SUPPRESSION',
        'CONNEXION', 'DECONNEXION', 'ECHEC_CONNEXION',
        'EXPORT', 'CHANGEMENT_ROLE', 'ACCES_REFUSE',
        'REFUS_INSCRIPTION'
    ));

-- ─── 2. Nouveau format canonique pour le hash ────────────────────────────────
-- Format : YYYY-MM-DDTHH24:MI:SS.MSZ  (24 caractères fixes en UTC).
-- Côté client : new Date(log.timestamp).toISOString() produit la même chaîne.
CREATE OR REPLACE FUNCTION calcul_hash_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_last_hash TEXT;
    v_ts_canon  TEXT;
    v_content   TEXT;
BEGIN
    SELECT hash_courant INTO v_last_hash
    FROM audit_logs
    ORDER BY timestamp DESC
    LIMIT 1;

    NEW.hash_precedent := COALESCE(v_last_hash, 'GENESIS');

    -- Format canonique ISO 8601 UTC, précision milliseconde.
    v_ts_canon := to_char(
        NEW.timestamp AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    );

    v_content := NEW.hash_precedent
               || COALESCE(NEW.utilisateur_id::text, '')
               || NEW.action
               || NEW.cible_type
               || COALESCE(NEW.cible_id, '')
               || v_ts_canon;

    NEW.hash_courant := encode(digest(v_content, 'sha256'), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Le trigger existe déjà (créé par 04_audit_acces.sql) : la nouvelle
-- définition de la fonction prend effet sur les prochains INSERT.

-- ─── 3. `refuser_demande` utilise désormais REFUS_INSCRIPTION ────────────────
CREATE OR REPLACE FUNCTION refuser_demande(
    p_user_id UUID,
    p_motif   TEXT
)
RETURNS profils AS $$
DECLARE
    v_resultat profils;
BEGIN
    IF get_mon_role() NOT IN ('super_admin', 'gestionnaire') THEN
        RAISE EXCEPTION 'Permission refusée';
    END IF;

    IF p_motif IS NULL OR length(trim(p_motif)) = 0 THEN
        RAISE EXCEPTION 'Le motif de refus est obligatoire';
    END IF;

    UPDATE profils
       SET statut_compte   = 'refuse',
           actif           = false,
           motif_refus     = p_motif,
           validateur_id   = auth.uid(),
           date_validation = NOW()
     WHERE id = p_user_id
     RETURNING * INTO v_resultat;

    PERFORM tracer_action(
        'REFUS_INSCRIPTION',
        'profil',
        p_user_id::text,
        NULL,
        jsonb_build_object('statut', 'refuse', 'motif', p_motif)
    );

    RETURN v_resultat;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
