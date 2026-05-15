# Holenek — Plateforme e-learning nouvelle génération

Monorepo Turborepo — Next.js 15 (frontend) + NestJS (API) + PostgreSQL + Prisma.

---

## Stack

| Couche | Technologie |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind v4, TipTap 3, NextAuth v5 |
| API | NestJS 11, JWT, Prisma ORM, @nestjs/schedule (cron), nodemailer (SMTP) |
| Base de données | PostgreSQL 16 + pgvector |
| Cache (optionnel) | Redis 7 |
| Monorepo | Turborepo + pnpm workspaces |
| Tests | Vitest (tests unitaires + intégration) |

---

## Fonctionnalités principales

- **RBAC dynamique** — autorisation pilotée par permissions (`roles` × `permissions` × `user_permissions`), grants/denys individuels par utilisateur, JWT embarquant les permissions calculées au login
- **Authentification** — login email/password + MFA TOTP optionnel, refresh JWT silencieux
- **Contenu** — éditeur WYSIWYG TipTap (blocs riches : texte, images redimensionnables, vidéos, callouts, formes SVG, quiz), workflow brouillon → publié avec `version_hash`
- **Parcours & modules** — assignation à des apprenants avec échéance, badge « En retard », recherche et filtres
- **Évaluations** — banque de questions, import CSV et JSON, quiz avec scoring et stamps de compétence
- **Espaces dédiés** — admin, formateur, manager (analytics équipe), apprenant
- **Certificats & audit** — export PDF de certificat (R-1.5), dossier d'audit JSON signé (R-4.3)
- **Notifications** — in-app actionnables, email SMTP, rappels automatiques (cron) : stamps expirants, assignations en retard, streaks
- **Onboarding** — wizard 3 étapes à la première connexion d'un apprenant

---

## Prérequis

- **Node.js** ≥ 20
- **pnpm** ≥ 10 — `npm install -g pnpm`
- **Docker Desktop** (pour PostgreSQL en local)

---

## Démarrage rapide

### 1. Cloner et installer les dépendances

```bash
git clone <repo-url>
cd APP
pnpm install
```

### 2. Configurer les variables d'environnement

```bash
# Racine (optionnel — les apps ont leurs propres .env)
cp .env.example .env

# API NestJS
cp apps/api/.env.example apps/api/.env

# Frontend Next.js
cp apps/web/.env.local.example apps/web/.env.local
```

Éditez `apps/api/.env` :

```env
DATABASE_URL="postgresql://elearning:elearning_dev@localhost:5433/elearning_dev?schema=public"
PORT=3001
JWT_SECRET=<chaîne-aléatoire-64-chars-minimum>
JWT_EXPIRY=1h
MFA_SECRET=<chaîne-aléatoire-32-chars-minimum>
```

Éditez `apps/web/.env.local` :

```env
NEXTAUTH_SECRET=<chaîne-aléatoire-32-chars-minimum>
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Lancer PostgreSQL via Docker

```bash
docker compose -f docker/docker-compose.yml up postgres -d
```

Vérifie que la base est prête :

```bash
docker logs elearning-pg --tail 5
# doit afficher : database system is ready to accept connections
```

### 4. Appliquer les migrations Prisma

```bash
pnpm --filter @elearning/db exec prisma migrate deploy
# ou en développement (crée la migration si besoin) :
pnpm --filter @elearning/db exec prisma migrate dev
```

---

## Lancer les projets

### Option A — Tout en même temps (Turborepo)

```bash
pnpm dev
```

Lance en parallèle : `apps/api` (port 3001) + `apps/web` (port 3000).

---

### Option B — Terminal par terminal (recommandé en développement)

**Terminal 1 — API NestJS** (avec hot-reload via nodemon) :

```bash
pnpm --filter @elearning/api run dev:watch
```

L'API est disponible sur `http://localhost:3001`.

**Terminal 2 — Frontend Next.js** (avec Turbopack) :

```bash
pnpm --filter @elearning/web run dev
```

Le frontend est disponible sur `http://localhost:3000`.

---

### Option C — Docker complet (production locale)

Lance l'intégralité de la stack (PostgreSQL + Redis + API + Web) :

```bash
docker compose -f docker/docker-compose.yml up --build
```

Variables requises dans un fichier `.env` à la racine :

```env
JWT_SECRET=<64-chars>
MFA_SECRET=<32-chars>
NEXTAUTH_SECRET=<32-chars>
```

---

## URLs

| Service | URL |
|---|---|
| Frontend apprenant | http://localhost:3000 |
| Admin | http://localhost:3000/admin |
| API NestJS | http://localhost:3001 |
| Prisma Studio (DB) | `pnpm --filter @elearning/db exec prisma studio` |

---

## Comptes de développement

Lancer le seed une fois avant de tester :

```bash
pnpm --filter @elearning/db db:seed
```

