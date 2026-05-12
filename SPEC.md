# SPEC.md — Source unique de verite (Spec + Domain + Architecture)

## 1. Vision
LMS interne Holenek — outil de formation des collaborateurs + simulateur metier + conformite audit CNIL/ANSSI.
On reduit le risque mesurable, pas le taux de completion.
Application mono-organisation : 1 seule instance, 1 seule base de donnees, isolation par roles.

## 2. Stack
Frontend (tous roles) : Next.js 15 (App Router, PWA) dans apps/web — routing par role (/admin, /trainer, /manager, /dashboard)
Backend : NestJS (Node.js) dans apps/api
DB : PostgreSQL 16 + Prisma + pgvector
Auth : JWT + MFA TOTP | Monorepo : Turborepo + pnpm | Tests : Vitest + Playwright + axe-core
Events Phase 1 : PG append-only + NOTIFY | Phase 2+ : Redis Streams | Observability : OpenTelemetry

## 3. Architecture 5 couches
L1 Core Learning : parcours, modules, progression, stamps (deterministe, pas de dep externe)
L2 Assessment : banque items, scoring, simulateur (deterministe, pas de dep externe)
L3 AI Layer : RAG, recommandation, correction semantique (Phase 3, LLM)
L4 Analytics/Compliance : dashboards, blind spot, jumeau, preuves crypto (consomme UNIQUEMENT des events)
L5 Social/Engagement : buddy, defis, streak, LITF
Regle : L1/L2 ne dependent JAMAIS de L3. L4 ne fait JAMAIS d'appel direct aux entites — events only.

## 4. Isolation et securite
- Pas de multi-tenant. 1 seule organisation (Holenek). Isolation = roles uniquement.
- Tout acces est scope par platform_role dans le JWT.
- RolesGuard sur tous les endpoints proteges.
- Toute ecriture certifiable → hash + event + log immuable.
- WCAG AA = CI gate (axe-core). i18n obligatoire, zero hardcoded string.
- P95 < 300ms API. Lighthouse >= 85 routes critiques.

## 5. Roles plateforme (PlatformRole)

```
super_admin  CRUD sur tout, acces a app_config, gestion users tous roles. Espace : /admin
admin        CRUD contenu + parcours + users (sauf super_admin). Espace : /admin
trainer      CRUD modules + evaluation_items. Lecture apprenants (liste + detail). Espace : /trainer
manager      Lecture dashboards agreges + detail membres equipe. Espace : /manager
learner      Progression + evaluations sur soi uniquement. Lecture modules assignes. Espace : /dashboard
```

Regle mixte : admin, trainer, manager ont aussi les droits learner (ils peuvent suivre des formations).
Un user a exactement 1 platform_role (pas de multi-roles).

