# WORKFLOW.md — Methode de dev + Plan d'execution bloc par bloc

## 1. Boucle non-negociable : Spec → Test → Code → Verify
1. Lire la clause SPEC.md ciblee. Si floue → question, jamais d'invention.
2. Ecrire le test qui echoue prouvant la clause.
3. Minimum de code pour que le test passe.
4. Verify : tests verts + axe-core + isolation role + Lighthouse delta <= 5.
5. Refactor uniquement si tests verts.

## 2. Definition of Done
- [ ] Tests unit + integration couvrent la feature
- [ ] Tests de role : `it_blocks_access_for_learner`, `it_allows_access_for_admin`, etc.
- [ ] axe-core AA vert sur routes UI touchees
- [ ] Lighthouse delta <= 5 points
- [ ] Event(s) EDA documentes dans SPEC.md §8
- [ ] Spec clause citee dans commit (`Refs: SPEC.md §x.y`)
- [ ] Zero TBD resolu silencieusement
- [ ] CI verte

## 3. Tests obligatoires
Pyramide : Unit 70% (Vitest) | Integration 20% (Vitest+Supertest+testcontainers) | E2E 10% (Playwright)
Transverses : `it_blocks_unauthorized_role`, `it_is_idempotent_on_event_id`, `it_passes_axe_aa`

Tests de role obligatoires sur chaque endpoint protege :
- `it_returns_403_for_learner_on_admin_endpoint`
- `it_returns_200_for_super_admin_on_any_endpoint`
- `it_returns_403_for_manager_on_write_endpoint`

## 4. Git
Branches : main | develop | feature/<phase>-<slug> | fix/<id>-<slug> | spike/<slug>
Commits : `<type>(<scope>): <subject>` + `Refs: SPEC.md §x.y`
Types : feat, fix, refactor, test, docs, perf, chore
Scopes : core, assess, ai, analytics, social, infra, auth, db, ui, ci, admin
Merge : 2 reviewers min. Squash sur develop. Merge commit sur main.

## 5. Monorepo structure

```
apps/
  web/              Next.js 15 (App Router, PWA) — interface apprenant
  admin/            Next.js 15 — interface admin / manager / trainer / super_admin
  api/              NestJS backend — API partagee entre web et admin
packages/
  domain/           Types, events, value objects (partage front/back)
  db/               Prisma schema, migrations, seeds
  event-bus/        Publisher/consumer, PG transport Phase 1
  auth/             Auth.js config, guards, RBAC
  crypto/           SHA-256 signing, certificates
  ui/               Design system React + Storybook (partage web et admin)
  i18n/             Locales fr/en
  tsconfig/         Shared TS configs
docker/
  docker-compose.yml   PG + (Redis Phase 2)
  Dockerfile.api
  Dockerfile.web
tools/
  verify-proof/     Script standalone verification <= 100 lignes
docs/
  adr/              ADR-NNNN-slug.md
```

## 6. Plan d'execution Phase 1 — bloc par bloc

### BLOC 0 — Restructuration base (FAIT)
- [x] Supprimer multi-tenant (tenant_id, TenantGuard, table Tenant)
- [x] Nouveau schema Prisma : User + Learner 1-to-1 + AppConfig
- [x] PlatformRole enum : super_admin | admin | trainer | manager | learner
- [x] JWT payload : { user_id, email, display_name, platform_role, mfa_verified }
- [x] RolesGuard mis a jour (platform_role, plus roles[])
- [x] SPEC.md, entities.ts, events.ts mis a jour
→ Verify : typecheck passe, auth compile

### BLOC 1 — Migration DB + seed
- [ ] Nouvelle migration Prisma (BLOC 0 → schema en base)
- [ ] Seed : 1 super_admin, 1 admin, 1 trainer, 1 manager, 4 learners (hr/dev/mgr/finance)
- [ ] Test : login de chaque role → JWT contient le bon platform_role
→ Verify : `pnpm prisma migrate dev`, seed OK, tests auth verts

### BLOC 2 — API admin (apps/admin routes)
- [ ] UserController : CRUD users (super_admin + admin)
- [ ] CompetenceController : CRUD (admin + super_admin)
- [ ] LearningPathController : CRUD (admin + super_admin)
- [ ] ModuleController : CRUD + publish (admin + trainer + super_admin)
- [ ] EvaluationItemController : CRUD + import CSV (admin + trainer + super_admin)
- [ ] AppConfigController : R+U (super_admin, R pour admin)
- [ ] Tests de role sur chaque endpoint
→ Verify : Swagger complet, tests verts, 403 sur mauvais role

### BLOC 3 — app admin frontend (apps/admin)
- [ ] Scaffold Next.js 15 dans apps/admin
- [ ] Auth partagee avec apps/web (@elearning/auth)
- [ ] Routes : /users, /content/modules, /content/paths, /assessments, /config
- [ ] AuthoringTool TipTap dans /content/modules/:id
- [ ] axe-core AA + Lighthouse >= 85 sur routes admin
→ Verify : navigation complete, a11y OK

### BLOC 4 — Core Learning L1 (apps/web)
- [ ] Progression module (ProgressUpdated event)
- [ ] Evaluation → Stamp (CompetenceValidated event)
- [ ] Dashboard apprenant : parcours, stamps, progression
- [ ] Test : US-1.2 (module → progression sauvegardee)
- [ ] Test : US-1.3 (evaluation → Stamp cree)
→ Verify : CRUD parcours, progression persistee, events emis

### BLOC 5 — Audit & Certificats L4
- [ ] AuditProofBundle : hash SHA-256 + signature + log immuable
- [ ] Export certificat PDF (US-1.4 RGPD JSON)
- [ ] Script tools/verify-proof/ (<= 100 lignes)
→ Verify : certificat genere, hash verifiable hors plateforme

### BLOC 6 — E2E final Phase 1
- [ ] Import banque items CSV (US-1.6)
- [ ] Test E2E : login → module → eval → stamp → certificat → export RGPD
- [ ] Tests de role E2E : learner bloque sur /admin, admin bloque sur /api/super-admin
→ Verify : tous criteres Phase 1 verts (SPEC.md §11)

## 7. Anti-patterns bannis
- Code sans test ecrit avant | `any` en TS | Secrets en clair | Logs avec PII
- Fonctions > 100 lignes | Fichiers > 500 lignes | Event renomme apres publication
- Nouvelle infra sans ADR | TBD resolu sans arbitrage | PR sans ref SPEC
- tenant_id dans le code (supprime definitivement — toute apparition = bug)
