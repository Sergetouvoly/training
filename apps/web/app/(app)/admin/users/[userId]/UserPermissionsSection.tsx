"use client";
// Refs: SPEC.md §5 — permissions directes avec recherche, toggles et résumé
import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PERMISSIONS, splitPermission, type Permission } from "@elearning/domain";
import type { UserPermissionDto } from "@elearning/api-client";

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

// Permissions view.* gérées dans UserViewsSection — on les exclut ici
const ACTION_PERMISSIONS = PERMISSIONS.filter(p => !p.startsWith("view."));

const PERMISSION_GROUPS = ACTION_PERMISSIONS.reduce<{ resource: string; codes: Permission[] }[]>((acc, p) => {
  const { resource } = splitPermission(p);
  const group = acc.find(g => g.resource === resource);
  if (group) group.codes.push(p);
  else acc.push({ resource, codes: [p] });
  return acc;
}, []);

type DirectType = "grant" | "deny";
type EffectiveState = "grant-direct" | "deny-direct" | "from-role" | "absent";
type ViewMode = "all" | "active" | "overrides";

function getEffective(direct: DirectType | undefined, fromRole: boolean): EffectiveState {
  if (direct === "grant") return "grant-direct";
  if (direct === "deny")  return "deny-direct";
  if (fromRole)           return "from-role";
  return "absent";
}

const STATE_CARD: Record<EffectiveState, string> = {
  "grant-direct": "border-green-200 bg-green-50",
  "deny-direct":  "border-red-200 bg-red-50",
  "from-role":    "border-surface-warm bg-surface",
  "absent":       "border-surface-warm bg-white",
};

const STATE_BADGE: Record<EffectiveState, { label: string; cls: string }> = {
  "grant-direct": { label: "accordé",      cls: "text-green-700 font-semibold" },
  "deny-direct":  { label: "refusé",       cls: "text-red-700 font-semibold" },
  "from-role":    { label: "via rôle",     cls: "text-muted" },
  "absent":       { label: "non attribuée", cls: "text-ink-soft/40" },
};

interface Props {
  readonly userId: string;
  readonly userPermissions: UserPermissionDto[];
  readonly rolePermissionCodes: string[];
  readonly canManage: boolean;
}

