# Phase 2 RBAC — Migration frontend vers permissions JWT

## Contexte

La phase 1 a basculé le backend du système de rôles statiques (`@Roles(...)`) vers un RBAC dynamique piloté par permissions (`@RequirePermissions(...)`). Le JWT contient désormais une liste `permissions: string[]` calculée au login depuis les tables `roles`/`permissions`/`user_roles` en BDD. Le frontend a déjà été câblé (mode pont) pour stocker `session.permissions` dans NextAuth, mais **continue d'utiliser le rôle** (`platformRole`) pour ses contrôles d'accès UI via la table statique `apps/web/lib/permissions.ts`.

Phase 2 = **éliminer toute logique d'autorisation basée sur le rôle côté frontend**. Les composants lisent désormais `session.permissions` et utilisent un `can(perms, "module.publish")` qui fait un simple `Array.includes`. La table statique disparaît. Le rôle (`platformRole`) ne sert plus qu'à l'affichage (badge "Admin/Trainer/Manager") et au routage du tableau de bord par défaut (`homeForRole`).

**Bénéfices attendus** :
- Source unique de vérité = la BDD (via le JWT). Un super_admin peut retirer/ajouter une permission à un rôle sans redéploiement frontend.
- Drift impossible : le type `Permission` importé de `@elearning/domain` fait échouer la compilation à toute occurrence orpheline.
- Nomenclature cohérente avec le backend (`path.*` → `learning_path.*`, `assessment.*` → `evaluation_item.*`, `competence.write` → `competence.create`, etc.).

**Refs** : `SPEC.md` §5, §7 — `CLAUDE.md` §6.1, §6.6 — `RBAC-MIGRATION-STATUS.md` (phase 1).

---

## 1. Réécriture de `apps/web/lib/permissions.ts`

Suppression totale de la table statique `PERMISSIONS: Record<Action, PlatformRole[]>` et du type local `Action`. Nouveau contenu :

```ts
import type { Permission } from "@elearning/domain";

export type { Permission };

export function can(
  permissions: ReadonlyArray<string> | undefined,
  permission: Permission,
): boolean {
  if (!permissions?.length) return false;
  return permissions.includes(permission);
}

export function canAny(
  permissions: ReadonlyArray<string> | undefined,
  required: ReadonlyArray<Permission>,
): boolean {
  if (!permissions?.length) return false;
  return required.some((p) => permissions.includes(p));
}

export function canAll(
  permissions: ReadonlyArray<string> | undefined,
  required: ReadonlyArray<Permission>,
): boolean {
  if (!permissions?.length) return false;
  return required.every((p) => permissions.includes(p));
}

const ADMIN_ENTRY_PERMS: Permission[] = [
  "user.read", "learner.read",
  "module.update", "learning_path.update",
  "competence.read", "evaluation_item.read",
  "app_config.read",
];
export const canAccessAdmin = (p?: readonly string[]) => canAny(p, ADMIN_ENTRY_PERMS);

const TRAINER_ENTRY_PERMS: Permission[] = ["module.update", "evaluation_item.create"];
export const canAccessTrainerSpace = (p?: readonly string[]) => canAny(p, TRAINER_ENTRY_PERMS);

const MANAGER_ENTRY_PERMS: Permission[] = ["analytics.team_read", "learner.read"];
export const canAccessManagerSpace = (p?: readonly string[]) => canAny(p, MANAGER_ENTRY_PERMS);
```

`Permission` ré-exporté depuis `@elearning/domain` — tout typo (`path.read`, `assessment.write`, etc.) déclenche une erreur TS au build.

---

## 2. Ajout de `@elearning/domain` aux deps web

`apps/web/package.json` :

```jsonc
"dependencies": {
  "@elearning/api-client": "workspace:*",
  "@elearning/domain": "workspace:*",   // ← nouveau
  ...
}
```

Suivi de `pnpm install`.

---

## 3. Ajout d'un helper `getPermissions()` dans `lib/api.ts`

