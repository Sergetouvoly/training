"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserPermissionDto } from "@elearning/api-client";
import type { Permission } from "@elearning/domain";

// ─── Catalogue des vues ───────────────────────────────────────────────────────

type ViewMeta = {
  code: Permission;
  label: string;
  description: string;
  group: "admin" | "espaces" | "apprenant";
  href: string;
};

const VIEW_CATALOGUE: ViewMeta[] = [
  // Espace admin
  { code: "view.admin",             label: "Admin",          description: "Accès à l'espace administration",          group: "admin",     href: "/admin" },
  { code: "view.admin_users",       label: "Comptes",        description: "Gestion des comptes utilisateurs",         group: "admin",     href: "/admin/users" },
  { code: "view.admin_learners",    label: "Apprenants",     description: "Suivi des apprenants",                     group: "admin",     href: "/admin/learners" },
  { code: "view.admin_modules",     label: "Modules",        description: "Création et édition des modules",          group: "admin",     href: "/admin/modules" },
  { code: "view.admin_paths",       label: "Parcours",       description: "Création et édition des parcours",         group: "admin",     href: "/admin/paths" },
  { code: "view.admin_competences", label: "Compétences",    description: "Gestion du référentiel de compétences",    group: "admin",     href: "/admin/competences" },
  { code: "view.admin_assessment",  label: "Questions",      description: "Banque de questions d'évaluation",         group: "admin",     href: "/admin/assessment" },
  { code: "view.admin_roles",       label: "Rôles",          description: "Gestion des rôles et permissions RBAC",    group: "admin",     href: "/admin/roles" },
  { code: "view.admin_trash",       label: "Corbeille",      description: "Restauration d'éléments supprimés",        group: "admin",     href: "/admin/trash" },
  { code: "view.admin_config",      label: "Configuration",  description: "Paramètres de la plateforme",              group: "admin",     href: "/admin/config" },
  // Espaces
  { code: "view.trainer_space",     label: "Espace formateur", description: "Espace dédié aux formateurs",           group: "espaces",   href: "/trainer" },
  { code: "view.manager_space",     label: "Espace manager",   description: "Espace dédié aux managers",             group: "espaces",   href: "/manager" },
  // Apprenant
  { code: "view.learner_dashboard",     label: "Tableau de bord",  description: "Tableau de bord apprenant",         group: "apprenant", href: "/dashboard" },
  { code: "view.learner_parcours",      label: "Mes parcours",     description: "Parcours de formation",             group: "apprenant", href: "/parcours" },
  { code: "view.learner_modules",       label: "Modules",          description: "Catalogue de modules",              group: "apprenant", href: "/module" },
  { code: "view.learner_eval",          label: "Évaluations",      description: "Évaluations et quiz",               group: "apprenant", href: "/eval" },
  { code: "view.learner_profil",        label: "Mon profil",       description: "Profil et compétences",             group: "apprenant", href: "/profil" },
  { code: "view.learner_notifications", label: "Notifications",    description: "Centre de notifications",           group: "apprenant", href: "/notifications" },
];

const GROUP_META: Record<string, { label: string; color: string; dotColor: string }> = {
  admin:     { label: "Espace admin",     color: "bg-primary/5 border-primary/15",    dotColor: "bg-primary" },
  espaces:   { label: "Espaces dédiés",   color: "bg-accent-soft border-primary/10",  dotColor: "bg-accent" },
  apprenant: { label: "Espace apprenant", color: "bg-surface border-surface-warm",    dotColor: "bg-muted" },
};

// ─── Types d'état effectif ────────────────────────────────────────────────────

type EffectiveState = "grant-direct" | "deny-direct" | "from-role" | "absent";

function getEffective(direct: "grant" | "deny" | undefined, fromRole: boolean): EffectiveState {
  if (direct === "grant") return "grant-direct";
  if (direct === "deny")  return "deny-direct";
  if (fromRole)           return "from-role";
  return "absent";
}

