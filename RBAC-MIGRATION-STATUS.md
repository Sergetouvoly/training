# RBAC Migration — État d'avancement

## Ce qui a été fait (session précédente)

### ✅ Schéma Prisma — `packages/db/prisma/schema.prisma`
- `PlatformRole` enum → renommé `AppRole` (mêmes 5 valeurs, catégorie métier uniquement)
- `User.platform_role` → renommé `User.app_role`
- 4 nouveaux modèles ajoutés : `Role`, `Permission`, `RolePermission`, `UserRole`

### ✅ Catalogue de permissions — `packages/domain/src/permissions.ts` (nouveau)
- ~45 permissions constantes `as const` : `user.read`, `module.publish`, `role.assign`, etc.
- Types exportés : `Permission`, `PERMISSIONS_SET`, `isPermission()`, `splitPermission()`, `SYSTEM_ROLE_CODES`

### ✅ Events RBAC — `packages/domain/src/events.ts`
- 5 nouveaux events ajoutés : `UserRoleGranted`, `UserRoleRevoked`, `RoleCreated`, `RoleDeleted`, `RolePermissionsChanged`

### ✅ Re-export — `packages/domain/src/index.ts`
- `export * from "./permissions.js"` ajouté

### ✅ API-client types — `packages/api-client/src/types.ts`
- `AppRole` ajouté (union type)
- `PlatformRole` gardé comme alias temporaire (mode pont frontend)
- `Permission = string` ajouté (placeholder côté api-client)
- `UserDto`, `CreateUserDto`, `UpdateUserDto` : `platform_role` → `app_role`

---

## Ce qui reste à faire

### 🔴 Backend — couche Auth

| Fichier | Action |
|---|---|
| `apps/api/src/auth/auth.types.ts` | Remplacer `PlatformRole`→`AppRole`, ajouter `permissions: ReadonlyArray<Permission>` dans `AuthUser` et `SessionPayload` |
| `apps/api/src/auth/permissions.decorator.ts` | **Créer** — `@RequirePermissions(...perms)` (remplace `@Roles`) |
| `apps/api/src/auth/permissions.guard.ts` | **Créer** — `PermissionsGuard` (remplace `RolesGuard`) |
| `apps/api/src/auth/auth.module.ts` | Swapper `RolesGuard` → `PermissionsGuard` |
| `apps/api/src/auth/auth.service.ts` | Charger les rôles+permissions au login, les embarquer dans le JWT |
| `apps/api/src/auth/jwt.middleware.ts` | Forwarder `payload.permissions` sur `request.user` |
| `apps/api/src/auth/mfa.service.ts` | Remplacer `callerRole: PlatformRole` par `callerCanDisableOthers: boolean` dans `DisableMfaParams` |

### 🔴 Backend — Controllers (tous les `@Roles` → `@RequirePermissions`)

| Controller | Endpoints à migrer |
|---|---|
| `user.controller.ts` | `:id/mfa/disable`, `GET/POST/PATCH/DELETE users`, `admin/learners` |
| `competence.controller.ts` | `POST`, `PATCH :id`, `DELETE :id` |
| `learning.controller.ts` | paths CRUD, modules POST/DELETE/publish/PATCH content |
| `assessment.controller.ts` | items CRUD + import-csv |
| `simulator.controller.ts` | mastery/check-expire, analytics/team, scenarios/video-node |
| `social.controller.ts` | challenges create/close |
| `ai.controller.ts` | documents/index |
| `app-config.controller.ts` | GET, PUT |
| `media.controller.ts` | upload/:moduleId |

### 🔴 Backend — RoleService

Créer `apps/api/src/role/role.service.ts` + `role.module.ts` :
- Seule porte d'entrée pour muter `roles`, `user_roles`, `role_permissions`
- Émet les DomainEvents RBAC

### 🔴 DB — Seed

