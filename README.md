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
| **Registre des affaires** | Création, consultation, filtrage, export CSV/PDF des dossiers judiciaires |
| **Planning des audiences** | Calendrier hebdomadaire dynamique, programmation par le greffier |
| **Annuaire des parties** | Gestion des plaignants, accusés, témoins et avocats |
| **Annuaire des avocats** | Fiche avocat complète : n° barreau, cabinet, spécialité, statut |
| **Annuaire des juges** | Fiche juge : tribunal, spécialité, dossiers assignés |
| **Verdicts & Décisions** | Rendu de verdicts avec validation complète (réservé au Juge) |
| **Demandes** | Gestion des demandes internes (accès dossier, transfert, etc.) |
| **Rapports** | Génération de rapports d'activité (PDF/CSV) par période |
| **Statistiques** | Graphiques d'activité, répartition par statut, rapport mensuel |
| **Notifications** | Centre de notifications en temps réel (Supabase Realtime) |
| **Audit légal** | Journal immuable SHA-256 chainé (Super Admin uniquement) |
| **Gestion des utilisateurs** | Création de comptes, gestion des rôles, activation/désactivation |
| **Profil utilisateur** | Modification des informations personnelles et du mot de passe |
| **Paramètres système** | Configuration générale de l'application |
| **Support** | Formulaire de contact et aide en ligne |
| **Internationalisation** | Interface multilingue : français, anglais, arabe (i18n) |

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
| **PDF** | jsPDF + jsPDF-AutoTable |
| **i18n** | Système custom (`src/lib/i18n.js`) + script `auto_i18n.cjs` |
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
│   ├── Layout.jsx            # Sidebar + Header avec recherche et notifications
│   ├── PublicNavbar.jsx      # Navbar pour les pages publiques
│   ├── UI.jsx                # Composants réutilisables (Badge, Card, Table, Modal, Toast)
│   └── ErrorBoundary.jsx     # Gestion des erreurs React
│
├── pages/
│   ├── Home.jsx              # Page d'accueil publique
│   ├── Features.jsx          # Présentation des fonctionnalités
│   ├── About.jsx             # Page à propos
│   ├── Privacy.jsx           # Politique de confidentialité
│   ├── Support.jsx           # Page d'aide et contact
│   ├── Login.jsx             # Authentification Supabase
│   ├── Register.jsx          # Inscription avec choix du rôle
│   ├── ForgotPassword.jsx    # Demande de réinitialisation
│   ├── ResetPassword.jsx     # Nouveau mot de passe (lien email)
│   ├── ConfirmEmail.jsx      # Confirmation d'adresse email
│   ├── Dashboard.jsx         # Tableau de bord avec stats réelles
│   ├── Affaires.jsx          # Liste et gestion des dossiers
│   ├── AffaireDetail.jsx     # Détail dossier (7 onglets)
│   ├── Audiences.jsx         # Calendrier des audiences
│   ├── Parties.jsx           # Annuaire des parties
│   ├── Avocats.jsx           # Annuaire des avocats
│   ├── Juges.jsx             # Annuaire des juges
│   ├── Demandes.jsx          # Gestion des demandes internes
│   ├── Rapports.jsx          # Génération de rapports
│   ├── Stats.jsx             # Statistiques et graphiques
│   ├── Notifications.jsx     # Centre de notifications
│   ├── AuditLogs.jsx         # Journal d'audit (super_admin)
│   ├── Users.jsx             # Gestion des utilisateurs (super_admin)
│   ├── Profile.jsx           # Profil utilisateur
│   ├── Settings.jsx          # Paramètres système
│   └── NotFound.jsx          # Page 404
│
├── context/
│   └── NotificationContext.jsx  # Contexte global des notifications
│
├── services/
│   └── api.js                # Toutes les requêtes Supabase
│
├── store/
│   └── authStore.js          # Store Zustand (auth + refreshProfile)
│
├── lib/
│   ├── supabaseClient.js     # Initialisation client Supabase
│   ├── i18n.js               # Système de traduction (fr / en / ar)
│   └── permissions.js        # Matrice RBAC — 8 rôles × 20+ permissions
│
└── hooks/
    └── usePermissions.js     # Hook React pour les permissions

scripts/
└── auto_i18n.cjs             # Script d'internationalisation automatique
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
VITE_SUPABASE_URL      = https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY = votre-cle-anon
```

**3. Déployer** — chaque `git push` sur `main` déclenche un redéploiement automatique.

---

## Scripts disponibles

```bash
npm run dev      # Serveur de développement (hot reload)
npm run build    # Build de production
npm run preview  # Prévisualisation du build
npm run lint     # Vérification ESLint

node scripts/auto_i18n.cjs   # Migration i18n automatique (textes → clés traduisibles)
node make_pptx.cjs           # Régénération de la présentation PowerPoint
```

---

## Base de données — Tables principales

| Table | Description |
|-------|-------------|
| `profils` | Profils utilisateurs (nom, prénom, rôle) — liés à `auth.users` |
| `affaires` | Dossiers judiciaires (num_dossier, type, statut, description) |
| `audiences` | Séances d'audience (date, heure, salle, type) |
| `parties` | Personnes impliquées (plaignant, accusé, témoin, avocat) |
| `avocats` | Annuaire des avocats (n° barreau, cabinet, spécialité) |
| `juges` | Annuaire des juges (tribunal, spécialité) |
| `decisions` | Verdicts rendus (immuables) |
| `assignations_dossiers` | Attribution des dossiers au personnel |
| `demandes` | Demandes internes (accès, transfert, etc.) |
| `notifications` | Notifications temps réel par utilisateur |
| `audit_logs` | Journal d'audit cryptographique (immuable, SHA-256 chainé) |

---

## Internationalisation (i18n)

L'application supporte trois langues : **Français**, **Anglais** et **Arabe**.

Le système repose sur `src/lib/i18n.js` qui contient toutes les traductions sous forme de clés.

```bash
# Extraire automatiquement les nouveaux textes et les ajouter à i18n.js
node scripts/auto_i18n.cjs
```

> ⚠️ Après l'exécution du script, les nouvelles clés `generated.*` doivent être traduites manuellement dans les sections `en` et `ar` de `i18n.js`.

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

*© 2026 Tribunal de Grande Instance de N'Djamena — JusticeTchad v2.1*
