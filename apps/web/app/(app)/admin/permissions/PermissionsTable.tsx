"use client";
// Refs: SPEC.md §5 — catalogue des permissions : stats inline, rôles, grants
import { useState, useMemo } from "react";
import Link from "next/link";
import type { PermissionDto } from "@elearning/api-client";

const RESOURCE_LABELS: Record<string, string> = {
  user: "Utilisateurs", learner: "Apprenants", competence: "Compétences",
  module: "Modules", learning_path: "Parcours", evaluation_item: "Questions",
  assignment: "Assignation de formations",
  stamp: "Stamps", mastery: "Maîtrise", scenario: "Scénarios",
  challenge: "Challenges", analytics: "Analytiques", app_config: "Configuration",
  ai: "Intelligence artificielle", audit: "Audit", certificate: "Certificats",
  notification: "Notifications", scheduler: "Planificateur",
  role: "Rôles", trash: "Corbeille", view: "Vues",
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  role_super_admin: { bg: "bg-red-100",    text: "text-red-700" },
  role_admin:       { bg: "bg-primary/10", text: "text-primary" },
  role_trainer:     { bg: "bg-blue-50",    text: "text-blue-700" },
  role_manager:     { bg: "bg-amber-50",   text: "text-amber-700" },
  role_learner:     { bg: "bg-surface",    text: "text-ink-soft" },
};

type RolePermissions = { roleCode: string; roleLabel: string; permCodes: string[] };
type GrantEntry = { type: string; user: { id: string; display_name: string; email: string; app_role: string } };
type Grants = Record<string, { permission_code: string; grants: GrantEntry[] }>;

interface Props {
  readonly permissions: PermissionDto[];
  readonly rolePermissions: RolePermissions[];
  readonly grants: Grants;
  readonly canManagePerms: boolean;
}

type ViewFilter = "all" | "ungrouped" | "with-grants";