Pour cohérence avec le pattern existant `getPlatformRole()` :

```ts
export async function getPermissions(): Promise<string[]> {
  const session = await auth();
  return Array.isArray(session?.permissions) ? session.permissions : [];
}
```

Les pages server lisent leurs permissions via cette fonction ; pas besoin d'aller chercher `auth()` à chaque fois.

---

## 4. Migration des callsites

### 4.1 Layouts (3 fichiers, server components)

| Fichier | Avant | Après |
|---|---|---|
| `app/(app)/admin/layout.tsx` | `if (!canAccessAdmin(platformRole)) redirect(...)` | `const perms = await getPermissions(); if (!canAccessAdmin(perms)) redirect(...)` |
| `app/(app)/trainer/layout.tsx` | `canAccessTrainerSpace(platformRole)` | `canAccessTrainerSpace(perms)` |
| `app/(app)/manager/layout.tsx` | `canAccessManagerSpace(platformRole)` | `canAccessManagerSpace(perms)` |

Le layout admin transmet aussi `perms` à `<AdminSidebar />` en prop (§4.3).

### 4.2 Pages racines des espaces (3 fichiers)

| Fichier | Avant | Après |
|---|---|---|
| `app/(app)/trainer/page.tsx` | `canAccessTrainerSpace(platformRole)` | `canAccessTrainerSpace(perms)` |
| `app/(app)/manager/page.tsx` | `canAccessManagerSpace(platformRole)` | `canAccessManagerSpace(perms)` |
| `app/(app)/admin/page.tsx` L27 | `const isSuperAdmin = platformRole === "super_admin"` | `const canReadConfig = can(perms, "app_config.read")` + rename de la variable et de son usage L35-37 |

### 4.3 `AdminSidebar.tsx` (client component)

Changements :
1. Le composant reçoit une prop supplémentaire `permissions: readonly string[]`.
2. Import `can` et `type Permission` depuis la nouvelle `lib/permissions`.
3. Le type `NavItem.action: Action` devient `NavItem.action: Permission`.
4. Renommage des `action` de chaque item nav selon la table de mapping (§5).
5. `can(platformRole, item.action)` L201 devient `can(permissions, item.action)`.
6. `platformRole === "trainer" ? "Contenu" : ...` L181 reste — c'est de l'affichage UI, pas de l'authz.

Le parent layout passe la prop :
```tsx
<AdminSidebar platformRole={platformRole} permissions={perms} />
```

### 4.4 Cleanup des `ADMIN_ROLES` / `CONTENT_ROLES` / `platformRole === ...` (15 fichiers)

Sources à éliminer (toute la dette `Set<Role>` ou comparaison directe) :

| Fichier | Avant | Après |
|---|---|---|
| `admin/competences/page.tsx` | `if (!ADMIN_ROLES.has(platformRole)) redirect(...)` | `if (!can(perms, "competence.read")) redirect(...)` |
| `admin/competences/[competenceId]/page.tsx` | idem | `if (!can(perms, "competence.update")) redirect(...)` |
| `admin/learners/page.tsx` | `ADMIN_ROLES.has(...)` | `can(perms, "learner.read")` |
| `admin/learners/[learnerId]/page.tsx` | idem | `can(perms, "learner.read_detail")` |
| `admin/users/page.tsx` L20 | `canCreate = platformRole === "super_admin" \|\| platformRole === "admin"` | `canCreate = can(perms, "user.create")` |
| `admin/users/new/page.tsx` | guard inline platformRole | `if (!can(perms, "user.create")) redirect(...)` |
| `admin/users/[userId]/page.tsx` | platformRole compare | `if (!can(perms, "user.update")) redirect(...)` |
| `admin/modules/page.tsx` L7,L12 | `CONTENT_ROLES.has(...)` + `canDelete = role==="admin"\|\|role==="super_admin"` | `can(perms, "module.read")` + `canDelete = can(perms, "module.delete")` |
| `admin/modules/new/page.tsx` | `CONTENT_ROLES.has(...)` | `can(perms, "module.create")` |
| `admin/modules/[moduleId]/page.tsx` | idem | `can(perms, "module.update")` |
| `admin/paths/page.tsx` L7,L20 | `CONTENT_ROLES.has(...)` + canDelete | `can(perms, "learning_path.read")` + `can(perms, "learning_path.delete")` |
| `admin/paths/new/page.tsx` | idem | `can(perms, "learning_path.create")` |
| `admin/paths/[pathId]/page.tsx` | idem | `can(perms, "learning_path.update")` |
| `admin/assessment/page.tsx` | `CONTENT_ROLES.has(...)` | `can(perms, "evaluation_item.read")` |
| `admin/config/page.tsx` | platformRole check pour write | `can(perms, "app_config.read")` pour la page, `can(perms, "app_config.write")` pour l'édition |

