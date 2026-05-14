// Refs: SPEC.md §7 — édition et désactivation d'un compte utilisateur (super_admin + admin uniquement)
import { redirect, notFound } from "next/navigation";
import { getApiClient, getPermissions } from "../../../../../lib/api";
import { can } from "../../../../../lib/permissions";
import { EditUserForm } from "./EditUserForm";
import { UserRolesSection } from "./UserRolesSection";
import { UserViewsSection } from "./UserViewsSection";
import { UserPermissionsSection } from "./UserPermissionsSection";
import type { RoleDto, UserRoleDto, UserPermissionDto } from "@elearning/api-client";

export default async function EditUserPage({ params }: { readonly params: Promise<{ userId: string }> }) {
  const [{ userId }, permissions] = await Promise.all([params, getPermissions()]);
  if (!can(permissions, "view.admin_users")) redirect("/dashboard");

  const canReadRoles    = can(permissions, "role.read");
  const canManagePerms  = can(permissions, "user.manage_permissions");
  const api = await getApiClient();

  const [user, allRoles, userRoles, userPermissions, config] = await Promise.all([
    api.admin.getUser(userId).catch(() => null),
    canReadRoles ? api.role.listAll().catch(() => [] as RoleDto[])         : Promise.resolve([] as RoleDto[]),
    canReadRoles ? api.role.getUserRoles(userId).catch(() => [] as UserRoleDto[]) : Promise.resolve([] as UserRoleDto[]),
    canManagePerms ? api.userPermission.list(userId).catch(() => [] as UserPermissionDto[]) : Promise.resolve([] as UserPermissionDto[]),
    api.config.list().catch(() => [] as { key: string; value: unknown }[]),
  ]);

  if (!user) notFound();

  const rolePermissionCodes = userRoles.flatMap((ur: UserRoleDto) => ur.role.permission_codes);

  // Contrôlé via app_config "views_section_interactive" — false par défaut (B1)
  const configEntry = config.find((c: { key: string; value: unknown }) => c.key === "views_section_interactive");
  const interactive = configEntry?.value === true || configEntry?.value === "true";

  return (
    <>
      <EditUserForm user={user} />

      {canReadRoles && allRoles.length > 0 && (
        <UserRolesSection
          userId={userId}
          allRoles={allRoles}
          userRoles={userRoles}
          canAssign={can(permissions, "role.assign")}
        />
      )}

      {canManagePerms && (
        <UserViewsSection
          userId={userId}
          userPermissions={userPermissions}
          rolePermissionCodes={rolePermissionCodes}
          canManage={canManagePerms}
          interactive={interactive}
        />
      )}

      {canManagePerms && (
        <UserPermissionsSection
          userId={userId}
          userPermissions={userPermissions}
          rolePermissionCodes={rolePermissionCodes}
          canManage={canManagePerms}
        />
      )}
    </>
  );
}
