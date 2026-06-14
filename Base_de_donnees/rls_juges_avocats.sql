-- =============================================================================
-- 07_RLS_JUGES_AVOCATS.SQL
-- Active la Row Level Security manquante sur juges et avocats.
--
-- Lecture : ouverte à tous les profils métier (annuaire interne)
-- Écriture : super_admin + gestionnaire (+ greffier pour avocats uniquement)
-- =============================================================================

-- ─── JUGES ───────────────────────────────────────────────────────────────────
ALTER TABLE juges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_juges_lecture ON juges;
CREATE POLICY pol_juges_lecture ON juges
    FOR SELECT
    USING (
        get_mon_role() IN (
            'super_admin', 'gestionnaire', 'greffier',
            'juge', 'procureur', 'avocat', 'huissier', 'notaire'
        )
    );

DROP POLICY IF EXISTS pol_juges_ecriture ON juges;
CREATE POLICY pol_juges_ecriture ON juges
    FOR ALL
    USING (get_mon_role() IN ('super_admin', 'gestionnaire'))
    WITH CHECK (get_mon_role() IN ('super_admin', 'gestionnaire'));

-- ─── AVOCATS ─────────────────────────────────────────────────────────────────
ALTER TABLE avocats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_avocats_lecture ON avocats;
CREATE POLICY pol_avocats_lecture ON avocats
    FOR SELECT
    USING (
        get_mon_role() IN (
            'super_admin', 'gestionnaire', 'greffier',
            'juge', 'procureur', 'avocat', 'huissier', 'notaire'
        )
    );

DROP POLICY IF EXISTS pol_avocats_ecriture ON avocats;
CREATE POLICY pol_avocats_ecriture ON avocats
    FOR ALL
    USING (get_mon_role() IN ('super_admin', 'gestionnaire', 'greffier'))
    WITH CHECK (get_mon_role() IN ('super_admin', 'gestionnaire', 'greffier'));

-- ─── AVOCATS_AFFAIRES (table de liaison) ─────────────────────────────────────
ALTER TABLE avocats_affaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_avocats_affaires_lecture ON avocats_affaires;
CREATE POLICY pol_avocats_affaires_lecture ON avocats_affaires
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM affaires a WHERE a.id = avocats_affaires.affaire_id)
    );

DROP POLICY IF EXISTS pol_avocats_affaires_ecriture ON avocats_affaires;
CREATE POLICY pol_avocats_affaires_ecriture ON avocats_affaires
    FOR ALL
    USING (get_mon_role() IN ('super_admin', 'gestionnaire', 'greffier'))
    WITH CHECK (get_mon_role() IN ('super_admin', 'gestionnaire', 'greffier'));

-- ─── COMPLÉMENT : élargir l'écriture des audiences au procureur ──────────────
-- (cohérent avec la nouvelle permission audiences.edit côté frontend)
DROP POLICY IF EXISTS pol_aud_ecriture ON audiences;
CREATE POLICY pol_aud_ecriture ON audiences
    FOR ALL
    USING (
        get_mon_role() IN ('super_admin', 'gestionnaire', 'greffier', 'juge', 'procureur')
    )
    WITH CHECK (
        get_mon_role() IN ('super_admin', 'gestionnaire', 'greffier', 'juge', 'procureur')
    );

NOTIFY pgrst, 'reload schema';
