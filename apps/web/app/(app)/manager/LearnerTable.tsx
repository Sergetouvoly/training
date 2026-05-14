"use client";
// Refs: SPEC.md §7 manager space — vue équipe avec filtre En retard
import { useState } from "react";
import Link from "next/link";
import type { LearnerSummary, AssignmentDto } from "@elearning/api-client";
import { fr } from "@elearning/i18n";

const JOB_LABELS: Record<string, string> = {
  hr: "RH", developer: "Développeur", manager: "Manager", finance: "Finance",
};

interface Props {
  readonly learners: LearnerSummary[];
  readonly assignments: AssignmentDto[];
}

export function LearnerTable({ learners, assignments }: Props) {
  const t = fr;
  const [overdueOnly, setOverdueOnly] = useState(false);

  const now = new Date();
  const overdueIds = new Set(
    assignments
      .filter((a) => a.due_date && new Date(a.due_date) < now)
      .map((a) => a.assignee_id),
  );

  const filtered = overdueOnly
    ? learners.filter((l) => overdueIds.has(l.id) || l.red_count > 0)
    : learners;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-primary-deep">
          {overdueOnly ? "Membres en retard" : "Toute l'équipe"}
        </h2>
        <div className="flex items-center gap-3">
          <label htmlFor="overdue-filter" className="text-xs font-medium text-ink-soft">
            Filtre :
          </label>
          <select
            id="overdue-filter"
            value={overdueOnly ? "overdue" : "all"}
            onChange={(e) => setOverdueOnly(e.target.value === "overdue")}
            className="rounded-lg border border-surface-warm bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Filtrer les membres"
          >
            <option value="all">Tous</option>
            <option value="overdue">{t.assignments.overdue} / À risque</option>
          </select>
          <span aria-live="polite" className="text-xs text-ink-soft">
            {filtered.length} membre{filtered.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-warm bg-surface">
              <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft">Membre</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft hidden sm:table-cell">Rôle</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft hidden md:table-cell">Compétences</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft hidden lg:table-cell">Statut</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-ink-soft">Profil</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-soft">
                  {overdueOnly ? "Aucun membre en retard" : "Aucun membre dans cette équipe"}
                </td>
              </tr>
            ) : filtered.map((l) => {
              const isOverdue = overdueIds.has(l.id);
              return (
                <tr key={l.id} className="border-b border-surface-warm last:border-0 hover:bg-surface/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${l.red_count > 0 ? "bg-red-50 text-red-600" : "bg-primary/10 text-primary"}`}>
                        {l.display_name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium text-ink">{l.display_name}</p>
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
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                        {t.assignments.overdue}
                      </span>
                    )}
                    {!isOverdue && l.red_count > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-200">
                        À risque
                      </span>
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
    </section>
  );
}