export function UserPermissionsSection({ userId, userPermissions, rolePermissionCodes, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [directs, setDirects] = useState<Map<string, DirectType>>(() => {
    const m = new Map<string, DirectType>();
    for (const up of userPermissions) {
      if (!up.permission.code.startsWith("view.")) m.set(up.permission.code, up.type);
    }
    return m;
  });
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  // Stats
  const stats = useMemo(() => {
    let active = 0, grantCount = 0, denyCount = 0;
    for (const code of ACTION_PERMISSIONS) {
      const direct = directs.get(code);
      const fromRole = rolePermissionCodes.includes(code);
      const eff = getEffective(direct, fromRole);
      if (eff === "grant-direct" || eff === "from-role") active++;
      if (eff === "grant-direct") grantCount++;
      if (eff === "deny-direct") denyCount++;
    }
    return { active, grantCount, denyCount };
  }, [directs, rolePermissionCodes]);

  // Filtrage
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PERMISSION_GROUPS.map(({ resource, codes }) => {
      const visible = codes.filter(code => {
        if (q && !code.toLowerCase().includes(q) && !resource.toLowerCase().includes(q)) return false;
        const direct = directs.get(code);
        const fromRole = rolePermissionCodes.includes(code);
        const eff = getEffective(direct, fromRole);
        if (viewMode === "active" && eff !== "grant-direct" && eff !== "from-role") return false;
        if (viewMode === "overrides" && eff !== "grant-direct" && eff !== "deny-direct") return false;
        return true;
      });
      return { resource, codes: visible };
    }).filter(g => g.codes.length > 0);
  }, [search, viewMode, directs, rolePermissionCodes]);

  async function applyDirect(code: string, type: DirectType | null) {
    if (!canManage) return;
    setLoadingCode(code);
    setError(null);
    try {
      if (type === null) {
        const res = await fetch(`/api/users/${userId}/permissions/${encodeURIComponent(code)}`, { method: "DELETE" });
        if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).error ?? "Erreur");
        setDirects(prev => { const next = new Map(prev); next.delete(code); return next; });
      } else {
        const res = await fetch(`/api/users/${userId}/permissions/${encodeURIComponent(code)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erreur");
        setDirects(prev => new Map(prev).set(code, type));
      }
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "Impossible de joindre le serveur.");
    } finally {
      setLoadingCode(null);
    }
  }

  return (
    <div id="permissions" className="mt-8 space-y-5 scroll-mt-6">

      {/* En-tête */}
      <div>
        <h2 className="text-lg font-bold text-primary-deep">Permissions directes</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Overrides individuels — s'appliquent uniquement à cet utilisateur, indépendamment de son rôle.
        </p>
      </div>

      {/* Résumé stats */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setViewMode(viewMode === "active" ? "all" : "active")}
          className={`rounded-xl border px-4 py-3 text-left transition-all ${viewMode === "active" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-surface-warm bg-white hover:border-primary/30"}`}
        >
          <p className="text-xs text-ink-soft">Actives</p>
          <p className="text-2xl font-extrabold text-primary-deep">{stats.active}</p>
          <p className="text-[10px] text-ink-soft">rôle + grants</p>
        </button>
        <button
          type="button"
          onClick={() => setViewMode(viewMode === "overrides" ? "all" : "overrides")}
          className={`rounded-xl border px-4 py-3 text-left transition-all ${viewMode === "overrides" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-surface-warm bg-white hover:border-primary/30"}`}
        >
          <p className="text-xs text-ink-soft">Grants directs</p>
          <p className={`text-2xl font-extrabold ${stats.grantCount > 0 ? "text-green-600" : "text-ink-soft"}`}>{stats.grantCount}</p>
          <p className="text-[10px] text-ink-soft">cliquer pour filtrer</p>
        </button>
        <div className="rounded-xl border border-surface-warm bg-white px-4 py-3">
          <p className="text-xs text-ink-soft">Denys directs</p>
          <p className={`text-2xl font-extrabold ${stats.denyCount > 0 ? "text-red-600" : "text-ink-soft"}`}>{stats.denyCount}</p>
          <p className="text-[10px] text-ink-soft">overrides de refus</p>
        </div>
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
            onChange={e => { setSearch(e.target.value); }}
            placeholder="Rechercher une permission…"
            className="w-full rounded-xl border border-surface-warm bg-white py-2 pl-9 pr-4 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Toggle mode vue */}
        <div className="flex rounded-xl border border-surface-warm bg-surface p-1 gap-1">
          {([
            { key: "all", label: "Toutes" },
            { key: "active", label: "Actives" },
            { key: "overrides", label: "Overrides" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setViewMode(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === key ? "bg-white text-primary shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="text-xs text-ink-soft">
          {filteredGroups.reduce((n, g) => n + g.codes.length, 0)} permissions
        </span>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-[11px]">
        {(["grant-direct", "deny-direct", "from-role", "absent"] as EffectiveState[]).map(s => (
          <span key={s} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${STATE_CARD[s]}`}>
            <span className="font-mono font-medium text-ink">verb</span>
            <span className={STATE_BADGE[s].cls}>{STATE_BADGE[s].label}</span>
          </span>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      {/* Grille par ressource */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-surface-warm bg-white py-12 text-center text-sm text-ink-soft">
          Aucune permission ne correspond.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(({ resource, codes }) => {
            const groupCounts = codes.reduce(
              (acc, code) => {
                const s = getEffective(directs.get(code), rolePermissionCodes.includes(code));
                acc[s]++;
                return acc;
              },
              { "grant-direct": 0, "deny-direct": 0, "from-role": 0, "absent": 0 } as Record<EffectiveState, number>,
            );

            return (
              <div key={resource} className="overflow-hidden rounded-2xl border border-surface-warm bg-white">
                {/* En-tête groupe */}
                <div className="flex items-center justify-between border-b border-surface-warm bg-surface px-5 py-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                    {RESOURCE_LABELS[resource] ?? resource}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px]">
                    {groupCounts["grant-direct"] > 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700">
                        +{groupCounts["grant-direct"]} accordé{groupCounts["grant-direct"] > 1 ? "s" : ""}
                      </span>
                    )}
                    {groupCounts["deny-direct"] > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                        −{groupCounts["deny-direct"]} refusé{groupCounts["deny-direct"] > 1 ? "s" : ""}
                      </span>
                    )}
                    {groupCounts["from-role"] > 0 && (
                      <span className="rounded-full bg-surface-warm px-2 py-0.5 font-medium text-muted">
                        {groupCounts["from-role"]} rôle
                      </span>
                    )}
                  </div>
                </div>

                {/* Grille permissions */}
                <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {codes.map(code => {
                    const { verb } = splitPermission(code);
                    const direct = directs.get(code);
                    const fromRole = rolePermissionCodes.includes(code);
                    const effective = getEffective(direct, fromRole);
                    const badge = STATE_BADGE[effective];
                    const isLoading = loadingCode === code;

                    return (
                      <div
                        key={code}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-xs transition-colors ${STATE_CARD[effective]}`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-mono font-medium text-ink">{verb}</span>
                          <span className={`text-[10px] ${badge.cls}`}>{badge.label}</span>
                        </div>

                        {canManage && (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              disabled={isLoading || isPending}
                              onClick={() => applyDirect(code, direct === "grant" ? null : "grant")}
                              title={direct === "grant" ? "Retirer le grant" : "Accorder directement"}
                              aria-label={`${direct === "grant" ? "Retirer" : "Accorder"} ${code}`}
                              className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold transition-colors disabled:opacity-40 ${
                                direct === "grant"
                                  ? "bg-green-500 text-white hover:bg-green-600"
                                  : "bg-surface text-ink-soft hover:bg-green-100 hover:text-green-700"
                              }`}
                            >
                              {isLoading && direct !== "deny" ? "…" : "+"}
                            </button>
                            <button
                              type="button"
                              disabled={isLoading || isPending}
                              onClick={() => applyDirect(code, direct === "deny" ? null : "deny")}
                              title={direct === "deny" ? "Retirer le deny" : "Refuser directement"}
                              aria-label={`${direct === "deny" ? "Retirer le refus de" : "Refuser"} ${code}`}
                              className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold transition-colors disabled:opacity-40 ${
                                direct === "deny"
                                  ? "bg-red-500 text-white hover:bg-red-600"
                                  : "bg-surface text-ink-soft hover:bg-red-100 hover:text-red-700"
                              }`}
                            >
                              {isLoading && direct === "deny" ? "…" : "−"}
                            </button>
                          </div>
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
