# JusticeTchad — Système de Gestion Judiciaire

> Projet universitaire — Module **Bases de Données Avancées (BDA)**  
> Tribunal de Grande Instance de N'Djamena, Tchad

---

## Présentation

**JusticeTchad** est une application web complète de gestion des dossiers judiciaires pour le Tribunal de Grande Instance de N'Djamena. Elle permet de gérer l'ensemble du cycle de vie d'une affaire judiciaire : ouverture du dossier, planification des audiences, gestion des parties, rendu des verdicts, et traçabilité complète via un journal d'audit cryptographique.

**Application déployée :** [tchad-tribune.vercel.app](https://tchad-tribune.vercel.app)

---

## Fonctionnalités principales

| Module | Description |
|--------|-------------|
| **Tableau de bord** | Statistiques en temps réel, activité mensuelle, prochaines audiences |
| **Registre des affaires** | Création, consultation, filtrage, export CSV des dossiers judiciaires |
| **Planning des audiences** | Calendrier hebdomadaire dynamique, programmation par le greffier |
| **Annuaire des parties** | Gestion des plaignants, accusés, témoins et avocats |
| **Verdicts & Décisions** | Rendu de verdicts avec validation complète (réservé au Juge) |
| **Assignation de dossiers** | Attribution des dossiers au personnel judiciaire |
| **Pièces jointes** | Upload et téléchargement de documents (Supabase Storage) |
| **Historique des modifications** | Traçabilité complète de chaque dossier |
| **Statistiques** | Graphiques d'activité, répartition par statut, rapport mensuel |
| **Audit légal** | Journal immuable SHA-256 chainé (Super Admin uniquement) |
| **Gestion des utilisateurs** | Création de comptes, gestion des rôles, activation/désactivation |
| **Recherche globale** | Recherche en temps réel dans les dossiers depuis le header |

---

## Architecture technique

### Stack

| Catégorie | Technologie |
|-----------|-------------|
| **Framework** | React 19 + Vite 8 |
| **Backend** | Supabase (PostgreSQL 16 + Auth + Storage + Realtime) |
| **Routage** | React Router DOM 7 |
| **State global** | Zustand (auth persistée localStorage) |
| **Formulaires** | React Hook Form + Zod |
| **Styles** | Tailwind CSS 3 + PostCSS |
| **Graphiques** | Recharts |
| **Icônes** | Lucide React |
| **Déploiement** | Vercel |

### Sécurité base de données

- **Row Level Security (RLS)** — chaque rôle voit uniquement ses données autorisées
- **Audit logs immuables** — chaîne cryptographique SHA-256, trigger BEFORE DELETE/UPDATE
- **RBAC complet** — 8 rôles avec matrice de permissions granulaires
- **Triggers automatiques** — création de profil à l'inscription, log des changements de statut

---

## Structure du projet

```
src/
├── components/
│   ├── Layout.jsx          # Sidebar + Header avec recherche et notifications
│   ├── UI.jsx              # Composants réutilisables (Badge, Card, Table, Modal, Toast)
│   └── ErrorBoundary.jsx   # Gestion des erreurs React
│
├── pages/
│   ├── Home.jsx            # Page d'accueil publique
│   ├── Features.jsx        # Présentation des fonctionnalités
│   ├── About.jsx           # Page à propos
│   ├── Login.jsx           # Authentification Supabase
│   ├── Register.jsx        # Inscription avec choix du rôle
│   ├── ForgotPassword.jsx  # Demande de réinitialisation
│   ├── ResetPassword.jsx   # Nouveau mot de passe (lien email)
│   ├── ConfirmEmail.jsx    # Confirmation d'adresse email
│   ├── Dashboard.jsx       # Tableau de bord avec stats réelles
│   ├── Affaires.jsx        # Liste et gestion des dossiers
│   ├── AffaireDetail.jsx   # Détail dossier (7 onglets)
│   ├── Audiences.jsx       # Calendrier des audiences
│   ├── Parties.jsx         # Annuaire des parties
│   ├── Stats.jsx           # Statistiques et graphiques
│   ├── AuditLogs.jsx       # Journal d'audit (super_admin)
│   ├── Users.jsx           # Gestion des utilisateurs (super_admin)
│   ├── Profile.jsx         # Profil utilisateur
│   ├── Settings.jsx        # Paramètres système
│   └── NotFound.jsx        # Page 404
│
├── services/
│   └── api.js              # Toutes les requêtes Supabase
│
├── store/
│   └── authStore.js        # Store Zustand (auth + refreshProfile)
│
├── lib/
│   ├── supabaseClient.js   # Initialisation client Supabase
│   └── permissions.js      # Matrice RBAC — 8 rôles × 20+ permissions
│
└── hooks/
    └── usePermissions.js   # Hook React pour les permissions
```

---

## Les 8 rôles et leurs permissions

| Rôle | Affaires | Audiences | Parties | Verdicts | Stats | Audit | Utilisateurs |
|------|----------|-----------|---------|----------|-------|-------|--------------|
| **Super Admin** | Tout | Tout | Tout | Voir | ✅ | ✅ | ✅ |
| **Juge** | Ses dossiers | Voir | Voir | **Rendre** | ✅ | ❌ | ❌ |
| **Procureur** | Tout + Créer | Voir | Créer/Voir | Voir | ❌ | ❌ | ❌ |
| **Avocat** | Ses dossiers | Voir | Voir | Voir | ❌ | ❌ | ❌ |
| **Greffier** | Tout + Créer | **Programmer** | Créer/Voir | Voir | ✅ | ❌ | ❌ |
| **Huissier** | Ses dossiers | Voir | Voir | Voir | ❌ | ❌ | ❌ |
| **Notaire** | Ses dossiers (lecture) | Voir | Voir | ❌ | ❌ | ❌ | ❌ |
| **Gestionnaire** | Tout + Gérer | Programmer | Gérer | Voir | ✅ | ❌ | ❌ |

---

## Installation et développement local

### Prérequis
- Node.js 18+
- Compte Supabase ([supabase.com](https://supabase.com))

### Étapes

**1. Cloner le projet**
```bash
git clone https://github.com/selimo03/gestion_tribunal.git
cd gestion_tribunal
```

**2. Installer les dépendances**
```bash
npm install
```

**3. Configurer les variables d'environnement**
```bash
cp .env.example .env
```
Remplir `.env` avec vos identifiants Supabase :
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

**4. Initialiser la base de données**

Dans Supabase → SQL Editor, exécuter dans l'ordre :
1. `migration_rbac_v2.sql` — Tables, triggers, RLS, audit
2. `migration_roles_v3.sql` — 8 rôles, contraintes, politiques RLS

**5. Lancer l'application**
```bash
npm run dev
```
L'application est disponible sur `http://localhost:5173`

---

## Déploiement sur Vercel

**1. Connecter le dépôt GitHub à Vercel**

**2. Configurer les variables d'environnement dans Vercel :**
```
VITE_SUPABASE_URL     = https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY = votre-cle-anon
```

**3. Déployer** — chaque `git push` sur `main` déclenche un redéploiement automatique.

---

---

## Scripts disponibles

```bash
npm run dev      # Serveur de développement (hot reload)
npm run build    # Build de production
npm run preview  # Prévisualisation du build
npm run lint     # Vérification ESLint
```

---

## Base de données — Tables principales

| Table | Description |
|-------|-------------|
| `profils` | Profils utilisateurs (nom, prénom, rôle) — liés à `auth.users` |
| `affaires` | Dossiers judiciaires (num_dossier, type, statut, description) |
| `audiences` | Séances d'audience (date, heure, salle, type) |
| `parties` | Personnes impliquées (plaignant, accusé, témoin, avocat) |
| `decisions` | Verdicts rendus (immuables) |
| `assignations_dossiers` | Attribution des dossiers au personnel |
| `audit_logs` | Journal d'audit cryptographique (immuable, SHA-256 chainé) |

---

## Présentation de soutenance

Le fichier `JusticeTchad_Presentation.pptx` (11 slides) accompagne ce projet pour la soutenance du module **Base de Données Avancées**.

| Slide | Contenu |
|-------|---------|
| 1 | Page de garde — Fatime Salim Ossou · Brahin Issa Hassaballah |
| 2 | Plan de la présentation |
| 3 | Contexte & Problématique |
| 4 | Objectifs du projet |
| 5 | Architecture technique |
| 6 | Fonctionnalités clés |
| 7 | Sécurité & RBAC (8 rôles) |
| 8 | Base de données (tables & vues SQL) |
| 9 | Interface & expérience utilisateur |
| 10 | Qualité & améliorations apportées |
| 11 | Bilan & perspectives |

Pour régénérer la présentation après modification :
```bash
node make_pptx.cjs
```

---

## Auteur

**Fatime Salim Ossou** — Étudiante en Informatique  
ENASTIC · Module Bases de Données Avancées · 2026  

📧 [salimossoufatime@gmail.com](mailto:salimossoufatime@gmail.com)  
🔗 [LinkedIn](https://www.linkedin.com/in/fatime-salim-ossou-b88ab43bb)

---

*© 2026 Tribunal de Grande Instance de N'Djamena — JusticeTchad v2.0*
