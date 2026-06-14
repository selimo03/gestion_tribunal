-- =============================================================================
-- 03_CONFIDENTIALITE.SQL
-- Gestion fine de la confidentialité via Row Level Security (RLS)
--
-- Principe :
--   - Chaque affaire a un niveau (public / restreint / confidentiel / secret)
--   - Chaque utilisateur a un rôle dans la table profils
--   - Les politiques RLS croisent niveau × rôle pour décider de l'accès
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : PROFILS (extension de auth.users de Supabase)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profils (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nom         VARCHAR(100) NOT NULL,
    prenom      VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    role        VARCHAR(30) NOT NULL DEFAULT 'avocat' CHECK (role IN (
                    'super_admin', 'gestionnaire',
                    'juge', 'procureur',
                    'avocat', 'greffier', 'huissier', 'notaire'
                )),
    juge_id     INT REFERENCES juges(id) ON DELETE SET NULL,
    avocat_id   INT REFERENCES avocats(id) ON DELETE SET NULL,
    actif       BOOLEAN DEFAULT true,
    cree_le     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profils_role ON profils(role);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : ASSIGNATIONS_DOSSIERS
-- Lie explicitement un utilisateur à un dossier (au-delà du juge/avocat assigné)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignations_dossiers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affaire_id      INT NOT NULL REFERENCES affaires(id) ON DELETE CASCADE,
    utilisateur_id  UUID NOT NULL REFERENCES profils(id) ON DELETE CASCADE,
    role_assigne    VARCHAR(30) NOT NULL,
    actif           BOOLEAN DEFAULT true,
    date_assignation TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (affaire_id, utilisateur_id)
);

CREATE INDEX IF NOT EXISTS idx_assign_affaire ON assignations_dossiers(affaire_id);
CREATE INDEX IF NOT EXISTS idx_assign_user    ON assignations_dossiers(utilisateur_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- FONCTIONS UTILITAIRES (utilisées par les policies RLS)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_mon_role()
RETURNS VARCHAR AS $$
    SELECT role FROM profils WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION a_acces_dossier(p_affaire_id INT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM assignations_dossiers
        WHERE affaire_id = p_affaire_id
          AND utilisateur_id = auth.uid()
          AND actif = true
    ) OR get_mon_role() IN ('super_admin', 'gestionnaire');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- ACTIVATION RLS sur toutes les tables sensibles
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE affaires              ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiences             ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profils               ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignations_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE historique_affaires   ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- POLICIES : AFFAIRES (croisement niveau × rôle)
-- ─────────────────────────────────────────────────────────────────────────────

-- Public : tout le monde authentifié peut lire
DROP POLICY IF EXISTS pol_aff_lecture_public ON affaires;
CREATE POLICY pol_aff_lecture_public ON affaires
    FOR SELECT
    USING (niveau_confidentiel = 'public');

-- Restreint : tous les profils métier (pas juste l'assigné)
DROP POLICY IF EXISTS pol_aff_lecture_restreint ON affaires;
CREATE POLICY pol_aff_lecture_restreint ON affaires
    FOR SELECT
    USING (
        niveau_confidentiel = 'restreint'
        AND get_mon_role() IN ('super_admin','gestionnaire','juge','procureur','avocat','greffier','huissier','notaire')
    );

-- Confidentiel : uniquement assignés + super_admin/gestionnaire
DROP POLICY IF EXISTS pol_aff_lecture_confidentiel ON affaires;
CREATE POLICY pol_aff_lecture_confidentiel ON affaires
    FOR SELECT
    USING (
        niveau_confidentiel = 'confidentiel'
        AND a_acces_dossier(id)
    );

-- Secret : uniquement super_admin et juge titulaire du dossier
DROP POLICY IF EXISTS pol_aff_lecture_secret ON affaires;
CREATE POLICY pol_aff_lecture_secret ON affaires
    FOR SELECT
    USING (
        niveau_confidentiel = 'secret'
        AND (
            get_mon_role() = 'super_admin'
            OR juge_id IN (SELECT juge_id FROM profils WHERE id = auth.uid())
        )
    );

-- Écriture : gestionnaires + juges/procureurs assignés
DROP POLICY IF EXISTS pol_aff_ecriture ON affaires;
CREATE POLICY pol_aff_ecriture ON affaires
    FOR ALL
    USING (
        get_mon_role() IN ('super_admin','gestionnaire')
        OR (get_mon_role() IN ('juge','procureur') AND a_acces_dossier(id))
    )
    WITH CHECK (
        get_mon_role() IN ('super_admin','gestionnaire','juge','procureur')
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- POLICIES : AUDIENCES, DECISIONS, PARTIES (héritent du niveau de l'affaire)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS pol_aud_lecture ON audiences;
CREATE POLICY pol_aud_lecture ON audiences
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM affaires a WHERE a.id = audiences.affaire_id));

DROP POLICY IF EXISTS pol_aud_ecriture ON audiences;
CREATE POLICY pol_aud_ecriture ON audiences
    FOR ALL
    USING (get_mon_role() IN ('super_admin','gestionnaire','greffier','juge'));

DROP POLICY IF EXISTS pol_dec_lecture ON decisions;
CREATE POLICY pol_dec_lecture ON decisions
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM affaires a WHERE a.id = decisions.affaire_id));

DROP POLICY IF EXISTS pol_dec_ecriture ON decisions;
CREATE POLICY pol_dec_ecriture ON decisions
    FOR ALL
    USING (get_mon_role() IN ('super_admin','juge'));

DROP POLICY IF EXISTS pol_par_lecture ON parties;
CREATE POLICY pol_par_lecture ON parties
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM affaires a WHERE a.id = parties.affaire_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- POLICIES : PROFILS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS pol_profils_voir_sien ON profils;
CREATE POLICY pol_profils_voir_sien ON profils
    FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS pol_profils_voir_tous ON profils;
CREATE POLICY pol_profils_voir_tous ON profils
    FOR SELECT USING (get_mon_role() IN ('super_admin','gestionnaire'));

DROP POLICY IF EXISTS pol_profils_admin ON profils;
CREATE POLICY pol_profils_admin ON profils
    FOR ALL USING (get_mon_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- POLICIES : ASSIGNATIONS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS pol_assign_admin ON assignations_dossiers;
CREATE POLICY pol_assign_admin ON assignations_dossiers
    FOR ALL USING (get_mon_role() IN ('super_admin','gestionnaire'));

DROP POLICY IF EXISTS pol_assign_voir_siennes ON assignations_dossiers;
CREATE POLICY pol_assign_voir_siennes ON assignations_dossiers
    FOR SELECT USING (utilisateur_id = auth.uid());