Chaque page récupère ses permissions via `getPermissions()` au lieu (ou en plus) de `getPlatformRole()`. Le `getPlatformRole()` peut rester pour l'affichage du badge.

---

## 5. Table de mapping legacy → nouveau

Renommage pur sur toutes les occurrences (Web `Action` → Backend `Permission`) :

| Web (à supprimer) | Backend (cible) |
|---|---|
| `path.read` | `learning_path.read` |
| `path.create` | `learning_path.create` |
| `path.update` | `learning_path.update` |
| `path.delete` | `learning_path.delete` |
| `assessment.read` | `evaluation_item.read` |
| `assessment.write` | `evaluation_item.create` (l'entrée sidebar conditionne l'accès à la page CRUD) |
| `competence.write` | `competence.create` (idem) |
| `config.read` | `app_config.read` |
| `config.write` | `app_config.write` |
| `user.disable_mfa` | `user.disable_mfa_other` |

---

## 6. Réécriture du test `apps/web/test/permissions.test.ts`

- Suppression du test "Snapshot complet de la matrice" — il testait la table statique qui n'existe plus.
- Suppression du fichier `apps/web/test/__snapshots__/permissions.test.ts.snap`.
- Remplacement des inputs : fixtures par rôle (permissions exactement attendues du seed).

