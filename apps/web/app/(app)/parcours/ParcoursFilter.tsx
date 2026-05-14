"use client";
// Refs: SPEC.md §8, US-1.2 — filtre client-side sur la liste des parcours
import { useState } from "react";
import type { LearningPath, AssignmentDto } from "@elearning/api-client";
import { fr } from "@elearning/i18n";

const roleColors: Record<string, string> = {
  hr: "bg-purple-50 text-purple-700",
  developer: "bg-blue-50 text-blue-700",
  manager: "bg-amber-50 text-amber-700",
  finance: "bg-emerald-50 text-emerald-700",
  all: "bg-accent-soft text-primary",
};

const roleLabel: Record<string, string> = {
  hr: "RH", developer: "Développeur", manager: "Manager",
  finance: "Finance", all: "Tous les rôles",
};

interface Props {
  readonly paths: LearningPath[];
  readonly progress: Record<string, number>;
  readonly assignments: AssignmentDto[];
}

export function ParcoursFilter({ paths, progress, assignments }: Props) {
  const t = fr;
  const [searchText, setSearchText] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const now = new Date();
  const assignmentByPath = Object.fromEntries(
    assignments.filter((a) => a.resource_type === "path" && a.due_date).map((a) => [a.resource_id, a]),
  );

  function getPathPct(path: LearningPath) {
    const progresses = path.module_sequence.map((id) => progress[id] ?? 0);
    return progresses.length > 0 ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : 0;
  }

  const filtered = paths.filter((path) => {
    if (searchText && !path.title_fr.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (filterRole && path.target_role !== filterRole) return false;
    if (filterStatus) {
      const pct = getPathPct(path);
      if (filterStatus === "completed" && pct < 100) return false;
      if (filterStatus === "in_progress" && (pct === 0 || pct === 100)) return false;
      if (filterStatus === "not_started" && pct > 0) return false;
    }
    return true;
  });

  const hasFilter = searchText || filterRole || filterStatus;

  return (
    <>
      {/* Filtres */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <label htmlFor="parcours-search" className="mb-1 block text-xs font-medium text-ink-soft sr-only">
            {t.parcours.searchPlaceholder}
          </label>
          <div className="relative">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/50" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              id="parcours-search"
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t.parcours.searchPlaceholder}
              className="w-full rounded-lg border border-surface-warm bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label htmlFor="parcours-role" className="mb-1 block text-xs font-medium text-ink-soft sr-only">
            {t.parcours.filterRole}
          </label>
          <select
            id="parcours-role"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-lg border border-surface-warm bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t.parcours.allRoles}</option>
            <option value="hr">RH</option>
            <option value="developer">Développeur</option>
            <option value="manager">Manager</option>
            <option value="finance">Finance</option>
            <option value="all">Tous les rôles</option>
          </select>
        </div>

        <div>
          <label htmlFor="parcours-status" className="mb-1 block text-xs font-medium text-ink-soft sr-only">
            {t.parcours.filterStatus}
          </label>
          <select
            id="parcours-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-surface-warm bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t.parcours.allStatuses}</option>
            <option value="not_started">Non commencé</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
          </select>
        </div>

        {hasFilter && (
          <button
            type="button"
            onClick={() => { setSearchText(""); setFilterRole(""); setFilterStatus(""); }}
            className="rounded-lg border border-surface-warm px-3 py-2 text-xs font-medium text-ink-soft hover:bg-surface transition-colors"
          >
            Réinitialiser
          </button>
        )}

        <span aria-live="polite" className="text-xs text-ink-soft self-end pb-2">
          {filtered.length} parcours
        </span>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-surface-warm bg-white py-16 text-center">
          <p className="font-medium text-ink">Aucun parcours trouvé</p>
          <p className="mt-1 text-sm text-ink-soft">Modifiez vos filtres</p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {filtered.map((path) => {
            const moduleProgresses = path.module_sequence.map((id) => progress[id] ?? 0);
            const pathPct = moduleProgresses.length > 0
              ? Math.round(moduleProgresses.reduce((a, b) => a + b, 0) / moduleProgresses.length)
              : 0;
            const completedCount = moduleProgresses.filter((p) => p === 100).length;
            const assignment = assignmentByPath[path.id];
            const dueDate = assignment?.due_date ? new Date(assignment.due_date) : null;
            const isOverdue = dueDate && dueDate < now && pathPct < 100;

            let ctaLabel = t.paths.start;
            if (pathPct === 100) ctaLabel = "Revoir";
            else if (pathPct > 0) ctaLabel = "Continuer";

            return (
              <li key={path.id}>
                <article
                  aria-labelledby={`path-${path.id}`}
                  className={`group flex flex-col rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${isOverdue ? "border-red-200" : "border-surface-warm"}`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isOverdue ? "bg-red-50" : "bg-accent-soft"}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isOverdue ? "text-red-500" : "text-primary"} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isOverdue && (
                        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                          {t.assignments.overdue}
                        </span>
                      )}
                      {path.is_mandatory && (
                        <span className="rounded-full bg-accent-bright px-2.5 py-0.5 text-xs font-semibold text-primary-deep">
                          {t.paths.mandatory}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[path.target_role] ?? roleColors.all}`}>
                        {roleLabel[path.target_role] ?? path.target_role}
                      </span>
                    </div>
                  </div>

                  <h2 id={`path-${path.id}`} className="mb-2 font-semibold text-primary-deep leading-snug">
                    {path.title_fr}
                  </h2>

                  <p className="text-sm text-ink-soft">
                    {completedCount}/{path.module_sequence.length} module{path.module_sequence.length > 1 ? "s" : ""} terminé{completedCount > 1 ? "s" : ""}
                  </p>
                  {dueDate ? (
                    <p className={`mb-5 mt-1 text-xs font-medium ${isOverdue ? "text-red-600" : "text-ink-soft"}`}>
                      {isOverdue
                        ? `${t.assignments.overdueSince} ${dueDate.toLocaleDateString("fr-FR")}`
                        : `${t.assignments.dueOn} ${dueDate.toLocaleDateString("fr-FR")}`
                      }
                    </p>
                  ) : (
                    <div className="mb-5" />
                  )}

                  <div className="mb-5">
                    <div className="mb-1.5 flex justify-between text-xs text-ink-soft">
                      <span>Progression</span>
                      <span className={`font-medium ${pathPct === 100 ? "text-green-700" : "text-primary"}`}>{pathPct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-warm">
                      <progress value={pathPct} max={100} className="sr-only" aria-label={`Progression ${pathPct}%`} />
                      <div
                        className={`h-full rounded-full transition-all ${pathPct === 100 ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${pathPct}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="mt-auto">
                    <a
                      href={`/parcours/${path.id}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {ctaLabel}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </a>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