| Rôle | Email | Mot de passe | Espaces accessibles |
|------|-------|--------------|---------------------|
| Super Admin | `super@holenek.fr` | `SuperAdmin1!` | `/dashboard` `/admin` `/trainer` `/manager` |
| Admin | `admin@holenek.fr` | `Admin1234!` | `/dashboard` `/admin` `/trainer` `/manager` |
| Formateur | `formateur@holenek.fr` | `Trainer1234!` | `/dashboard` `/trainer` `/admin` |
| Manager | `manager@holenek.fr` | `Manager1234!` | `/dashboard` `/manager` |
| Apprenant (Alice) | `alice@holenek.fr` | `Learner1234!` | `/dashboard` `/parcours` `/profil` |
| Apprenant (Bob) | `bob@holenek.fr` | `Learner1234!` | `/dashboard` `/parcours` `/profil` |

Le champ **Code MFA** sur la page de connexion est optionnel — laisser vide.

Pour se déconnecter : menu utilisateur (coin supérieur droit) → **Déconnexion**.

> **Note RBAC** — admin, formateur et manager héritent des droits apprenant : ils peuvent suivre des formations en plus de leur espace dédié.

---

## Configuration optionnelle (via l'espace admin)

Certains paramètres se configurent depuis `/admin/config` (table `app_config`), sans redéploiement :

| Clé | Rôle |
|---|---|
| `smtp_host` `smtp_port` `smtp_user` `smtp_pass` | Serveur SMTP pour l'envoi d'emails — laisser `smtp_host` vide désactive les emails |
| `platform_url` | URL de base utilisée dans les liens des emails |
| `cron_stamps_expiring_enabled` | Active le rappel quotidien des certifications expirant sous 30 jours |
| `cron_overdue_assignments_enabled` | Active le rappel quotidien des formations en retard |
| `cron_streak_reminder_enabled` | Active le rappel quotidien de streak |
| `jwt_ttl_minutes` | Durée de validité du JWT (défaut 480 min) |
| `stamp_validity_months` | Durée de validité d'un stamp de compétence |

---

## Structure du monorepo

```
APP/
├── apps/
│   ├── api/          # NestJS — REST API, JWT, Prisma
│   │   └── src/      # auth, user, role, learning, assessment, assignment,
│   │   │             # audit, simulator, social, scheduler, trash, ai…
│   └── web/          # Next.js 15 — frontend apprenant + admin
├── packages/
│   ├── api-client/   # Client HTTP typé partagé (fetch + types + Block)
│   ├── crypto/       # Hashes SHA-256, bundles de preuve audit
│   ├── db/           # Prisma schema + migrations + seed RBAC
│   ├── domain/       # Permissions + événements domaine
│   ├── event-bus/    # Bus d'événements interne
│   ├── i18n/         # Traductions fr/en
│   ├── tsconfig/     # Config TypeScript partagée
│   └── ui/           # Composants React partagés (Nav, Skeleton…)
├── docker/
│   └── docker-compose.yml
└── SPEC-CONTENT.md   # Spec du système de contenu riche
```

---

## Scripts utiles

```bash
# Tests (unitaires + intégration)
pnpm test

# Vérification TypeScript sur tout le monorepo
pnpm typecheck

# Build complet
pnpm build

# Prisma Studio (interface graphique DB)
pnpm --filter @elearning/db exec prisma studio

# Générer le client Prisma après modification du schéma
pnpm --filter @elearning/db exec prisma generate

# Créer une nouvelle migration
pnpm --filter @elearning/db exec prisma migrate dev --name nom-de-la-migration
```

---

## Pages disponibles

### Apprenant

| Route | Description |
|---|---|
| `/dashboard` | Tableau de bord personnel (+ wizard onboarding première connexion) |
| `/parcours` | Parcours de formation — recherche et filtres |
| `/parcours/:pathId` | Détail d'un parcours |
| `/parcours/:pathId/:moduleId` | Lecteur de module (leçons + quiz) |
| `/module/catalogue` | Catalogue de modules — recherche et filtres |
| `/eval` | Évaluations |
| `/profil` | Passeport de compétences + modification du compte |
| `/notifications` | Centre de notifications |

### Admin

| Route | Description |
|---|---|
| `/admin` | Dashboard — stats modules, apprenants, parcours |
| `/admin/modules` | Liste des modules — recherche, filtres statut/compétence/durée |
| `/admin/modules/new` | Créer un module |
| `/admin/modules/:id` | Éditeur WYSIWYG (TipTap) |
| `/admin/paths` | Liste des parcours |
| `/admin/paths/new` `…/:id` | Créer / éditer un parcours |
| `/admin/competences` | Référentiel de compétences |
| `/admin/assessment` | Banque de questions — import CSV/JSON |
| `/admin/learners` | Liste des apprenants avec progression |
| `/admin/learners/:id` | Détail apprenant — stamps, progression, assignation |
| `/admin/users` | Comptes utilisateurs |
| `/admin/users/:id` | Édition compte — rôles, vues, permissions directes |
| `/admin/roles` `…/:id` | Gestion des rôles RBAC |
| `/admin/permissions` | Catalogue des permissions — rôles et grants par permission |
| `/admin/trash` | Corbeille — restauration d'éléments supprimés |
| `/admin/config` | Configuration plateforme (SMTP, cron, JWT…) |

### Espaces formateur & manager

| Route | Description |
|---|---|
| `/trainer` | Espace formateur — modules + suivi apprenants |
| `/trainer/learners` `…/:id` | Apprenants suivis par le formateur |
| `/manager` | Espace manager — analytics équipe, progression par module |
| `/manager/learners/:id` | Détail d'un membre de l'équipe |
