// Refs: SPEC.md §5, §7 — édition des permissions d'un rôle
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getApiClient, getPermissions } from "../../../../../lib/api";
import { can } from "../../../../../lib/permissions";
import { RolePermissionsForm } from "./RolePermissionsForm";

export default async function RoleDetailPage({
  params,
}: {
  readonly params: Promise<{ roleId: string }>;
}) {
  const [{ roleId }, permissions] = await Promise.all([params, getPermissions()]);
  if (!can(permissions, "view.admin_roles")) redirect("/dashboard");

  const api = await getApiClient();
  const role = await api.role.getOne(roleId).catch(() => null);
  if (!role) notFound();

  const canEdit = can(permissions, "role.update_permissions");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/roles"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-warm text-ink-soft hover:bg-surface hover:text-ink transition-colors"
          aria-label="Retour à la liste des rôles"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold text-primary-deep truncate">{role.label_fr}</h1>
          <p className="text-sm text-ink-soft">
            <span className="font-mono">{role.code}</span>
            {" · "}
            {role.permission_codes.length} permission{role.permission_codes.length > 1 ? "s" : ""}
          </p>
        </div>
        {role.is_system && (
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink-soft">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Rôle système
          </span>
        )}
      </div>

      {!canEdit && (
        <div className="rounded-xl border border-surface-warm bg-surface px-4 py-3 text-sm text-ink-soft">
          Lecture seule — vous n'avez pas la permission <span className="font-mono">role.update_permissions</span>.
        </div>
      )}

      <RolePermissionsForm role={role} canEdit={canEdit} />
    </div>
  );
}
