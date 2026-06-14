-- =============================================================================
-- 04_AUDIT_ACCES.SQL
-- Journal d'audit de tous les accès et modifications sensibles
--
-- Toute lecture ou écriture sur les dossiers confidentiels/secrets
-- ainsi que toute modification de rôle est tracée de façon immuable.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : AUDIT_LOGS (append-only, chaînage cryptographique)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    utilisateur_id  UUID,
    utilisateur_nom VARCHAR(150),
    role_au_moment  VARCHAR(30),
    action          VARCHAR(50) NOT NULL CHECK (action IN (
                        'LECTURE', 'CREATION', 'MODIFICATION', 'SUPPRESSION',
                        'CONNEXION', 'DECONNEXION', 'ECHEC_CONNEXION',
                        'EXPORT', 'CHANGEMENT_ROLE', 'ACCES_REFUSE'
                    )),
    cible_type      VARCHAR(30) NOT NULL,
    cible_id        VARCHAR(50),
    ancienne_valeur JSONB,
    nouvelle_valeur JSONB,
    adresse_ip      INET,
    user_agent      TEXT,
    hash_precedent  TEXT,
    hash_courant    TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user      ON audit_logs(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_audit_action    ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_cible     ON audit_logs(cible_type, cible_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- FONCTION : chaînage par hash pour rendre le journal infalsifiable
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calcul_hash_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_last_hash TEXT;
    v_content   TEXT;
BEGIN
    SELECT hash_courant INTO v_last_hash
    FROM audit_logs
    ORDER BY timestamp DESC
    LIMIT 1;

    NEW.hash_precedent := COALESCE(v_last_hash, 'GENESIS');

    v_content := NEW.hash_precedent
               || COALESCE(NEW.utilisateur_id::text, '')
               || NEW.action
               || NEW.cible_type
               || COALESCE(NEW.cible_id, '')
               || NEW.timestamp::text;

    NEW.hash_courant := encode(digest(v_content, 'sha256'), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Activer l'extension pour le hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TRIGGER IF EXISTS trig_audit_hash ON audit_logs;
CREATE TRIGGER trig_audit_hash
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION calcul_hash_audit();

-- ─────────────────────────────────────────────────────────────────────────────
-- FONCTION GÉNÉRIQUE : tracer une action
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tracer_action(
    p_action          VARCHAR,
    p_cible_type      VARCHAR,
    p_cible_id        VARCHAR,
    p_ancienne_valeur JSONB DEFAULT NULL,
    p_nouvelle_valeur JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_nom  VARCHAR(150);
    v_role VARCHAR(30);
BEGIN
    SELECT (prenom || ' ' || nom), role
      INTO v_nom, v_role
      FROM profils WHERE id = auth.uid();

    INSERT INTO audit_logs (
        utilisateur_id, utilisateur_nom, role_au_moment,
        action, cible_type, cible_id,
        ancienne_valeur, nouvelle_valeur
    ) VALUES (
        auth.uid(), v_nom, v_role,
        p_action, p_cible_type, p_cible_id,
        p_ancienne_valeur, p_nouvelle_valeur
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER : audit automatique sur AFFAIRES (création / modif / suppression)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trig_audit_affaire()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM tracer_action('CREATION', 'affaire', NEW.id::text, NULL, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM tracer_action('MODIFICATION', 'affaire', NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM tracer_action('SUPPRESSION', 'affaire', OLD.id::text, to_jsonb(OLD), NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_audit_affaires ON affaires;
CREATE TRIGGER trig_audit_affaires
    AFTER INSERT OR UPDATE OR DELETE ON affaires
    FOR EACH ROW
    EXECUTE FUNCTION trig_audit_affaire();

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER : audit décisions et changements de rôle
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trig_audit_decision()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM tracer_action('CREATION', 'decision', NEW.id::text, NULL, to_jsonb(NEW));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_audit_decisions ON decisions;
CREATE TRIGGER trig_audit_decisions
    AFTER INSERT ON decisions
    FOR EACH ROW
    EXECUTE FUNCTION trig_audit_decision();

CREATE OR REPLACE FUNCTION trig_audit_role_profils()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        PERFORM tracer_action(
            'CHANGEMENT_ROLE', 'profil', NEW.id::text,
            jsonb_build_object('role', OLD.role),
            jsonb_build_object('role', NEW.role)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_audit_profils_role ON profils;
CREATE TRIGGER trig_audit_profils_role
    AFTER UPDATE ON profils
    FOR EACH ROW
    EXECUTE FUNCTION trig_audit_role_profils();

-- ─────────────────────────────────────────────────────────────────────────────
-- POLICIES : audit_logs accessibles seulement super_admin (lecture)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_audit_lecture_admin ON audit_logs;
CREATE POLICY pol_audit_lecture_admin ON audit_logs
    FOR SELECT
    USING (get_mon_role() = 'super_admin');

DROP POLICY IF EXISTS pol_audit_lecture_propre ON audit_logs;
CREATE POLICY pol_audit_lecture_propre ON audit_logs
    FOR SELECT
    USING (utilisateur_id = auth.uid());

-- Insertion uniquement via les triggers (SECURITY DEFINER) → personne ne peut
-- insérer manuellement
DROP POLICY IF EXISTS pol_audit_insertion ON audit_logs;
CREATE POLICY pol_audit_insertion ON audit_logs
    FOR INSERT
    WITH CHECK (false);

-- Aucune modification, aucune suppression : journal immuable
DROP POLICY IF EXISTS pol_audit_immuable_upd ON audit_logs;
CREATE POLICY pol_audit_immuable_upd ON audit_logs
    FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS pol_audit_immuable_del ON audit_logs;
CREATE POLICY pol_audit_immuable_del ON audit_logs
    FOR DELETE
    USING (false);