export function PermissionsTable({ permissions, rolePermissions, grants, canManagePerms }: Props) {
  const [search, setSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");

  // Stats globales
  const globalStats = useMemo(() => {
    const totalGrants = Object.values(grants).reduce((s, g) => s + g.grants.filter(x => x.type === "grant").length, 0);
    const totalDenys  = Object.values(grants).reduce((s, g) => s + g.grants.filter(x => x.type === "deny").length, 0);
    const unassigned  = permissions.filter(p => !rolePermissions.some(r => r.permCodes.includes(p.code))).length;
    return { totalGrants, totalDenys, unassigned };
  }, [permissions, rolePermissions, grants]);

  const resources = useMemo(() =>
    ["all", ...Array.from(new Set(permissions.map(p => p.resource))).sort((a, b) => a.localeCompare(b))],
    [permissions]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return permissions.filter(p => {
      if (resourceFilter !== "all" && p.resource !== resourceFilter) return false;
      if (q && !p.code.toLowerCase().includes(q) && !p.verb.toLowerCase().includes(q) && !(RESOURCE_LABELS[p.resource] ?? p.resource).toLowerCase().includes(q)) return false;
      if (viewFilter === "ungrouped" && rolePermissions.some(r => r.permCodes.includes(p.code))) return false;
      if (viewFilter === "with-grants" && !grants[p.code]?.grants?.length) return false;
      return true;
    });
  }, [permissions, search, resourceFilter, viewFilter, rolePermissions, grants]);

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionDto[]>();
    for (const p of filtered) {
      const list = map.get(p.resource) ?? [];
      list.push(p);
      map.set(p.resource, list);
    }
    return map;
  }, [filtered]);

  const isFiltered = search || resourceFilter !== "all" || viewFilter !== "all";

  return (
    <div className="space-y-5">

      {/* Stats globales cliquables */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-surface-warm bg-white px-4 py-3">
          <p className="text-xs text-ink-soft">Permissions</p>
          <p className="text-2xl font-extrabold text-primary-deep">{permissions.length}</p>
          <p className="text-[10px] text-ink-soft">{resources.length - 1} ressources</p>
        </div>

        <div className="rounded-xl border border-surface-warm bg-white px-4 py-3">
          <p className="text-xs text-ink-soft">Rôles</p>
          <p className="text-2xl font-extrabold text-primary-deep">{rolePermissions.length}</p>
          <p className="text-[10px] text-ink-soft">mappages actifs</p>
        </div>

        <button
          type="button"
          onClick={() => setViewFilter(v => v === "ungrouped" ? "all" : "ungrouped")}
          className={`rounded-xl border px-4 py-3 text-left transition-all ${
            viewFilter === "ungrouped"
              ? "border-amber-300 bg-amber-50 ring-1 ring-amber-200"
              : "border-surface-warm bg-white hover:border-amber-200"
          }`}
        >
          <p className="text-xs text-ink-soft">Sans rôle assigné</p>
          <p className={`text-2xl font-extrabold ${globalStats.unassigned > 0 ? "text-amber-600" : "text-ink-soft"}`}>
            {globalStats.unassigned}
          </p>
          <p className="text-[10px] text-ink-soft">cliquer pour filtrer</p>
        </button>

        {canManagePerms ? (
          <button
            type="button"
            onClick={() => setViewFilter(v => v === "with-grants" ? "all" : "with-grants")}
            className={`rounded-xl border px-4 py-3 text-left transition-all ${
              viewFilter === "with-grants"
                ? "border-green-300 bg-green-50 ring-1 ring-green-200"
                : "border-surface-warm bg-white hover:border-green-200"
            }`}
          >
            <p className="text-xs text-ink-soft">Grants directs</p>
            <p className={`text-2xl font-extrabold ${globalStats.totalGrants > 0 ? "text-green-600" : "text-ink-soft"}`}>
              {globalStats.totalGrants}
            </p>
            <p className="text-[10px] text-ink-soft">{globalStats.totalDenys} deny · cliquer pour filtrer</p>
          </button>
        ) : (
          <div className="rounded-xl border border-surface-warm bg-white px-4 py-3">
            <p className="text-xs text-ink-soft">Résultats filtrés</p>
            <p className="text-2xl font-extrabold text-primary-deep">{filtered.length}</p>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par code, verbe ou ressource…"
            className="w-full rounded-xl border border-surface-warm bg-white py-2.5 pl-9 pr-4 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <select
          value={resourceFilter}
          onChange={e => setResourceFilter(e.target.value)}
          className="rounded-xl border border-surface-warm bg-white px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="Filtrer par ressource"
        >
          {resources.map(r => (
            <option key={r} value={r}>
              {r === "all" ? "Toutes les ressources" : (RESOURCE_LABELS[r] ?? r)}
            </option>
          ))}
        </select>

        {isFiltered && (
          <button
            type="button"
            onClick={() => { setSearch(""); setResourceFilter("all"); setViewFilter("all"); }}
            className="rounded-xl border border-surface-warm px-3 py-2.5 text-xs font-medium text-ink-soft hover:bg-surface transition-colors"
          >
            Réinitialiser
          </button>
        )}

        <span className="text-xs text-ink-soft">
          {filtered.length} permission{filtered.length > 1 ? "s" : ""}
          {isFiltered && ` sur ${permissions.length}`}
        </span>
      </div>

      {/* Corps */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-surface-warm bg-white py-16 text-center text-sm text-ink-soft">
          Aucune permission ne correspond.
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([resource, perms]) => {
            // Stats du groupe
            const rolesInGroup = rolePermissions.filter(r => perms.some(p => r.permCodes.includes(p.code)));
            const grantsInGroup = perms.reduce((n, p) => n + (grants[p.code]?.grants?.filter(g => g.type === "grant").length ?? 0), 0);
            const unassignedInGroup = perms.filter(p => !rolePermissions.some(r => r.permCodes.includes(p.code))).length;

            return (
              <div key={resource} className="overflow-hidden rounded-2xl border border-surface-warm bg-white">

                {/* En-tête groupe avec stats */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-warm bg-surface px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                      {RESOURCE_LABELS[resource] ?? resource}
                    </span>
                    <span className="rounded-full bg-surface-warm px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                      {perms.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    {/* Rôles qui ont au moins une perm du groupe */}
                    <span className="text-ink-soft">{rolesInGroup.length} rôle{rolesInGroup.length > 1 ? "s" : ""}</span>
                    {unassignedInGroup > 0 && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                        {unassignedInGroup} sans rôle
                      </span>
                    )}
                    {canManagePerms && grantsInGroup > 0 && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 font-semibold text-green-700">
                        {grantsInGroup} grant{grantsInGroup > 1 ? "s" : ""} direct{grantsInGroup > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Lignes de permissions */}
                <div className="divide-y divide-surface-warm">
                  {perms.map(p => {
                    const rolesWithPerm = rolePermissions.filter(r => r.permCodes.includes(p.code));
                    const permGrants = grants[p.code]?.grants ?? [];
                    const directGrants = permGrants.filter(g => g.type === "grant");
                    const directDenys  = permGrants.filter(g => g.type === "deny");
                    const hasNoRole = rolesWithPerm.length === 0;

                    return (
                      <div key={p.id} className={`grid grid-cols-1 gap-x-6 gap-y-2 px-5 py-3.5 transition-colors hover:bg-surface/40 md:grid-cols-[200px_1fr_auto] ${hasNoRole ? "bg-amber-50/30" : ""}`}>

                        {/* Code + verbe */}
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-ink">{p.code}</span>
                          {hasNoRole && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700" title="Aucun rôle ne possède cette permission">
                              ∅
                            </span>
                          )}
                        </div>

                        {/* Rôles */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {rolesWithPerm.length === 0 ? (
                            <span className="text-[11px] text-ink-soft/40 italic">aucun rôle assigné</span>
                          ) : rolesWithPerm.map(r => {
                            const c = ROLE_COLORS[r.roleCode] ?? { bg: "bg-surface", text: "text-ink-soft" };
                            return (
                              <span key={r.roleCode} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.text}`}>
                                {r.roleLabel}
                              </span>
                            );
                          })}
                        </div>

                        {/* Grants/denys directs */}
                        {canManagePerms && (
                          directGrants.length > 0 || directDenys.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {directGrants.map(g => (
                                <Link
                                  key={g.user.id}
                                  href={`/admin/users/${g.user.id}#permissions`}
                                  className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-green-200 hover:bg-green-100 transition-colors"
                                  title={`Grant : ${g.user.email}`}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
                                  {g.user.display_name}
                                </Link>
                              ))}
                              {directDenys.map(g => (
                                <Link
                                  key={g.user.id}
                                  href={`/admin/users/${g.user.id}#permissions`}
                                  className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100 transition-colors"
                                  title={`Deny : ${g.user.email}`}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                                  {g.user.display_name}
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-ink-soft/30">—</span>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
