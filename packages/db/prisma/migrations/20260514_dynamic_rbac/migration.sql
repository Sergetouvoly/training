ALTER TYPE "PlatformRole" RENAME TO "AppRole";
ALTER TABLE "users" RENAME COLUMN "platform_role" TO "app_role";
ALTER INDEX IF EXISTS "users_platform_role_idx" RENAME TO "users_app_role_idx";

CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label_fr" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "verb" TEXT NOT NULL,
    "label_fr" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" TEXT,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");
CREATE INDEX "permissions_resource_idx" ON "permissions"("resource");
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "roles" ("id", "code", "label_fr", "label_en", "is_system", "updated_at")
VALUES
  (gen_random_uuid()::text, 'role_super_admin', 'Super administrateur', 'Super admin', true, NOW()),
  (gen_random_uuid()::text, 'role_admin', 'Administrateur', 'Admin', true, NOW()),
  (gen_random_uuid()::text, 'role_trainer', 'Formateur', 'Trainer', true, NOW()),
  (gen_random_uuid()::text, 'role_manager', 'Manager', 'Manager', true, NOW()),
  (gen_random_uuid()::text, 'role_learner', 'Apprenant', 'Learner', true, NOW())
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "user_roles" ("user_id", "role_id", "granted_at")
SELECT u.id, r.id, NOW()
FROM "users" u
JOIN "roles" r ON r.code = 'role_' || u.app_role::text
ON CONFLICT DO NOTHING;