```ts
import { describe, it, expect } from "vitest";
import { can, canAny, canAccessAdmin, canAccessTrainerSpace, canAccessManagerSpace } from "../lib/permissions";

const PERMS_SUPER_ADMIN = [
  "user.read", "user.create", "user.update", "user.delete", "user.reset_password", "user.disable_mfa_other",
  "learner.read", "learner.read_detail",
  "competence.read", "competence.create", "competence.update", "competence.delete",
  "module.read", "module.create", "module.update", "module.delete", "module.publish", "module.upload_media",
  "learning_path.read", "learning_path.create", "learning_path.update", "learning_path.delete",
  "evaluation_item.read", "evaluation_item.create", "evaluation_item.update", "evaluation_item.delete", "evaluation_item.import_csv",
  "stamp.read_any", "mastery.check_expire", "scenario.create_video_node",
  "challenge.create", "challenge.close", "analytics.team_read",
  "app_config.read", "app_config.write", "ai.index_document", "audit.read",
  "role.read", "role.create", "role.update", "role.delete", "role.assign", "role.update_permissions",
];

const PERMS_ADMIN = PERMS_SUPER_ADMIN.filter(p =>
  !["user.disable_mfa_other", "app_config.write", "role.create", "role.delete", "role.update_permissions"].includes(p)
);

const PERMS_TRAINER = [
  "module.read", "module.create", "module.update", "module.publish", "module.upload_media",
  "evaluation_item.read", "evaluation_item.create", "evaluation_item.update", "evaluation_item.delete", "evaluation_item.import_csv",
  "learner.read", "learner.read_detail", "competence.read", "learning_path.read",
];

const PERMS_MANAGER = [
  "learner.read", "learner.read_detail", "analytics.team_read",
  "challenge.create", "challenge.close", "scenario.create_video_node",
  "module.read", "learning_path.read", "competence.read",
];

const PERMS_LEARNER = ["module.read", "learning_path.read"];

describe("can()", () => {
  it("fail-closed sur permissions vides/absentes", () => {
    expect(can(undefined, "user.read")).toBe(false);
    expect(can([], "user.read")).toBe(false);
  });
  it("retourne true quand permission présente", () => {
    expect(can(PERMS_ADMIN, "user.read")).toBe(true);
  });
  it("retourne false quand permission absente", () => {
    expect(can(PERMS_TRAINER, "user.delete")).toBe(false);
  });
});

describe("canAccessAdmin/Trainer/Manager", () => {
  it("admin spaces accessibles aux 4 rôles non-learner", () => {
    expect(canAccessAdmin(PERMS_SUPER_ADMIN)).toBe(true);
    expect(canAccessAdmin(PERMS_ADMIN)).toBe(true);
    expect(canAccessAdmin(PERMS_TRAINER)).toBe(true);
    expect(canAccessAdmin(PERMS_MANAGER)).toBe(true);
    expect(canAccessAdmin(PERMS_LEARNER)).toBe(false);
  });
  it("trainer space : super_admin, admin, trainer", () => {
    expect(canAccessTrainerSpace(PERMS_SUPER_ADMIN)).toBe(true);
    expect(canAccessTrainerSpace(PERMS_ADMIN)).toBe(true);
    expect(canAccessTrainerSpace(PERMS_TRAINER)).toBe(true);
    expect(canAccessTrainerSpace(PERMS_MANAGER)).toBe(false);
    expect(canAccessTrainerSpace(PERMS_LEARNER)).toBe(false);
  });
  it("manager space : super_admin, admin, manager", () => {
    expect(canAccessManagerSpace(PERMS_SUPER_ADMIN)).toBe(true);
    expect(canAccessManagerSpace(PERMS_ADMIN)).toBe(true);
    expect(canAccessManagerSpace(PERMS_MANAGER)).toBe(true);
    expect(canAccessManagerSpace(PERMS_TRAINER)).toBe(false);
    expect(canAccessManagerSpace(PERMS_LEARNER)).toBe(false);
  });
});
```

---

## 7. Fichiers à créer / modifier / supprimer

**Modifier** :
- `apps/web/package.json` (ajout dep `@elearning/domain`)
- `apps/web/lib/permissions.ts` (réécriture complète)
- `apps/web/lib/api.ts` (ajout `getPermissions()`)
- `apps/web/app/(app)/admin/layout.tsx`
- `apps/web/app/(app)/admin/page.tsx`
- `apps/web/app/(app)/admin/AdminSidebar.tsx`
- `apps/web/app/(app)/trainer/layout.tsx`
- `apps/web/app/(app)/trainer/page.tsx`
- `apps/web/app/(app)/manager/layout.tsx`
- `apps/web/app/(app)/manager/page.tsx`
- `apps/web/app/(app)/admin/users/page.tsx`
- `apps/web/app/(app)/admin/users/new/page.tsx`
- `apps/web/app/(app)/admin/users/[userId]/page.tsx`
- `apps/web/app/(app)/admin/modules/page.tsx`
- `apps/web/app/(app)/admin/modules/new/page.tsx`
- `apps/web/app/(app)/admin/modules/[moduleId]/page.tsx`
- `apps/web/app/(app)/admin/paths/page.tsx`
- `apps/web/app/(app)/admin/paths/new/page.tsx`
- `apps/web/app/(app)/admin/paths/[pathId]/page.tsx`
- `apps/web/app/(app)/admin/competences/page.tsx`
- `apps/web/app/(app)/admin/competences/[competenceId]/page.tsx`
- `apps/web/app/(app)/admin/learners/page.tsx`
- `apps/web/app/(app)/admin/learners/[learnerId]/page.tsx`
- `apps/web/app/(app)/admin/assessment/page.tsx`
- `apps/web/app/(app)/admin/config/page.tsx`
- `apps/web/test/permissions.test.ts` (réécriture)