const STATE_STYLES: Record<EffectiveState, { card: string; dot: string; label: string; labelCls: string }> = {
  "grant-direct": { card: "border-green-200 bg-green-50",    dot: "bg-green-500",   label: "accordé",    labelCls: "text-green-700 font-semibold" },
  "deny-direct":  { card: "border-red-200 bg-red-50",        dot: "bg-red-500",     label: "refusé",     labelCls: "text-red-700 font-semibold" },
  "from-role":    { card: "border-surface-warm bg-surface",  dot: "bg-muted",       label: "via rôle",   labelCls: "text-muted font-medium" },
  "absent":       { card: "border-surface-warm bg-white",    dot: "bg-surface-warm", label: "inactif",   labelCls: "text-ink-soft/50" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  readonly userId: string;
  readonly userPermissions: UserPermissionDto[];
  readonly rolePermissionCodes: string[];
  readonly canManage: boolean;
  /** B1 = lecture seule | B2 = interactif (clic pour grant/deny) */
  readonly interactive: boolean;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function UserViewsSection({ userId, userPermissions, rolePermissionCodes, canManage, interactive }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [directs, setDirects] = useState<Map<string, "grant" | "deny">>(() => {
    const m = new Map<string, "grant" | "deny">();
    for (const up of userPermissions) {
      if (up.permission.code.startsWith("view.")) m.set(up.permission.code, up.type);
    }
    return m;
  });

  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyDirect(code: string, type: "grant" | "deny" | null) {
    if (!canManage || !interactive) return;
    setLoadingCode(code);
    setError(null);
    try {
      if (type === null) {
        const res = await fetch(`/api/users/${userId}/permissions/${encodeURIComponent(code)}`, { method: "DELETE" });
        if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).error ?? "Erreur");
        setDirects((prev) => { const next = new Map(prev); next.delete(code); return next; });
      } else {
        const res = await fetch(`/api/users/${userId}/permissions/${encodeURIComponent(code)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erreur");
        setDirects((prev) => new Map(prev).set(code, type));
      }
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? "Impossible de joindre le serveur.");
    } finally {
      setLoadingCode(null);
    }
  }

  function handleCardClick(code: string, effective: EffectiveState) {
    if (!interactive || !canManage) return;
    if (effective === "grant-direct") {
      applyDirect(code, null);
    } else if (effective === "absent") {
      applyDirect(code, "grant");
    } else if (effective === "from-role") {
      applyDirect(code, "deny");
    } else if (effective === "deny-direct") {
      applyDirect(code, null);
    }
  }

  const groups = (["admin", "espaces", "apprenant"] as const).map((g) => ({
    key: g,
    meta: GROUP_META[g]!,
    views: VIEW_CATALOGUE.filter((v) => v.group === g),
  }));

  // Stats globales
  const activeCount = VIEW_CATALOGUE.filter((v) => {
    const eff = getEffective(directs.get(v.code), rolePermissionCodes.includes(v.code));
    return eff === "grant-direct" || eff === "from-role";
  }).length;

  return (
    <div className="mt-8 space-y-5">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-primary-deep">Vues & Espaces accessibles</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Récapitulatif des vues auxquelles cet utilisateur a accès.{" "}
            <span className="font-semibold text-ink">{activeCount}</span> vue{activeCount > 1 ? "s" : ""} active{activeCount > 1 ? "s" : ""} sur {VIEW_CATALOGUE.length}.
          </p>
        </div>

        {/* Légende */}
        <div className="hidden shrink-0 flex-col gap-1.5 sm:flex">
          {(Object.entries(STATE_STYLES) as [EffectiveState, typeof STATE_STYLES[EffectiveState]][]).map(([state, s]) => (
            <span key={state} className="flex items-center gap-1.5 text-[11px]">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
              <span className={s.labelCls}>{s.label}</span>
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {interactive && canManage && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-2.5 text-xs text-primary-deep">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Mode interactif — cliquez sur une carte pour accorder ou retirer l'accès directement.</span>
        </div>
      )}

      {/* Groupes de vues */}
      {groups.map(({ key, meta, views }) => {
        const groupActive = views.filter((v) => {
          const eff = getEffective(directs.get(v.code), rolePermissionCodes.includes(v.code));
          return eff === "grant-direct" || eff === "from-role";
        }).length;

        return (
          <div key={key} className="overflow-hidden rounded-2xl border border-surface-warm bg-white">
            {/* En-tête groupe */}
            <div className="flex items-center justify-between border-b border-surface-warm bg-surface px-5 py-3">
              <div className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${meta.dotColor}`} aria-hidden="true" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-ink-soft">{meta.label}</h3>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                groupActive === views.length ? "bg-primary/10 text-primary" :
                groupActive > 0 ? "bg-surface-warm text-ink-soft" :
                "bg-surface-warm text-ink-soft/50"
              }`}>
                {groupActive}/{views.length} actives
              </span>
            </div>

            {/* Grille de cartes */}
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {views.map((view) => {
                const direct  = directs.get(view.code);
                const fromRole = rolePermissionCodes.includes(view.code);
                const effective = getEffective(direct, fromRole);
                const style = STATE_STYLES[effective];
                const isLoading = loadingCode === view.code;
                const isClickable = interactive && canManage && !isLoading && !isPending;

                return (
                  <div
                    key={view.code}
                    onClick={() => handleCardClick(view.code, effective)}
                    role={isClickable ? "button" : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") handleCardClick(view.code, effective); } : undefined}
                    aria-label={isClickable ? `${view.label} — ${style.label}` : undefined}
                    className={`relative flex flex-col gap-1.5 rounded-xl border p-3.5 transition-all ${style.card} ${
                      isClickable ? "cursor-pointer hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]" : ""
                    } ${isLoading ? "opacity-60" : ""}`}
                  >
                    {/* Indicateur d'état */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-ink">{view.label}</span>
                      <div className="flex items-center gap-1.5">
                        {isLoading && (
                          <svg className="animate-spin text-muted" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                          </svg>
                        )}
                        <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden="true" />
                      </div>
                    </div>

                    <p className="text-[11px] leading-relaxed text-ink-soft">{view.description}</p>

                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-mono ${style.labelCls}`}>{style.label}</span>
                      {isClickable && (
                        <span className="text-[10px] text-ink-soft/50">
                          {effective === "absent"      ? "clic → accorder" :
                           effective === "from-role"   ? "clic → refuser" :
                           effective === "grant-direct"? "clic → retirer" :
                                                         "clic → rétablir"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
