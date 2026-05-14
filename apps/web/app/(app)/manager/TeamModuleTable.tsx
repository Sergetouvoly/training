"use client";
// Refs: SPEC.md §7, US-2a.5 — onglets par membre / par module
import { useState } from "react";
import Link from "next/link";
import type { LearnerSummary, AssignmentDto, TeamModuleProgress, Module } from "@elearning/api-client";

const JOB_LABELS: Record<string, string> = {
  hr: "RH", developer: "Développeur", manager: "Manager", finance: "Finance",
};

type SortDir = "asc" | "desc";

interface Props {
  readonly learners: LearnerSummary[];
  readonly assignments: AssignmentDto[];
  readonly teamModuleProgress: TeamModuleProgress[];
  readonly modules: Module[];
}

export function TeamModuleTable({ learners, assignments, teamModuleProgress, modules }: Props) {
  const [tab, setTab] = useState<"members" | "modules">("members");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const moduleMap = Object.fromEntries(modules.map((m) => [m.id, m]));

  const now = new Date();
  const overdueIds = new Set(
    assignments.filter((a) => a.due_date && new Date(a.due_date) < now).map((a) => a.assignee_id),
  );

  const sortedModules = [...teamModuleProgress].sort((a, b) =>
    sortDir === "desc"
      ? b.avg_completion_percent - a.avg_completion_percent
      : a.avg_completion_percent - b.avg_completion_percent,
  );

  return (
    <section>
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Vue équipe"
        className="mb-4 flex items-center gap-1 rounded-xl border border-surface-warm bg-surface p-1 w-fit"
      >
        <button
          role="tab"
          aria-selected={tab === "members"}
          aria-controls="tab-members"
          id="tab-btn-members"
          type="button"
          onClick={() => setTab("members")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === "members" ? "bg-white text-primary-deep shadow-sm" : "text-ink-soft hover:text-primary-deep"}`}
        >
          Par membre
        </button>
        <button
          role="tab"
          aria-selected={tab === "modules"}
          aria-controls="tab-modules"
          id="tab-btn-modules"
          type="button"
          onClick={() => setTab("modules")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === "modules" ? "bg-white text-primary-deep shadow-sm" : "text-ink-soft hover:text-primary-deep"}`}
        >
          Par module
        </button>
      </div>

      {/* Tab: Par membre */}
      <div
        role="tabpanel"
        id="tab-members"
        aria-labelledby="tab-btn-members"
        hidden={tab !== "members"}
      >
        <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-warm bg-surface">
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft">Membre</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft hidden sm:table-cell">Rôle</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft hidden md:table-cell">Compétences</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-ink-soft">Profil</th>
              </tr>
            </thead>
            <tbody>
              {learners.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-ink-soft">
                    Aucun membre dans cette équipe
                  </td>
                </tr>
              ) : learners.map((l) => {
                const isOverdue = overdueIds.has(l.id);
                return (
                  <tr key={l.id} className="border-b border-surface-warm last:border-0 hover:bg-surface/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${l.red_count > 0 ? "bg-red-50 text-red-600" : "bg-primary/10 text-primary"}`}>
                          {l.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-ink">{l.display_name}</p>
                          {isOverdue && (
                            <span className="text-xs font-medium text-red-600">En retard</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-ink-soft hidden sm:table-cell">
                      {JOB_LABELS[l.primary_role] ?? l.primary_role}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {l.stamp_count === 0 ? (
                        <span className="text-xs text-ink-soft">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-ink tabular-nums">{l.green_count}</span>
                          <span className="text-xs text-ink-soft">/ {l.stamp_count}</span>
                          <div className="ml-1 h-1.5 w-16 overflow-hidden rounded-full bg-surface-warm">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.round((l.green_count / l.stamp_count) * 100)}%` }}
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/manager/learners/${l.id}`}
                        className="rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface hover:border-primary/30 transition-colors"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tab: Par module */}
      <div
        role="tabpanel"
        id="tab-modules"
        aria-labelledby="tab-btn-modules"
        hidden={tab !== "modules"}
      >
        <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-warm bg-surface">
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft">Module</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-ink-soft hidden sm:table-cell">Membres</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-ink-soft hidden md:table-cell">Terminé</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft">
                  <button
                    type="button"
                    onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
                    className="flex items-center gap-1 hover:text-primary-deep transition-colors"
                    aria-label={`Trier par progression ${sortDir === "desc" ? "croissante" : "décroissante"}`}
                  >
                    Progression moy.
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {sortDir === "desc"
                        ? <path d="M12 5v14M5 12l7 7 7-7"/>
                        : <path d="M12 19V5M5 12l7-7 7 7"/>
                      }
                    </svg>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedModules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-ink-soft">
                    Aucune progression enregistrée pour cette équipe
                  </td>
                </tr>
              ) : sortedModules.map((mp) => {
                const mod = moduleMap[mp.module_id];
                return (
                  <tr key={mp.module_id} className="border-b border-surface-warm last:border-0 hover:bg-surface/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink">
                        {mod?.title_fr ?? mp.module_id.slice(0, 24) + "…"}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-ink-soft hidden sm:table-cell">
                      {mp.member_count}
                    </td>
                    <td className="px-5 py-3.5 text-right hidden md:table-cell">
                      <span className="text-xs font-medium text-green-700">
                        {mp.completed_count}/{mp.member_count}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-surface-warm">
                          <div
                            className={`h-full rounded-full ${mp.avg_completion_percent === 100 ? "bg-green-500" : "bg-primary"}`}
                            style={{ width: `${mp.avg_completion_percent}%` }}
                            role="progressbar"
                            aria-valuenow={mp.avg_completion_percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          />
                        </div>
                        <span className={`shrink-0 text-xs font-bold tabular-nums ${mp.avg_completion_percent === 100 ? "text-green-700" : "text-primary"}`}>
                          {mp.avg_completion_percent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
