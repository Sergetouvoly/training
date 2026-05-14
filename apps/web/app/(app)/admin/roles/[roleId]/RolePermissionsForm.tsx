"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PERMISSIONS, splitPermission, type Permission } from "@elearning/domain";
import type { RoleWithPermissionsDto } from "@elearning/api-client";

// ─── Groupes ──────────────────────────────────────────────────────────────────

type PermGroup = { resource: string; codes: Permission[] };

const PERMISSION_GROUPS: PermGroup[] = PERMISSIONS.reduce<PermGroup[]>((acc, p) => {
  const { resource } = splitPermission(p);
  const group = acc.find((g) => g.resource === resource);
  if (group) group.codes.push(p);
  else acc.push({ resource, codes: [p] });
  return acc;
}, []);

const RESOURCE_LABELS: Record<string, string> = {
  user: "Utilisateurs", learner: "Apprenants", competence: "Compétences",
  module: "Modules", learning_path: "Parcours", evaluation_item: "Questions",
  stamp: "Stamps", mastery: "Maîtrise", scenario: "Scénarios",
  challenge: "Challenges", analytics: "Analytiques", app_config: "Configuration",
  ai: "Intelligence artificielle", audit: "Audit", role: "Rôles",
  trash: "Corbeille", view: "Vues & Espaces",
};

// ─── Composant ────────────────────────────────────────────────────────────────

interface Props {
  readonly role: RoleWithPermissionsDto;
  readonly canEdit: boolean;
}

export function RolePermissionsForm({ role, canEdit }: Props) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set(role.permission_codes));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);

  function toggle(code: string) {
    if (!canEdit) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
    setDirty(true);
    setSuccess(false);
  }

  function toggleAll(codes: Permission[], value: boolean) {
    if (!canEdit) return;
    setChecked((prev) => {
      const next = new Set(prev);
      codes.forEach((c) => value ? next.add(c) : next.delete(c));
      return next;
    });
    setDirty(true);
    setSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/roles/${role.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: [...checked] }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as any).error ?? "Erreur lors de l'enregistrement.");
        return;
      }
      setSuccess(true);
      setDirty(false);
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur.");
    } finally {
      setSaving(false);
    }
  }

  const totalChecked = checked.size;
  const totalPerms = PERMISSIONS.length;

  return (
    <div className="space-y-5">
      {/* ── Barre d'actions sticky ── */}
      {canEdit && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-2xl border border-surface-warm bg-white/95 px-5 py-3 shadow-sm backdrop-blur-sm">
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">{totalChecked}</span>
            <span> / {totalPerms} permissions activées</span>
          </p>
          <div className="flex items-center gap-3">
            {error && (
              <p role="alert" className="text-sm text-red-600">{error}</p>
            )}
            {success && !dirty && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Enregistré
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-deep disabled:opacity-40"
            >
              {saving ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Enregistrement…
                </>
              ) : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {/* ── Groupes de permissions ── */}
      {PERMISSION_GROUPS.map(({ resource, codes }) => {
        const groupChecked = codes.filter((c) => checked.has(c)).length;
        const allOn  = groupChecked === codes.length;
        const noneOn = groupChecked === 0;
        const badgeCls = allOn ? "bg-primary/10 text-primary" : noneOn ? "bg-surface-warm text-ink-soft" : "bg-accent-soft text-muted";

        return (
          <div key={resource} className="overflow-hidden rounded-2xl border border-surface-warm bg-white">
            {/* En-tête du groupe */}
            <div className="flex items-center justify-between border-b border-surface-warm bg-surface px-5 py-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                  {RESOURCE_LABELS[resource] ?? resource}
                </h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCls}`}>
                  {groupChecked}/{codes.length}
                </span>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleAll(codes, true)}
                    disabled={allOn}
                    className="rounded-lg border border-surface-warm px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:opacity-30"
                  >
                    Tout activer
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAll(codes, false)}
                    disabled={groupChecked === 0}
                    className="rounded-lg border border-surface-warm px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  >
                    Tout désactiver
                  </button>
                </div>
              )}
            </div>

            {/* Grille des permissions */}
            <div className="grid gap-1.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {codes.map((code) => {
                const { verb } = splitPermission(code);
                const on = checked.has(code);

                return (
                  <button
                    key={code}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    disabled={!canEdit}
                    onClick={() => toggle(code)}
                    className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition-all ${
                      on
                        ? "border-primary/25 bg-primary/5 hover:border-primary/40 hover:bg-primary/8"
                        : "border-surface-warm bg-white text-ink-soft hover:border-surface-warm hover:bg-surface"
                    } ${canEdit ? "cursor-pointer" : "cursor-default opacity-70"}`}
                  >
                    {/* Toggle visuel */}
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                        on
                          ? "border-primary bg-primary"
                          : "border-surface-warm bg-white group-hover:border-muted"
                      }`}
                      aria-hidden="true"
                    >
                      {on && (
                        <svg width="9" height="9" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 4 7 9 1"/>
                        </svg>
                      )}
                    </span>
                    <span className={`font-mono font-medium ${on ? "text-primary-deep" : "text-ink-soft"}`}>
                      {verb}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Bouton bas de page pour les longues listes ── */}
      {canEdit && dirty && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-deep disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer les permissions"}
          </button>
        </div>
      )}
    </div>
  );
}
