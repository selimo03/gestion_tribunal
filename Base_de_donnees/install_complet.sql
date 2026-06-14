-- =============================================================================
-- INSTALL_COMPLET.SQL
-- Script maître : exécute tous les fichiers dans le bon ordre.
--
-- Utilisation :
--   psql -h <host> -U <user> -d <db> -f install_complet.sql
-- ou via Supabase SQL Editor : copier-coller les fichiers dans l'ordre.
-- =============================================================================

\echo '▶ Schema principal (juges, avocats, affaires, audiences, decisions)'
\i schema_principal.sql

\echo '▶ Historique judiciaire (timeline + triggers)'
\i historique_judiciaire.sql

\echo '▶ Confidentialité (profils, assignations, RLS)'
\i confidentialite.sql

\echo '▶ Audit des accès (journal chaîné SHA-256)'
\i audit_acces.sql

\echo '▶ Rapports statistiques (vues KPI)'
\i rapports_statistiques.sql

\echo '▶ Workflow d''approbation des inscriptions'
\i workflow_approbation.sql

\echo '▶ RLS sur juges & avocats'
\i rls_juges_avocats.sql

\echo '▶ Correctifs chaîne d''audit (format hash + REFUS_INSCRIPTION)'
\i fix_audit_chain.sql

\echo '✔ Installation terminée.'