Mettre à jour `packages/db/prisma/seed.ts` :
- Upsert les 5 rôles système (`role_super_admin`, `role_admin`, `role_trainer`, `role_manager`, `role_learner`)
- Upsert les ~45 permissions en base
- Créer les `RolePermission` selon la matrice ci-dessous
- Lier chaque user existant à son rôle via `UserRole`

#### Matrice permissions par rôle

| Permission | super_admin | admin | trainer | manager | learner |
|---|---|---|---|---|---|
| `user.read/create/update/delete/reset_password` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user.disable_mfa_other` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `learner.read/read_detail` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `competence.read` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `competence.create/update/delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `module.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `module.create/update/publish/upload_media` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `module.delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `learning_path.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `learning_path.create/update/delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `evaluation_item.*` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `stamp.read_any` / `mastery.check_expire` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `scenario.create_video_node` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `challenge.create/close` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `analytics.team_read` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `app_config.read` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `app_config.write` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `ai.index_document` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `audit.read` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `role.*` | ✅ | ❌ | ❌ | ❌ | ❌ |

### 🔴 DB — Migration SQL

Créer `packages/db/prisma/migrations/20260514_dynamic_rbac/migration.sql` :
```sql
-- 1. Renommer l'enum et la colonne
ALTER TYPE "PlatformRole" RENAME TO "AppRole";
ALTER TABLE "users" RENAME COLUMN "platform_role" TO "app_role";

-- 2. Créer les tables roles/permissions/role_permissions/user_roles
-- (générées par Prisma generate + migrate)

-- 3. Backfill : relier chaque user existant à son rôle système
INSERT INTO user_roles (user_id, role_id, granted_at)
SELECT u.id, r.id, NOW()
FROM users u
JOIN roles r ON r.code = 'role_' || u.app_role::text
ON CONFLICT DO NOTHING;
```

### 🟡 Fichiers à supprimer (remplacés)

- `apps/api/src/auth/roles.decorator.ts`
- `apps/api/src/auth/roles.guard.ts`
- `apps/api/src/auth/roles.guard.test.ts`

### 🟡 Frontend — mode pont (minimal)

- `apps/web/auth.ts` : stocker `permissions` en session (à côté de `platform_role` existant)
- `apps/web/lib/permissions.ts` : **ne pas toucher** pour l'instant (table statique reste valide)

### 🔴 Tests à écrire

| Fichier | Contenu |
|---|---|
| `apps/api/src/auth/permissions.guard.test.ts` | Guard unit tests (allow/deny/public/anonymous) |
| `apps/api/src/auth/auth.integration.test.ts` | Réécrire les tests role-based avec `@RequirePermissions` |
| `packages/db/prisma/seed.test.ts` | Gate : vérifier que chaque user seed a exactement les permissions attendues |
| `apps/api/src/auth/auth.service.test.ts` | Login retourne `permissions` dans le JWT |

---

## Mapping `@Roles` → `@RequirePermissions` (référence rapide)

```
@Roles("super_admin")                           → @RequirePermissions("user.disable_mfa_other")
@Roles("super_admin", "admin")                  → @RequirePermissions("user.read")  // ou create/update/delete selon l'endpoint
@Roles("super_admin", "admin", "trainer")       → @RequirePermissions("module.create")  // ou update/publish
@Roles("super_admin", "admin", "trainer", "manager") → @RequirePermissions("learner.read")
@Roles("admin", "manager")                      → @RequirePermissions("analytics.team_read")
@Roles("super_admin")  [app-config write]       → @RequirePermissions("app_config.write")
@Roles("super_admin", "admin")  [app-config read] → @RequirePermissions("app_config.read")
```

---

## Vérification finale

1. `pnpm --filter @elearning/db prisma migrate dev --name dynamic_rbac`
2. `pnpm --filter @elearning/db db:seed`
3. `pnpm --filter @elearning/api test`
4. Login avec chaque user seed → décoder JWT → vérifier `permissions`
5. Tests de régression manuels : trainer → `POST /learning/modules` ✅, `DELETE /users/:id` ❌ (403)
6. Frontend : comportement inchangé (table statique `permissions.ts` toujours valide)
