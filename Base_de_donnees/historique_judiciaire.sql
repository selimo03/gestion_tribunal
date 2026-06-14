-- =============================================================================
-- 02_HISTORIQUE_JUDICIAIRE.SQL
-- Traçabilité de l'évolution de chaque dossier dans le temps
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : HISTORIQUE_AFFAIRES
-- Garde une trace immuable de chaque changement sur une affaire
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historique_affaires (
    id              BIGSERIAL PRIMARY KEY,
    affaire_id      INT NOT NULL REFERENCES affaires(id) ON DELETE CASCADE,
    evenement       VARCHAR(50) NOT NULL CHECK (evenement IN (
                        'ouverture', 'changement_statut', 'changement_juge',
                        'audience_planifiee', 'audience_tenue', 'decision_rendue',
                        'classement', 'reouverture', 'changement_confidentialite'
                    )),
    ancien_etat     JSONB,
    nouvel_etat     JSONB,
    auteur_id       UUID,
    auteur_nom      VARCHAR(150),
    commentaire     TEXT,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hist_affaire   ON historique_affaires(affaire_id);
CREATE INDEX IF NOT EXISTS idx_hist_timestamp ON historique_affaires(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_hist_evenement ON historique_affaires(evenement);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER : enregistre toute création d'affaire
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_creation_affaire()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO historique_affaires (
        affaire_id, evenement, nouvel_etat, auteur_id, commentaire
    ) VALUES (
        NEW.id,
        'ouverture',
        to_jsonb(NEW),
        auth.uid(),
        'Dossier ouvert : ' || NEW.num_dossier
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_hist_creation_affaire ON affaires;
CREATE TRIGGER trig_hist_creation_affaire
    AFTER INSERT ON affaires
    FOR EACH ROW
    EXECUTE FUNCTION log_creation_affaire();

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER : enregistre tout changement de statut, juge ou confidentialité
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_changement_affaire()
RETURNS TRIGGER AS $$
DECLARE
    v_evenement VARCHAR(50);
BEGIN
    IF OLD.statut IS DISTINCT FROM NEW.statut THEN
        v_evenement := 'changement_statut';
    ELSIF OLD.juge_id IS DISTINCT FROM NEW.juge_id THEN
        v_evenement := 'changement_juge';
    ELSIF OLD.niveau_confidentiel IS DISTINCT FROM NEW.niveau_confidentiel THEN
        v_evenement := 'changement_confidentialite';
    ELSE
        RETURN NEW;
    END IF;

    INSERT INTO historique_affaires (
        affaire_id, evenement, ancien_etat, nouvel_etat, auteur_id
    ) VALUES (
        NEW.id,
        v_evenement,
        to_jsonb(OLD),
        to_jsonb(NEW),
        auth.uid()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_hist_maj_affaire ON affaires;
CREATE TRIGGER trig_hist_maj_affaire
    AFTER UPDATE ON affaires
    FOR EACH ROW
    EXECUTE FUNCTION log_changement_affaire();

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER : log lors d'une décision rendue
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_decision_rendue()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO historique_affaires (
        affaire_id, evenement, nouvel_etat, auteur_id, commentaire
    ) VALUES (
        NEW.affaire_id,
        'decision_rendue',
        to_jsonb(NEW),
        auth.uid(),
        'Décision ' || NEW.type_decision || ' rendue le ' || NEW.date_decision
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_hist_decision ON decisions;
CREATE TRIGGER trig_hist_decision
    AFTER INSERT ON decisions
    FOR EACH ROW
    EXECUTE FUNCTION log_decision_rendue();

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER : log audience planifiée / tenue
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_audience()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO historique_affaires (
            affaire_id, evenement, nouvel_etat, auteur_id, commentaire
        ) VALUES (
            NEW.affaire_id,
            'audience_planifiee',
            to_jsonb(NEW),
            auth.uid(),
            'Audience planifiée le ' || NEW.date_audience || ' à ' || NEW.heure_debut
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.statut IS DISTINCT FROM NEW.statut AND NEW.statut = 'tenue' THEN
        INSERT INTO historique_affaires (
            affaire_id, evenement, ancien_etat, nouvel_etat, auteur_id
        ) VALUES (
            NEW.affaire_id,
            'audience_tenue',
            to_jsonb(OLD),
            to_jsonb(NEW),
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_hist_audience ON audiences;
CREATE TRIGGER trig_hist_audience
    AFTER INSERT OR UPDATE ON audiences
    FOR EACH ROW
    EXECUTE FUNCTION log_audience();

-- ─────────────────────────────────────────────────────────────────────────────
-- VUE : timeline complète d'un dossier (utilisée par la page détail)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vue_timeline_affaire AS
SELECT
    h.id,
    h.affaire_id,
    a.num_dossier,
    h.evenement,
    h.commentaire,
    h.auteur_nom,
    h.timestamp,
    h.ancien_etat,
    h.nouvel_etat
FROM historique_affaires h
JOIN affaires a ON a.id = h.affaire_id
ORDER BY h.timestamp DESC;
