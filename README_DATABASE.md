# JusticeTchad — Base de Données (Supabase / PostgreSQL)

> Documentation technique de la base de données du projet JusticeTchad.
> Module : Base de Données Avancées — ENASTIC 2025/2026

---

## Tables principales

| Table | Description |
|-------|-------------|
| `profils` | Profils utilisateurs liés à `auth.users` (nom, rôle, statut, actif) |
| `affaires` | Dossiers judiciaires (num_dossier, type, statut, niveau_confidentiel) |
| `audiences` | Séances d'audience (date, heure, salle, type, affaire liée) |
| `parties` | Personnes impliquées dans une affaire (type : plaignant, accusé, témoin…) |
| `decisions` | Verdicts rendus par le juge (immuables après création) |
| `assignations_dossiers` | Attribution d'un dossier à un membre du personnel judiciaire |
| `audit_logs` | Journal d'audit cryptographique SHA-256 chaîné (immuable) |

---

## Schéma des relations

```
profils ──────────────┬─── affaires (juge_id)
                      ├─── audiences (juge_id)
                      └─── assignations_dossiers (utilisateur_id)

affaires ─────────────┬─── audiences (affaire_id)
                      ├─── parties (affaire_id)
                      ├─── decisions (affaire_id)
                      └─── assignations_dossiers (affaire_id)

audit_logs ───────────── toutes les tables (hash chaîné)
```

---

## Colonnes clés par table

### `profils`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (PK) | Lié à `auth.users.id` |
| `nom` | text | Nom de famille |
| `prenom` | text | Prénom |
| `role` | text | Rôle RBAC (voir liste ci-dessous) |
| `statut_compte` | text | `en_attente`, `approuve`, `suspendu` |
| `actif` | boolean | Compte actif ou non |
| `role_demande` | text | Rôle demandé à l'inscription |

### `affaires`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (PK) | Identifiant unique |
| `num_dossier` | text (UNIQUE) | Numéro de dossier officiel |
| `type_affaire` | text | Pénal, Civil, Commercial… |
| `statut` | text | `ouvert`, `en_cours`, `clos`, `archive` |
| `niveau_confidentiel` | text | `public`, `confidentiel`, `secret` |
| `juge_id` | uuid (FK) | Juge responsable |
| `description` | text | Résumé de l'affaire |

### `audiences`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (PK) | Identifiant unique |
| `affaire_id` | uuid (FK) | Affaire concernée |
| `date_audience` | date | Date de l'audience |
| `heure_debut` | time | Heure de début |
| `type_audience` | text | Plaidoirie, Jugement, Instruction… |
| `salle` | text | Salle d'audience |

### `audit_logs`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (PK) | Identifiant unique |
| `utilisateur_id` | uuid (FK) | Auteur de l'action |
| `action` | text | Description de l'action |
| `cible_type` | text | Table ciblée |
| `cible_id` | uuid | Enregistrement ciblé |
| `hash_precedent` | text | Hash SHA-256 du log précédent |
| `hash_courant` | text | Hash SHA-256 de ce log |
| `created_at` | timestamptz | Horodatage (immuable) |

---

## Sécurité — Row Level Security (RLS)

Chaque table est protégée par des politiques RLS Supabase. Les données ne sont accessibles qu'aux rôles autorisés, même si le token JWT est valide.

| Rôle | Affaires | Audiences | Parties | Décisions | Audit |
|------|----------|-----------|---------|-----------|-------|
| `super_admin` | Tout | Tout | Tout | Voir | ✅ |
| `juge` | Ses dossiers | Voir | Voir | Rendre | ❌ |
| `procureur` | Tout + Créer | Voir | Créer/Voir | Voir | ❌ |
| `avocat` | Ses dossiers | Voir | Voir | Voir | ❌ |
| `greffier` | Tout + Créer | Programmer | Créer/Voir | Voir | ❌ |
| `huissier` | Ses dossiers | Voir | Voir | Voir | ❌ |
| `notaire` | Ses dossiers (lecture) | Voir | Voir | ❌ | ❌ |
| `gestionnaire` | Tout + Gérer | Programmer | Gérer | Voir | ❌ |

---

## Vues SQL

| Vue | Description |
|-----|-------------|
| `vue_kpi_dashboard` | Agrégats pour le tableau de bord (total affaires, audiences du jour…) |
| `vue_stats_par_statut` | Répartition des affaires par statut |
| `vue_activite_mensuelle` | Activité mois par mois |
| `vue_audiences_prochaines` | Audiences des 7 prochains jours |
| `vue_timeline_affaire` | Chronologie complète d'une affaire |

---

## Audit SHA-256

Chaque entrée dans `audit_logs` contient :
- Le hash SHA-256 du log précédent (`hash_precedent`)
- Le hash SHA-256 de ses propres données (`hash_courant`)

Cette chaîne cryptographique garantit qu'aucune entrée ne peut être modifiée ou supprimée sans être détectée.

---

## Migrations SQL

Exécuter dans Supabase → SQL Editor dans cet ordre :

1. `Base_de_donnees/migration_rbac_v2.sql` — Tables, triggers, RLS, audit
2. `Base_de_donnees/migration_roles_v3.sql` — Rôles, contraintes, politiques RLS

---

*Fatime Salim Ossou — Base de Données Avancées — ENASTIC 2025/2026*
