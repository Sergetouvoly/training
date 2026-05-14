"use client";
// Refs: SPEC.md §8 view.learner_modules — catalogue filtrable de modules
import { useState } from "react";
import type { Module, CompetenceDto } from "@elearning/api-client";
import { fr } from "@elearning/i18n";

interface Props {
  readonly modules: Module[];
  readonly competences: CompetenceDto[];
  readonly progress: Record<string, number>;
}

const STATUS_LABELS: Record<string, string> = {
  published: "Publié",
  draft: "Brouillon",
};

export function ModuleCatalogueFilter({ modules, competences, progress }: Props) {
  const t = fr;
  const [searchText, setSearchText] = useState("");
  const [filterCompetenceId, setFilterCompetenceId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const filtered = modules.filter((mod) => {
    if (searchText && !mod.title_fr.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (filterCompetenceId && !mod.competence_ids.includes(filterCompetenceId)) return false;
    if (filterStatus) {
      const pct = progress[mod.id] ?? 0;
      if (filterStatus === "not_started" && pct > 0) return false;
      if (filterStatus === "in_progress" && (pct === 0 || pct === 100)) return false;
      if (filterStatus === "completed" && pct < 100) return false;
    }
    return true;
  });

  const hasFilter = searchText || filterCompetenceId || filterStatus;

  return (
    <>
      {/* Filtres */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <label htmlFor="module-search" className="sr-only">{t.modules.searchPlaceholder}</label>
          <div className="relative">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/50" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              id="module-search"
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t.modules.searchPlaceholder}
              className="w-full rounded-lg border border-surface-warm bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label htmlFor="module-competence" className="sr-only">{t.modules.filterCompetence}</label>
          <select
            id="module-competence"
            value={filterCompetenceId}
            onChange={(e) => setFilterCompetenceId(e.target.value)}
            className="rounded-lg border border-surface-warm bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t.modules.allCompetences}</option>
            {competences.map((c) => (
              <option key={c.id} value={c.id}>{c.label_fr}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="module-status" className="sr-only">{t.modules.filterStatus}</label>
          <select
            id="module-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-surface-warm bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t.modules.allStatuses}</option>
            <option value="not_started">Non commencé</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
          </select>
        </div>

        {hasFilter && (
          <button
            type="button"
            onClick={() => { setSearchText(""); setFilterCompetenceId(""); setFilterStatus(""); }}
            className="rounded-lg border border-surface-warm px-3 py-2 text-xs font-medium text-ink-soft hover:bg-surface transition-colors"
          >
            Réinitialiser
          </button>
        )}

        <span aria-live="polite" className="text-xs text-ink-soft self-end pb-2">
          {filtered.length} module{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-surface-warm bg-white py-16 text-center">
          <p className="font-medium text-ink">{t.modules.noModulesFound}</p>
          <p className="mt-1 text-sm text-ink-soft">{t.modules.adjustFilters}</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((mod) => {
            const pct = progress[mod.id] ?? 0;
            const modCompetences = competences.filter((c) => mod.competence_ids.includes(c.id));
            return (
              <li key={mod.id}>
                <a
                  href={`/module?module_id=${mod.id}`}
                  className="group flex flex-col rounded-xl border border-surface-warm bg-white p-5 shadow-sm transition-shadow hover:shadow-md hover:border-primary/20"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v17H6.5A2.5 2.5 0 0 1 4 19.5z"/>
                      </svg>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${mod.status === "published" ? "bg-green-50 text-green-700" : "bg-surface text-ink-soft"}`}>
                      {STATUS_LABELS[mod.status] ?? mod.status}
                    </span>
                  </div>

                  <p className="font-semibold text-primary-deep leading-snug group-hover:text-primary transition-colors">
                    {mod.title_fr}
                  </p>

                  {modCompetences.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {modCompetences.slice(0, 2).map((c) => (
                        <span key={c.id} className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {c.label_fr}
                        </span>
                      ))}
                      {modCompetences.length > 2 && (
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-ink-soft">
                          +{modCompetences.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {mod.estimated_duration_minutes && (
                    <p className="mt-2 text-xs text-ink-soft">{mod.estimated_duration_minutes} min</p>
                  )}

                  {pct > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-ink-soft mb-1">
                        <span>Progression</span>
                        <span className={`font-medium ${pct === 100 ? "text-green-700" : "text-primary"}`}>{pct}%</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-surface-warm">
                        <div
                          className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                    </div>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
