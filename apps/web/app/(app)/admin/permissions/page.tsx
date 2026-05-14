// Refs: SPEC.md §5 — catalogue des permissions RBAC
import { redirect } from "next/navigation";
import Link from "next/link";
import { getApiClient, getPermissions } from "../../../../lib/api";
import { can } from "../../../../lib/permissions";
import { PermissionsTable } from "./PermissionsTable";
import type { PermissionDto, RoleDto } from "@elearning/api-client";

export default async function AdminPermissionsPage() {
  const permissions = await getPermissions();
  if (!can(permissions, "role.read")) redirect("/dashboard");

  const canManagePerms = can(permissions, "user.manage_permissions");
  const api = await getApiClient();

  const [allPermissions, allRoles, grants] = await Promise.all([
    api.permission.listAll().catch(() => [] as PermissionDto[]),
    api.role.listAll().catch(() => [] as RoleDto[]),
    canManagePerms ? api.permission.listAllGrants().catch(() => ({})) : Promise.resolve({}),
  ]);

  // Charger les permission_codes de chaque rôle en parallèle
  const rolePermissions = await Promise.all(
    allRoles.map(async (role) => {
      const detail = await api.role.getOne(role.id).catch(() => null);
      return {
        roleCode: role.code,
        roleLabel: role.label_fr,
        permCodes: detail?.permission_codes ?? [],
      };
    })
  );

  return (
    <div className="space-y-8">
      <div>
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-ink-soft" aria-label="Fil d'Ariane">
          <Link href="/admin" className="hover:text-primary transition-colors">Administration</Link>
          <span aria-hidden="true">›</span>
          <span className="text-ink">Permissions</span>
        </nav>
        <h1 className="text-2xl font-extrabold text-primary-deep">Permissions</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {allPermissions.length} permissions · {new Set(allPermissions.map(p => p.resource)).size} ressources
        </p>
      </div>

      <PermissionsTable
        permissions={allPermissions}
        rolePermissions={rolePermissions}
        grants={grants}
        canManagePerms={canManagePerms}
      />
    </div>
  );
}
