# CLAUDE.md

Behavioral guidelines for the AI coding agent on the **Next-Gen E-Learning Platform**.

## 0. Architecture (read first)

Monorepo Turborepo + pnpm. Mono-org Holenek — isolation par `platform_role`, pas de multi-tenant.

**Roles** : `super_admin | admin | trainer | manager | learner`
**Guards** : `RolesGuard` + `MfaGuard` sur tous les endpoints ; layout + page guards côté web.

| App / Package | Stack | Port |
|---|---|---|
| `apps/api` | NestJS 10, Prisma → PostgreSQL 16 (Docker) | 3001 |
| `apps/web` | Next.js 15 App Router, routing par rôle | 3000 |
| `packages/db` | Prisma schema + migrations + seed | — |
| `packages/api-client` | Types partagés (Block, InlineContent…) | — |
| `packages/domain` | Events domaine (immutables, PascalCase past-tense) | — |
| `packages/event-bus` | Bus d'événements interne | — |
| `packages/crypto` | SHA-256 audit hashes | — |
| `packages/i18n` | Clés i18n — aucune string hardcodée UI | — |
| `packages/ui` | Composants partagés | — |

**Commandes dev**
```
docker compose -f docker/docker-compose.yml up postgres -d
pnpm --filter @elearning/api run dev:watch
pnpm --filter @elearning/web run dev
```

**Phase actuelle : 2a** — MFA TOTP (speakeasy) + workflow brouillon→publié avec `version_hash` + event `ModulePublished`.

---

> **Trade-off:** these rules bias toward caution and provability over speed. For trivial cosmetic tasks, use judgment. For anything touching tenant data, audit logs, scoring, content versioning, or events — apply them strictly.

---

## 1. Spec is the oracle. Tests come before code.

The loop is **Spec → Test → Code → Verify**. Never inverted.

- If the spec is silent, ambiguous, or contradictory on the behavior you're about to implement, **stop and ask**. Do not invent a default.
- Before writing a feature, write the failing test that proves the spec clause.
- Every PR diff must trace back to a `SPEC.md` clause, an `ARCHITECTURE.md` decision, or a `ROADMAP.md` exit criterion. Cite it in the commit body using the format `Refs: SPEC.md §3.2.R2.1`.
- If you find a `TBD-x.y` marker on the path of your change, escalate. Do not pick a default silently.

---

## 2. Think before coding *(Karpathy)*

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

---

## 3. Simplicity first *(Karpathy + project)*

- Minimum code that satisfies the failing test. Nothing speculative.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you wrote 200 lines and it could be 50, rewrite.

**Project-specific:**

- Don't introduce a new infra component to solve a code problem. No Redis if a Postgres table works. No Kafka if Redis Streams works. Push complexity into infra only when the code path is provably insufficient.
- No premature multi-tenant cleverness. `tenant_id` discriminator is the default. Schema-per-tenant is opt-in, declared in an ADR.
- No premature event sourcing. Domain events are emitted on side-effecting writes, not on every read. Event store is an append-only log, not a CQRS read model — until an ADR says otherwise.

---

## 4. Surgical changes *(Karpathy)*

- Touch only what you must.
- Don't "improve" adjacent code, comments, or formatting.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove orphans **your** changes created. Leave pre-existing dead code alone.

The test: every changed line traces directly to the user's request or to a failing test you just wrote.

---

## 5. Goal-driven execution *(Karpathy)*

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass."
- "Fix the bug" → "Write a test reproducing it, then make it pass."
- "Refactor X" → "Tests pass before and after."

State a brief plan for any multi-step task:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") force constant clarification round-trips.

---

## 6. Project rails (non-negotiable)

These are not principles. These are rails. If you're about to violate one, **stop**.

### 6.1 Tenant isolation

Every query, cache key, event payload, vector collection, file path, and log line that touches user data must include or be scoped by `tenant_id`. Cross-tenant access is a **P0** bug.

**Test rule:** every new repository method ships with a paired test `it_does_not_leak_across_tenants`. No exception, no waiver.

### 6.2 Event-driven discipline

Domain events are immutable, append-only, and have a versioned schema. Once published:

- An event is never mutated.
- An event is never deleted.
- An event is never renamed.
- A breaking schema change is a new event version, never a silent migration.

Naming: `PascalCase` past-tense (`CompetenceValidated`, `CrisisScenarioCompleted`). Catalog lives in `DOMAIN.md` §4. Adding or modifying an event requires an ADR.

### 6.3 AI is bounded

The AI layer **recommends and retrieves**. It does not generate freely.

- All AI calls go through the RAG pipeline with tenant-scoped vector collections.
- All AI responses cite source documents (id + page).
- No free-text user prompt to the model — only predefined action buttons defined in `SPEC.md` §3.4.
- Token budgets per call and per user-day are enforced and tested.

### 6.4 Audit-readable by default

Every certification-relevant write produces:

1. An immutable log entry with SHA-256 of the payload.
2. A reference to the content version (hash) at time of certification.
3. A `CompetenceValidated` event.

If your change skips any of those three, the change is incomplete.

### 6.5 Accessibility & i18n

WCAG AA is a hard CI gate (axe-core). PRs failing axe do not merge.
All user-facing text is i18n-keyed; no hardcoded strings.

### 6.6 Spec language conventions

- Business / domain prose → French.
- Technical contracts (event names, payload schemas, API signatures, ADRs, test IDs, commit messages) → English.
- Mixing the two in a single sentence is fine and expected. Don't translate event names.

---

## 7. Pre-review checklist

Before requesting code review:

- [ ] Failing test existed before code; now passes.
- [ ] No multi-tenant leak (paired isolation test green).
- [ ] No new infra dependency without ADR.
- [ ] No event renamed or mutated without version bump.
- [ ] Spec clause cited in commit body (`Refs: SPEC.md §x.y`).
- [ ] axe-core green on touched UI routes.
- [ ] No `TBD-x.y` resolved silently.
- [ ] Lighthouse delta ≤ 5 points on touched routes.

---

## 8. Escalation cues

Stop and ask the human when:

- A spec clause and an architectural decision conflict.
- A `TBD-x.y` blocks the only reasonable implementation path.
- A test you wrote fails in a way that would require breaking an existing event.
- A request would require touching another tenant's data, even read-only.
- A request would require generating user-facing text from the LLM without a RAG citation.

---

**These rails are working if:** PR diffs are small, regressions are caught by tests written before the bug, no spec drift, and clarifying questions arrive before code rather than after.
