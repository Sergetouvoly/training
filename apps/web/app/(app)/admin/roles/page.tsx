// Refs: SPEC.md §5, §7 — gestion des rôles RBAC
import { redirect } from "next/navigation";
import Link from "next/link";
import { getApiClient, getPermissions } from "../../../../lib/api";
import { can } from "../../../../lib/permissions";
import { DeleteButton } from "../DeleteButton";
import type { RoleDto } from "@elearning/api-client";

const LOCK_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

export default async function AdminRolesPage() {
  const permissions = await getPermissions();
  if (!can(permissions, "view.admin_roles")) redirect("/dashboard");

  const canCreate = can(permissions, "role.create");
  const canDelete = can(permissions, "role.delete");
  const canEdit   = can(permissions, "role.update_permissions");

  const api = await getApiClient();
  const roles: RoleDto[] = await api.role.listAll().catch(() => []);

  const systemCount = roles.filter((r) => r.is_system).length;

  async function createRole(formData: FormData) {
    "use server";
    const api = await getApiClient();
    await api.role.create({
      code: formData.get("code") as string,
      label_fr: formData.get("label_fr") as string,
      label_en: formData.get("label_en") as string,
    });
    redirect("/admin/roles");
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-ink-soft" aria-label="Fil d'Ariane">
          <Link href="/admin" className="hover:text-primary transition-colors">Administration</Link>
          <span aria-hidden="true">›</span>
          <span className="text-ink">Rôles</span>
        </nav>
        <h1 className="text-2xl font-extrabold text-primary-deep">Rôles</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {roles.length} rôle{roles.length > 1 ? "s" : ""} · {systemCount} système{systemCount > 1 ? "s" : ""}
        </p>
      </div>

      {/* Formulaire de création — super_admin uniquement */}
      {canCreate && (
        <form action={createRole} className="rounded-2xl border border-surface-warm bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-primary-deep">Créer un rôle personnalisé</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="role-code" className="mb-1.5 block text-xs font-medium text-ink-soft uppercase tracking-wide">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                id="role-code"
                name="code"
                type="text"
                required
                placeholder="role_rh_viewer"
                className="w-full rounded-xl border border-surface-warm px-3.5 py-2 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="role-label-fr" className="mb-1.5 block text-xs font-medium text-ink-soft uppercase tracking-wide">
                Libellé (FR) <span className="text-red-500">*</span>
              </label>
              <input
                id="role-label-fr"
                name="label_fr"
                type="text"
                required
                placeholder="Lecteur RH"
                className="w-full rounded-xl border border-surface-warm px-3.5 py-2 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="role-label-en" className="mb-1.5 block text-xs font-medium text-ink-soft uppercase tracking-wide">
                Libellé (EN) <span className="text-red-500">*</span>
              </label>
              <input
                id="role-label-en"
                name="label_en"
                type="text"
                required
                placeholder="HR Viewer"
                className="w-full rounded-xl border border-surface-warm px-3.5 py-2 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-deep transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Créer
          </button>
        </form>
      )}

      {/* Table des rôles */}
      <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-warm bg-surface">
              <th className="px-5 py-3.5 text-left font-semibold text-ink-soft">Code</th>
              <th className="px-5 py-3.5 text-left font-semibold text-ink-soft">Libellé FR</th>
              <th className="px-5 py-3.5 text-left font-semibold text-ink-soft hidden md:table-cell">Libellé EN</th>
              <th className="px-5 py-3.5 text-left font-semibold text-ink-soft hidden lg:table-cell">Créé le</th>
              <th className="px-5 py-3.5 text-right font-semibold text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-b border-surface-warm last:border-0 hover:bg-surface/40 transition-colors">
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-ink">
                    {role.is_system && (
                      <span className="text-ink-soft/50" title="Rôle système — non supprimable">
                        {LOCK_ICON}
                      </span>
                    )}
                    {role.code}
                  </span>
                </td>
                <td className="px-5 py-4 font-medium text-ink">{role.label_fr}</td>
                <td className="px-5 py-4 text-ink-soft hidden md:table-cell">{role.label_en}</td>
                <td className="px-5 py-4 text-xs text-ink-soft hidden lg:table-cell">
                  {new Date(role.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    {canEdit && (
                      <Link
                        href={`/admin/roles/${role.id}`}
                        className="rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface hover:border-primary/30 transition-colors"
                      >
                        Permissions
                      </Link>
                    )}
                    {canDelete && !role.is_system && (
                      <DeleteButton
                        deleteUrl={`/api/roles/${role.id}`}
                        redirectTo="/admin/roles"
                        confirmMessage={`Supprimer le rôle « ${role.label_fr} » ?`}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