**Supprimer** :
- `apps/web/test/__snapshots__/permissions.test.ts.snap`

**Total** : ~25 fichiers modifiés, 1 supprimé.

---

## 8. Risques et arbitrages

| Risque | Décision | Mitigation |
|---|---|---|
| `manager` n'a pas `analytics.team_read` dans le seed actuel | Vérifier le seed (`packages/db/src/rbac-seed.ts`) | Ajouter si manquant ; sinon `canAccessManagerSpace` retourne false pour les managers. **Action obligatoire avant merge**. |
| Le seed actuel ne donne pas `evaluation_item.create` au trainer ? | Idem, vérifier | C'est la condition pour `canAccessTrainerSpace`. Vérifier sur env de dev avant merge. |
| Un user existant a un JWT actif avec une vieille structure (pré-phase1) | Le JWT pré-phase1 n'a pas de champ `permissions` → `session.permissions` sera `[]` → tout est refusé. | Mineur : forcer un re-login. Pas critique en interne. |
| Drift `Permission` web ↔ backend | Le type import depuis `@elearning/domain` casse `tsc` sur toute désync | Aucun. Pas de table à maintenir. |
| AdminSidebar reçoit `permissions: string[]` mais le composant typait `Action` | Renommer le type interne ; importer `Permission` | Couvert dans §4.3. |
| Quelqu'un ajoute une perm backend sans la propager UI | Pas de gate automatique entre nouvelle perm et utilisation UI | Acceptable : c'est le sens de la migration. L'UI ne doit pas dicter le catalogue. |

---

## 9. Vérification end-to-end

1. **Pré-check seed** (étape obligatoire avant tout) :
   ```bash
   pnpm --filter @elearning/db db:seed
   ```
   Puis login en CLI :
   ```bash
   curl.exe -s -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d "{\"email\":\"manager@holenek.fr\",\"password\":\"Manager1234!\"}" | jq '.permissions'
   ```
   Vérifier que `analytics.team_read` est présent. Sinon, mettre à jour `packages/db/src/rbac-seed.ts` avant de toucher au frontend.

2. **TypeScript** : `pnpm -F @elearning/web typecheck`
   - Toute occurrence orpheline (`path.read`, `assessment.write`, etc.) → erreur TS.
   - Toute prop `Action` orpheline dans AdminSidebar → erreur TS.

3. **Tests** : `pnpm -F @elearning/web test`
   - La nouvelle suite Vitest passe.
   - Le snapshot ancien est supprimé (sinon Vitest signale un orphan snapshot).

4. **Smoke test manuel** par rôle avec les seeds existants :

| User | URL testée | Comportement attendu |
|---|---|---|
| `super@holenek.fr` | `/admin` | Voit la section "Système → Configuration" + bloc Configuration sur la page |
| `super@holenek.fr` | `/admin/users` | Bouton "Créer un compte" visible |
| `admin@holenek.fr` | `/admin/config` | Page accessible en lecture, édition désactivée |
| `admin@holenek.fr` | `/admin/users/new` | Page accessible |
| `formateur@holenek.fr` | `/admin/modules` | Liste accessible, pas de bouton supprimer (manque `module.delete`) |
| `formateur@holenek.fr` | `/admin/users` | Redirigé vers `/dashboard` |
| `manager@holenek.fr` | `/manager` | Page accessible |
| `manager@holenek.fr` | `/trainer` | Redirigé vers `/dashboard` |
| `alice@holenek.fr` | `/admin` | Redirigé vers `/dashboard` |

5. **Diff sidebar avant/après** (admin/trainer/manager) : items affichés identiques.

6. **Lighthouse** : pas de routes touchées hors structure JSX ; delta attendu ~0.

7. Commit final : `feat(web): consume JWT permissions for UI authz, drop static role table\n\nRefs: SPEC.md §5, §7 — RBAC-PHASE2-PLAN.md`
