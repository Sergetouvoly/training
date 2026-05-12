# Holenek — Plateforme e-learning nouvelle génération

Monorepo Turborepo — Next.js 15 (frontend) + NestJS (API) + PostgreSQL + Prisma.

---

## Stack

| Couche | Technologie |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind v4, TipTap, NextAuth v5 |
| API | NestJS 11, JWT, Prisma ORM |
| Base de données | PostgreSQL 16 + pgvector |
| Cache (optionnel) | Redis 7 |
| Monorepo | Turborepo + pnpm workspaces |
| Tests | Vitest (160 tests unitaires) |

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

---

## Structure du monorepo

```
APP/
├── apps/
│   ├── api/          # NestJS — REST API, authentification JWT, Prisma
│   └── web/          # Next.js 15 — frontend apprenant + admin
├── packages/
│   ├── api-client/   # Client HTTP typé partagé (fetch + types)
│   ├── db/           # Prisma schema + migrations
│   ├── domain/       # Types d'événements domaine
│   ├── i18n/         # Traductions fr/en
│   ├── tsconfig/     # Config TypeScript partagée
│   └── ui/           # Composants React partagés (Nav…)
├── docker/
│   └── docker-compose.yml
└── SPEC-CONTENT.md   # Spec du système de contenu riche
```

---

## Scripts utiles

```bash
# Tests (160 tests unitaires)
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
| `/dashboard` | Tableau de bord personnel |
| `/parcours` | Liste des parcours de formation |
| `/parcours/:pathId/:moduleId` | Lecteur de module (leçons + quiz) |
| `/profil` | Passeport de compétences |

### Admin

| Route | Description |
|---|---|
| `/admin` | Dashboard — stats modules, apprenants, parcours |
| `/admin/modules` | Liste de tous les modules |
| `/admin/modules/new` | Créer un module |
| `/admin/modules/:id` | Éditeur WYSIWYG (TipTap) |
| `/admin/paths` | Liste des parcours |
| `/admin/paths/new` | Créer un parcours |
| `/admin/paths/:id` | Éditer un parcours |
| `/admin/learners` | Liste des apprenants avec progression |
| `/admin/learners/:id` | Détail apprenant — stamps + progression |
| `/preview/module/:id` | Prévisualisation apprenant (admin) |
