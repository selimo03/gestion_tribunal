# Base de données — Gestion du Tribunal de Grande Instance

Modélisation PostgreSQL / Supabase d'un système judiciaire complet.

## Fonctionnalités couvertes

| Module | Fichier | Description |
|--------|---------|-------------|
| Entités métier | `schema_principal.sql` | juges, avocats, affaires, audiences, décisions, parties |
| Historique judiciaire | `historique_judiciaire.sql` | Timeline immuable de chaque dossier (triggers automatiques) |
| Confidentialité | `confidentialite.sql` | 4 niveaux (public → secret) + RLS par rôle |
| Audit des accès | `audit_acces.sql` | Journal chaîné SHA-256, immuable |
| Rapports statistiques | `rapports_statistiques.sql` | Vues KPI + fonction de rapport par période |

## Schéma relationnel (vue d'ensemble)

```
                    ┌──────────┐         ┌──────────┐
                    │  juges   │         │ avocats  │
                    └────┬─────┘         └────┬─────┘
                         │                    │
                         │ 1..N               │ N..N
                         ▼                    ▼
   ┌─────────────────────────────────────────────────────┐
   │                     affaires                        │
   │  (num_dossier, type, statut, niveau_confidentiel)   │
   └──┬─────────────┬─────────────┬──────────────────────┘
      │ 1..N        │ 1..N        │ 1..N
      ▼             ▼             ▼
  ┌────────┐  ┌──────────┐  ┌──────────┐
  │parties │  │audiences │  │decisions │
  └────────┘  └──────────┘  └──────────┘

  + historique_affaires (timeline)
  + assignations_dossiers (lien profils ↔ affaires)
  + audit_logs (journal chaîné)
```

## Niveaux de confidentialité

| Niveau | Qui peut lire |
|--------|---------------|
| `public` | Tout utilisateur authentifié |
| `restreint` | Tous les profils métier (juge, procureur, avocat, greffier, huissier, notaire) |
| `confidentiel` | Uniquement utilisateurs **assignés** au dossier + super_admin/gestionnaire |
| `secret` | super_admin + juge titulaire uniquement |

## Rôles utilisateurs

`super_admin`, `gestionnaire`, `juge`, `procureur`, `avocat`, `greffier`, `huissier`, `notaire`

## Installation

### Option 1 — psql en ligne de commande

```bash
psql "postgresql://user:pass@host:5432/db" -f 00_install_complet.sql
```

### Option 2 — Supabase SQL Editor

Copier-coller dans l'ordre :
1. `schema_principal.sql`
2. `historique_judiciaire.sql`
3. `confidentialite.sql`
4. `audit_acces.sql`
5. `rapports_statistiques.sql`

## Audit immuable

La table `audit_logs` chaîne chaque ligne au précédent via un hash SHA-256
(`hash_courant = sha256(hash_precedent || contenu)`). Toute tentative de
modification ou suppression rétroactive casse la chaîne et devient détectable.

Les policies RLS interdisent UPDATE et DELETE sur `audit_logs` — seule la
fonction `tracer_action()` (SECURITY DEFINER) peut y écrire, via les triggers.

## Exemples de requêtes statistiques

```sql
-- Tableau de bord
SELECT * FROM vue_kpi_dashboard;

-- Audiences des 7 prochains jours
SELECT * FROM vue_audiences_prochaines;

-- Charge de travail par juge
SELECT * FROM vue_charge_juges;

-- Rapport d'activité sur une période
SELECT * FROM rapport_periode('2026-01-01', '2026-06-30');
```
