-- =============================================================================
-- 01_SCHEMA_PRINCIPAL.SQL
-- Tables métier centrales du Tribunal de Grande Instance
-- Entités : juges, avocats, affaires, audiences, decisions, parties
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : JUGES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS juges (
    id              SERIAL PRIMARY KEY,
    matricule       VARCHAR(20) UNIQUE NOT NULL,
    nom             VARCHAR(100) NOT NULL,
    prenom          VARCHAR(100) NOT NULL,
    grade           VARCHAR(50) NOT NULL CHECK (grade IN (
                        'juge_instruction', 'juge_siege', 'juge_paix',
                        'president_chambre', 'president_tribunal'
                    )),
    chambre         VARCHAR(50),
    date_nomination DATE NOT NULL,
    email           VARCHAR(150) UNIQUE,
    telephone       VARCHAR(20),
    actif           BOOLEAN DEFAULT true,
    cree_le         TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : AVOCATS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avocats (
    id              SERIAL PRIMARY KEY,
    num_barreau     VARCHAR(20) UNIQUE NOT NULL,
    nom             VARCHAR(100) NOT NULL,
    prenom          VARCHAR(100) NOT NULL,
    cabinet         VARCHAR(150),
    specialite      VARCHAR(100),
    email           VARCHAR(150) UNIQUE,
    telephone       VARCHAR(20),
    adresse         TEXT,
    date_inscription DATE NOT NULL,
    actif           BOOLEAN DEFAULT true,
    cree_le         TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : AFFAIRES (cœur du système)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affaires (
    id                  SERIAL PRIMARY KEY,
    num_dossier         VARCHAR(30) UNIQUE NOT NULL,
    type_affaire        VARCHAR(50) NOT NULL CHECK (type_affaire IN (
                            'Pénal', 'Civil', 'Commercial', 'Administratif', 'Famille'
                        )),
    description         TEXT NOT NULL,
    date_ouverture      DATE NOT NULL DEFAULT CURRENT_DATE,
    date_cloture        DATE,
    statut              VARCHAR(20) NOT NULL DEFAULT 'en_cours' CHECK (statut IN (
                            'en_cours', 'jugee', 'appelee', 'classee'
                        )),
    juge_id             INT REFERENCES juges(id) ON DELETE RESTRICT,
    niveau_confidentiel VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (niveau_confidentiel IN (
                            'public', 'restreint', 'confidentiel', 'secret'
                        )),
    cree_le             TIMESTAMPTZ DEFAULT NOW(),
    mis_a_jour_le       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_dates_affaire CHECK (date_cloture IS NULL OR date_cloture >= date_ouverture)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : PARTIES (plaignants, défendeurs, témoins, victimes)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parties (
    id              SERIAL PRIMARY KEY,
    affaire_id      INT NOT NULL REFERENCES affaires(id) ON DELETE CASCADE,
    type_partie     VARCHAR(20) NOT NULL CHECK (type_partie IN (
                        'plaignant', 'defendeur', 'temoin', 'victime', 'expert'
                    )),
    nom             VARCHAR(100) NOT NULL,
    prenom          VARCHAR(100) NOT NULL,
    date_naissance  DATE,
    adresse         TEXT,
    telephone       VARCHAR(20),
    avocat_id       INT REFERENCES avocats(id) ON DELETE SET NULL,
    cree_le         TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : AUDIENCES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audiences (
    id              SERIAL PRIMARY KEY,
    affaire_id      INT NOT NULL REFERENCES affaires(id) ON DELETE CASCADE,
    juge_id         INT REFERENCES juges(id) ON DELETE RESTRICT,
    date_audience   DATE NOT NULL,
    heure_debut     TIME NOT NULL,
    heure_fin       TIME,
    salle           VARCHAR(30) NOT NULL,
    type_audience   VARCHAR(30) NOT NULL CHECK (type_audience IN (
                        'initiale', 'instruction', 'plaidoirie', 'verdict', 'appel'
                    )),
    statut          VARCHAR(20) NOT NULL DEFAULT 'planifiee' CHECK (statut IN (
                        'planifiee', 'tenue', 'reportee', 'annulee'
                    )),
    notes           TEXT,
    cree_le         TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_heures_audience CHECK (heure_fin IS NULL OR heure_fin > heure_debut)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : DECISIONS (verdicts, jugements)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decisions (
    id              SERIAL PRIMARY KEY,
    affaire_id      INT NOT NULL REFERENCES affaires(id) ON DELETE CASCADE,
    audience_id     INT REFERENCES audiences(id) ON DELETE SET NULL,
    juge_id         INT NOT NULL REFERENCES juges(id) ON DELETE RESTRICT,
    type_decision   VARCHAR(30) NOT NULL CHECK (type_decision IN (
                        'jugement', 'ordonnance', 'arret', 'non_lieu', 'relaxe', 'condamnation'
                    )),
    date_decision   DATE NOT NULL DEFAULT CURRENT_DATE,
    contenu         TEXT NOT NULL,
    sanction        TEXT,
    susceptible_appel BOOLEAN DEFAULT true,
    delai_appel_jours INT DEFAULT 30,
    cree_le         TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (affaire_id, type_decision, date_decision)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE DE LIAISON : AVOCATS ↔ AFFAIRES (un avocat peut suivre plusieurs dossiers)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avocats_affaires (
    avocat_id           INT NOT NULL REFERENCES avocats(id) ON DELETE CASCADE,
    affaire_id          INT NOT NULL REFERENCES affaires(id) ON DELETE CASCADE,
    role                VARCHAR(20) NOT NULL CHECK (role IN ('defense', 'partie_civile')),
    date_designation    DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (avocat_id, affaire_id, role)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEX pour les requêtes fréquentes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_affaires_statut       ON affaires(statut);
CREATE INDEX IF NOT EXISTS idx_affaires_juge         ON affaires(juge_id);
CREATE INDEX IF NOT EXISTS idx_affaires_type         ON affaires(type_affaire);
CREATE INDEX IF NOT EXISTS idx_affaires_date         ON affaires(date_ouverture DESC);
CREATE INDEX IF NOT EXISTS idx_affaires_confid       ON affaires(niveau_confidentiel);
CREATE INDEX IF NOT EXISTS idx_audiences_date        ON audiences(date_audience);
CREATE INDEX IF NOT EXISTS idx_audiences_affaire     ON audiences(affaire_id);
CREATE INDEX IF NOT EXISTS idx_decisions_affaire     ON decisions(affaire_id);
CREATE INDEX IF NOT EXISTS idx_parties_affaire       ON parties(affaire_id);
CREATE INDEX IF NOT EXISTS idx_juges_actif           ON juges(actif);
CREATE INDEX IF NOT EXISTS idx_avocats_actif         ON avocats(actif);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER : mise à jour automatique du champ mis_a_jour_le
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_mis_a_jour_le()
RETURNS TRIGGER AS $$
BEGIN
    NEW.mis_a_jour_le := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_affaires_maj ON affaires;
CREATE TRIGGER trig_affaires_maj
    BEFORE UPDATE ON affaires
    FOR EACH ROW
    EXECUTE FUNCTION touch_mis_a_jour_le();
