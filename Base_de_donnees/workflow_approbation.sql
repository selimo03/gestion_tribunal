-- =============================================================================
-- 06_WORKFLOW_APPROBATION.SQL
-- Workflow d'approbation des inscriptions
--
-- Principe :
--   - Tout nouvel inscrit a statut_compte = 'pending' et role = 'huissier' (limité)
--   - Son rôle souhaité est stocké dans role_demande
--   - Le super_admin / gestionnaire approuve ou refuse via /demandes
--   - À l'approbation : statut_compte = 'approuve' + role réel appliqué
--   - L'utilisateur ne peut pas se connecter tant que statut ≠ 'approuve'
-- =============================================================================

-- ─── COLONNES DU WORKFLOW ────────────────────────────────────────────────────
ALTER TABLE profils ADD COLUMN IF NOT EXISTS statut_compte VARCHAR(20) DEFAULT 'pending';
ALTER TABLE profils ADD COLUMN IF NOT EXISTS role_demande  VARCHAR(30);
ALTER TABLE profils ADD COLUMN IF NOT EXISTS motif_refus   TEXT;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS validateur_id UUID REFERENCES profils(id) ON DELETE SET NULL;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS date_demande     TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profils ADD COLUMN IF NOT EXISTS date_validation  TIMESTAMPTZ;

-- Contrainte sur statut_compte
ALTER TABLE profils DROP CONSTRAINT IF EXISTS profils_statut_compte_check;
ALTER TABLE profils ADD CONSTRAINT profils_statut_compte_check
    CHECK (statut_compte IN ('pending', 'approuve', 'refuse', 'suspendu'));

-- Les comptes existants sont considérés approuvés (rétrocompat)
UPDATE profils SET statut_compte = 'approuve' WHERE statut_compte IS NULL OR statut_compte = 'pending';

-- Index pour la liste des demandes
CREATE INDEX IF NOT EXISTS idx_profils_statut ON profils(statut_compte);

-- ─── TRIGGER : nouvelle inscription = en attente, role provisoire ────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role_demande TEXT;
BEGIN
    -- Récupère le rôle demandé depuis raw_user_meta_data (formulaire d'inscription)
    v_role_demande := COALESCE(NEW.raw_user_meta_data->>'role', 'avocat');

    -- Mappe les anciens rôles
    v_role_demande := CASE v_role_demande
        WHEN 'magistrat' THEN 'juge'
        WHEN 'agent'     THEN 'huissier'
        ELSE v_role_demande
    END;

    -- Sécurité : si quelqu'un essaie de demander super_admin, on le ramène à huissier
    IF v_role_demande = 'super_admin' THEN
        v_role_demande := 'huissier';
    END IF;

    -- Crée le profil en attente
    INSERT INTO profils (
        id, nom, prenom, email,
        role,            -- Rôle effectif provisoire (peu de droits)
        role_demande,    -- Ce que l'utilisateur a demandé
        statut_compte,
        actif,
        date_demande
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nom', ''),
        COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
        NEW.email,
        'huissier',           -- rôle par défaut (le plus limité)
        v_role_demande,       -- rôle souhaité
        'pending',            -- en attente de validation
        false,                -- inactif jusqu'à validation
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ─── FONCTIONS RPC : approuver / refuser ─────────────────────────────────────

-- Approuver une demande : applique le rôle (ou un rôle choisi par l'admin)
CREATE OR REPLACE FUNCTION approuver_demande(
    p_user_id    UUID,
    p_role_final VARCHAR DEFAULT NULL  -- NULL = utiliser role_demande
)
RETURNS profils AS $$
DECLARE
    v_role_final VARCHAR;
    v_resultat   profils;
BEGIN
    -- Vérifie que l'appelant est admin
    IF get_mon_role() NOT IN ('super_admin', 'gestionnaire') THEN
        RAISE EXCEPTION 'Permission refusée : super_admin ou gestionnaire requis';
    END IF;

    -- Détermine le rôle final
    SELECT COALESCE(p_role_final, role_demande, 'huissier')
      INTO v_role_final
      FROM profils
     WHERE id = p_user_id;

    -- Met à jour le profil
    UPDATE profils
       SET role           = v_role_final,
           statut_compte  = 'approuve',
           actif          = true,
           validateur_id  = auth.uid(),
           date_validation = NOW(),
           motif_refus    = NULL
     WHERE id = p_user_id
     RETURNING * INTO v_resultat;

    -- Trace l'action dans audit_logs
    PERFORM tracer_action(
        'CHANGEMENT_ROLE',
        'profil',
        p_user_id::text,
        jsonb_build_object('statut', 'pending'),
        jsonb_build_object('statut', 'approuve', 'role', v_role_final)
    );

    RETURN v_resultat;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refuser une demande : statut = refuse, compte désactivé, motif obligatoire
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
       SET statut_compte  = 'refuse',
           actif          = false,
           motif_refus    = p_motif,
           validateur_id  = auth.uid(),
           date_validation = NOW()
     WHERE id = p_user_id
     RETURNING * INTO v_resultat;

    PERFORM tracer_action(
        'ACCES_REFUSE',
        'profil',
        p_user_id::text,
        NULL,
        jsonb_build_object('statut', 'refuse', 'motif', p_motif)
    );

    RETURN v_resultat;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── POLICY RLS : super_admin/gestionnaire voit toutes les demandes ──────────
DROP POLICY IF EXISTS pol_profils_admin_voir_demandes ON profils;
CREATE POLICY pol_profils_admin_voir_demandes ON profils
    FOR SELECT
    USING (get_mon_role() IN ('super_admin', 'gestionnaire'));

-- ─── VUE : Demandes d'inscription en attente ─────────────────────────────────
DROP VIEW IF EXISTS vue_demandes_inscription CASCADE;
CREATE VIEW vue_demandes_inscription AS
SELECT
    p.id,
    p.email,
    p.nom,
    p.prenom,
    p.role_demande,
    p.statut_compte,
    p.motif_refus,
    p.date_demande,
    p.date_validation,
    (v.prenom || ' ' || v.nom) AS validateur_nom
FROM profils p
LEFT JOIN profils v ON v.id = p.validateur_id
WHERE p.statut_compte IN ('pending', 'refuse')
ORDER BY p.date_demande DESC;

NOTIFY pgrst, 'reload schema';