Espaces frontend isoles :
- /admin/** : super_admin + admin uniquement (layout guard + guard par page)
- /admin/modules/**, /admin/paths/**, /admin/assessment : super_admin + admin + trainer
- /trainer/** : super_admin + admin + trainer
- /manager/** : super_admin + admin + manager
- /dashboard/** : tous les roles authentifies

## 6. Entites (types canoniques)

```typescript
// Identite + authentification + role plateforme
type User = {
  id: string;
  email: string;               // unique global
  password_hash: string;
  display_name: string;
  platform_role: PlatformRole; // "super_admin"|"admin"|"trainer"|"manager"|"learner"
  is_active: boolean;
  mfa_secret: string | null;
  mfa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

// Profil metier de l'apprenant (1-to-1 avec User)
type Learner = {
  id: string;
  user_id: string;             // FK vers User
  job_role: JobRole;           // "hr"|"developer"|"manager"|"finance" (metier, pas role plateforme)
  team_id: string | null;      // label organisationnel libre (ex: "pole-rh")
  created_at: string;
  updated_at: string;
};

type JobRole = "hr" | "developer" | "manager" | "finance";
type PlatformRole = "super_admin" | "admin" | "trainer" | "manager" | "learner";

type Competence = {
  id: string;
  code: string;                // unique global
  label_fr: string;
  label_en: string;
  created_at: string;
};

type Stamp = {
  id: string;
  learner_id: string;
  competence_id: string;
  state: "green" | "orange" | "red";
  validated_at: string;
  expires_at: string;
  module_version_hash: string;
  performance_score: number;
  mastery_score: number | null;
  attempts: number;
  created_at: string;
};

type EvaluationItem = {
  id: string;
  bank_id: string;
  format: "qcm_single" | "qcm_multi" | "true_false" | "open" | "video_branched";
  difficulty: 1|2|3|4|5;
  bloom_level: 1|2|3|4|5|6;
  concept_tags: string[];
  content: ItemContent;        // { question_fr, question_en?, choices?, correct_answer? }
  created_at: string;
};
// TBD-1.1 RESOLVED — Phase 1 formats: qcm_single/qcm_multi/true_false; content JSON; scoring = % correct

type ItemContent = {
  question_fr: string;
  question_en?: string;
  choices?: { label: string; is_correct: boolean }[];
  correct_answer?: string;
};

type Module = {
  id: string;
  version: string;
  version_hash: string;        // SHA-256(JSON.stringify(content_fr)), recalcule a la publication
  title_fr: string;
  status: "draft" | "published";
  competence_ids: string[];
  content_fr: ModuleContent | null; // JSON TipTap structure (SPEC-CONTENT.md)
  estimated_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
};

type LearningPath = {
  id: string;
  title_fr: string;
  target_role: "hr"|"developer"|"manager"|"finance"|"all";
  module_sequence: string[];   // IDs de modules ordonnes
  is_mandatory: boolean;
  created_at: string;
  updated_at: string;
};

type ComplianceTwin = {
  team_id: string;             // label d'equipe libre
  coverage_ratio: number;
  freshness_ratio: number;
  mastery_avg: number;
  exposure_level: 1|2|3|4|5;
  composite_score: number;
  alert_zone: "green"|"amber"|"red";
};

// Configuration globale de l'application (cle/valeur)
type AppConfig = {
  key: string;                 // unique, ex: "stamp_validity_months", "llm_provider"
  value: unknown;              // JSON
  updated_at: string;
};
```

## 7. CRUD par role

### super_admin
| Ressource         | C | R | U | D | Notes |
|-------------------|---|---|---|---|-------|
| users             | v | v | v | v(soft) | Tous roles y compris admin |
| competences       | v | v | v | v | |
| modules           | v | v | v | v | |
| learning_paths    | v | v | v | v | |
| evaluation_items  | v | v | v | v | Import CSV inclus |
| stamps            |   | v |   |   | Lecture seule |
| scenarios+nodes   | v | v | v | v | |
| app_config        | v | v | v |   | llm_provider, stamp_validity, etc. |
| domain_events     |   | v |   |   | Append-only, jamais modifie |

### admin
| Ressource         | C | R | U | D | Notes |
|-------------------|---|---|---|---|-------|
| users             | v | v | v | v(soft) | Sauf super_admin |
| competences       | v | v | v | v | |
| modules           | v | v | v | v | |
| learning_paths    | v | v | v | v | |
| evaluation_items  | v | v | v | v | Import CSV inclus |
| stamps            |   | v |   |   | Lecture seule |
| scenarios+nodes   | v | v | v | v | |
| app_config        |   | v | v |   | Peut modifier stamp_validity |
| domain_events     |   | v |   |   | Lecture seule |
| + droits learner  | v | v | v |   | |

### trainer
| Ressource         | C | R | U | D | Notes |
|-------------------|---|---|---|---|-------|
| modules           | v | v | v | v | Via /admin/modules (acces autorise) |
| evaluation_items  | v | v | v | v | Via /admin/assessment |
| learning_paths    |   | v |   |   | Via /admin/paths (lecture seule) |
| learners          |   | v |   |   | Liste + detail via /trainer/learners |
| stamps            |   | v |   |   | Resultats apprenants |
| + droits learner  | v | v | v |   | |

### manager
| Ressource         | C | R | U | D | Notes |
|-------------------|---|---|---|---|-------|
| learners          |   | v |   |   | Liste + detail via /manager/learners |
| stamps agreges    |   | v |   |   | Dashboard equipe |
| compliance_twin   |   | v |   |   | Dashboard equipe (Phase 4) |
| learning_paths    |   | v |   |   | Parcours assignes |
| + droits learner  | v | v | v |   | |

### learner
| Ressource         | C | R | U | D | Notes |
|-------------------|---|---|---|---|-------|
| progression (soi) | v | v | v |   | Event ProgressUpdated |
| stamps (soi)      |   | v |   |   | Ses propres stamps |
| evaluations       | v | v |   |   | Soumettre reponses |
| profil (soi)      |   | v | v |   | display_name, MFA |
| export RGPD (soi) |   | v |   |   | US-1.4 |

## 8. Events (DomainEvent<T> — immutables, PascalCase past-tense, jamais mutes/supprimes)

```typescript
type DomainEvent<T> = {
  event_id: string;
  event_name: string;
  event_version: string;
  occurred_at: string;
  produced_by: string;
  correlation_id?: string;
  payload: T;
};
```

Phase 1 : `ProgressUpdated` `CompetenceValidated` `ModulePublished`
Phase 2a : `CompetenceExpired` `CrisisScenarioCompleted` `StreakReached`
Phase 2b : `LITFAnswerSubmitted` `BuddyRoleAccepted` `TeamChallengeCompleted`
Phase 3 : `RemediationModuleGenerated` `RemediationModuleReused` `AICitationFailed`
Phase 4 : `RegulatoryUpdateDetected` `AuditBundleExported` `ComplianceTwinSnapshotted`

Note : TenantOnboarded et TenantOffboarded supprimes (plus de multi-tenant).

## 9. Regles metier non-negociables
R-1.1 Stamp valide 12 mois (Green), 12-18 (Orange), >18 (Red). Configurable via app_config "stamp_validity_months".
R-1.2 Item appartient a 1 banque. Tirage aleatoire stratifie par difficulte.
R-1.3 Toute progression → `ProgressUpdated`. Toute validation → `CompetenceValidated`.
R-1.4 Acces scope par platform_role. RolesGuard sur tout endpoint.
R-1.5 Certificat = payload + SHA-256 du module + timestamp + signature.
R-2a.1 Score Maitrise ≠ Score Performance. Maitrise jamais en certificat conformite.
R-2a.3 Orange → suggestion remise a niveau. Rouge → reparcours requis → `CompetenceExpired`.
R-3.1 Aucune generation IA libre. Boutons d'action predefinis uniquement.
R-3.2 Toute reponse IA cite ses sources (document_id + page). Sinon rejetee.
R-4.3 Dossier preuve = payload + SHA-256 + version contenu + signature + ancrage immuable.
R-4.5 Mode cognitif adapte = strictement personnel, invisible Manager/Admin.

## 10. Contraintes codees en dur (modification = ADR)
- Tout endpoint protege par RolesGuard
- Toute ecriture certifiable → hash + event + log immuable
- Module publie → version_hash recalcule + event ModulePublished
- Pas de generation IA hors RAG cite
- Events PascalCase past-tense, immuables, jamais supprimes
- Score Maitrise jamais en certificat conformite
- WCAG AA = CI gate (axe-core). i18n obligatoire, zero hardcoded string.
- P95 < 300ms API. Lighthouse >= 85 routes critiques.

## 11. Phases et user stories

### Phase 1 — MVP Fondations (0-3 mois)
US-1.1 Auth login email/password LIVRE — MFA TOTP validation code = Phase 1 restant
US-1.2 Consommer module, progression sauvegardee — LIVRE
US-1.3 Evaluation → Stamp v1 — LIVRE
US-1.4 Export RGPD JSON — LIVRE
US-1.5 Admin : creer parcours, assigner job_role cible — LIVRE
US-1.6 Admin : import banque items CSV — LIVRE
US-1.7 Isolation par roles totale — LIVRE (guards frontend + RolesGuard backend sur tous endpoints)
Bug resolu (2026-05-08) : mfa_verified=false bloquait tous les appels API pour comptes sans MFA. Fix : mfa_verified = !mfa_enabled.
Criteres : Lighthouse>=85, axe-core AA, preuve verifiable hors plateforme, E2E complet

### Phase 2a — Simulateur & Engagement (3-5 mois)
US-2a.1 Scenario solo arbre de decision | US-2a.2 Video interactive branchee
US-2a.3 Passport avec Streak | US-2a.4 Export Passport partageable
US-2a.5 Resultats agreges anonymises Manager | US-2a.6 Support debrief auto-genere

### Phase 2b — Social & Flow of Work (5-7 mois)
US-2b.1 Question 30s/jour extension Chrome | US-2b.2 Reponse Slack/Teams → Passport
US-2b.3 Buddy referent informel | US-2b.4 Defi inter-equipes | US-2b.5 Notifications contextuelles

### Phase 3 — IA & Remediation (7-10 mois)
US-3.1 "Quel chapitre revoir?" sourcee | US-3.2 "Expliquer ce concept" RAG only
US-3.3 Micro-module remediation | US-3.4 "Cas pratique secteur" | US-3.5 Dashboard auteur contenu

### Phase 4 — Gouvernance & Conformite Max (10-14 mois)
US-4.1 Jumeau Conformite PDF | US-4.2 Correlation Risque x Maitrise
US-4.3 Dossier preuve ancrage crypto | US-4.4 Blind Spot Report
US-4.5 Mode cognitif adapte

## 12. TBD bloquants
~~TBD-1.1~~ RESOLVED — formats Phase 1 : qcm_single/qcm_multi/true_false ; content JSON ; scoring = % correct
~~TBD-1.2~~ RESOLVED — Peremption via app_config "stamp_validity_months" (default 12). Orange=valeur*1.5.
~~TBD-1.3~~ RESOLVED — Transport EDA Phase 1 = PG append-only (domain_events table). Operationnel.
~~TBD-2a.1~~ RESOLVED — Mastery = best(performance_score) sur les 3 dernieres tentatives (mastery_window dans app_config, default 3). Jamais en certificat conformite (R-2a.1).
TBD-3.1 Provider LLM → bloque Phase 3
TBD-4.1 Formule Jumeau Conformite → bloque Phase 4
~~TBD-TENANT~~ RESOLVED — Application mono-organisation Holenek. Multi-tenant supprime. Isolation = roles (platform_role).
