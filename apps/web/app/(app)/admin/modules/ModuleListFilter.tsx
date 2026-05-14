"use client";
// Refs: SPEC.md §8 view.admin_modules — recherche et filtres admin modules
import { useState, useMemo } from "react";
import Link from "next/link";
import type { Module, CompetenceDto } from "@elearning/api-client";

const DURATION_RANGES = [
  { key: "all",    label: "Toutes les durées" },
  { key: "short",  label: "Court (< 15 min)",    min: 0,  max: 14 },
  { key: "medium", label: "Moyen (15–45 min)",   min: 15, max: 45 },
  { key: "long",   label: "Long (> 45 min)",     min: 46, max: Infinity },
] as const;

type DurationKey = (typeof DURATION_RANGES)[number]["key"];
type StatusKey   = "all" | "published" | "draft";

interface Props {
  readonly modules: Module[];
  readonly competences: CompetenceDto[];
  readonly canDelete: boolean;
  readonly DeleteButton: React.ComponentType<{ deleteUrl: string; label: string; redirectTo: string }>;
}

export function ModuleListFilter({ modules, competences, canDelete, DeleteButton }: Props) {
  const [search,      setSearch]      = useState("");
  const [status,      setStatus]      = useState<StatusKey>("all");
  const [competenceId, setCompetenceId] = useState("");
  const [duration,    setDuration]    = useState<DurationKey>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return modules.filter((mod) => {
      if (q && !mod.title_fr.toLowerCase().includes(q)) return false;

      if (status === "published" && mod.status !== "published") return false;
      if (status === "draft"     && mod.status !== "draft")     return false;

      if (competenceId && !mod.competence_ids.includes(competenceId)) return false;

      if (duration !== "all") {
        const range = DURATION_RANGES.find(r => r.key === duration);
        const mins  = mod.estimated_duration_minutes ?? 0;
        if (range && "min" in range && (mins < range.min || mins > range.max)) return false;
      }

      return true;
    });
  }, [modules, search, status, competenceId, duration]);

  const isFiltered = search || status !== "all" || competenceId || duration !== "all";
  const publishedCount = filtered.filter(m => m.status === "published").length;
  const draftCount     = filtered.filter(m => m.status !== "published").length;

  return (
    <div className="space-y-5">
      {/* Stats filtrées */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-surface-warm bg-white px-4 py-3">
          <p className="text-xs text-ink-soft">Total affiché</p>
          <p className="text-2xl font-extrabold text-primary-deep">{filtered.length}</p>
          {isFiltered && <p className="text-[10px] text-ink-soft">sur {modules.length}</p>}
        </div>
        <div className="rounded-xl border border-surface-warm bg-white px-4 py-3">
          <p className="text-xs text-ink-soft">Publiés</p>
          <p className="text-2xl font-extrabold text-green-600">{publishedCount}</p>
        </div>
        <div className="rounded-xl border border-surface-warm bg-white px-4 py-3">
          <p className="text-xs text-ink-soft">Brouillons</p>
          <p className="text-2xl font-extrabold text-ink-soft">{draftCount}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        {/* Recherche */}
        <div className="relative flex-1 min-w-56">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un module…"
            className="w-full rounded-xl border border-surface-warm bg-white py-2.5 pl-9 pr-4 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Rechercher un module"
          />
        </div>

        {/* Statut */}
        <select
          value={status}
          onChange={e => setStatus(e.target.value as StatusKey)}
          className="rounded-xl border border-surface-warm bg-white px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="Filtrer par statut"
        >
          <option value="all">Tous les statuts</option>
          <option value="published">Publiés</option>
          <option value="draft">Brouillons</option>
        </select>

        {/* Compétence */}
        {competences.length > 0 && (
          <select
            value={competenceId}
            onChange={e => setCompetenceId(e.target.value)}
            className="rounded-xl border border-surface-warm bg-white px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Filtrer par compétence"
          >
            <option value="">Toutes les compétences</option>
            {competences.map(c => (
              <option key={c.id} value={c.id}>{c.label_fr}</option>
            ))}
          </select>
        )}

        {/* Durée */}
        <select
          value={duration}
          onChange={e => setDuration(e.target.value as DurationKey)}
          className="rounded-xl border border-surface-warm bg-white px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="Filtrer par durée"
        >
          {DURATION_RANGES.map(r => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>

        {isFiltered && (
          <button
            type="button"
            onClick={() => { setSearch(""); setStatus("all"); setCompetenceId(""); setDuration("all"); }}
            className="rounded-xl border border-surface-warm px-3 py-2.5 text-xs font-medium text-ink-soft hover:bg-surface transition-colors"
          >
            Réinitialiser
          </button>
        )}

        <span aria-live="polite" className="self-center text-xs text-ink-soft">
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-warm bg-surface p-12 text-center">
          <p className="text-ink-soft">
            {isFiltered ? "Aucun module ne correspond à ces filtres." : "Aucun module pour l'instant."}
          </p>
          {isFiltered && (
            <button
              type="button"
              onClick={() => { setSearch(""); setStatus("all"); setCompetenceId(""); setDuration("all"); }}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-warm bg-surface">
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft">Module</th>
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft hidden sm:table-cell">Leçons</th>
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft hidden md:table-cell">Durée</th>
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft hidden lg:table-cell">Version</th>
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft">Statut</th>
                <th className="px-5 py-3.5 text-right font-semibold text-ink-soft">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mod) => (
                <tr key={mod.id} className="border-b border-surface-warm last:border-0 hover:bg-surface/40 transition-colors group">
                  <td className="px-5 py-4">
                    <p className="font-medium text-ink group-hover:text-primary transition-colors">{mod.title_fr}</p>
                    <p className="text-xs text-ink-soft mt-0.5 font-mono">{mod.id.slice(0, 8)}…</p>
                    {mod.competence_ids.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {mod.competence_ids.slice(0, 3).map(cid => {
                          const comp = competences.find(c => c.id === cid);
                          return comp ? (
                            <span key={cid} className="rounded-full bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              {comp.label_fr}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-ink-soft hidden sm:table-cell tabular-nums">
                    {mod.content_fr?.lessons.length ?? 0}
                  </td>
                  <td className="px-5 py-4 text-ink-soft hidden md:table-cell">
                    {mod.estimated_duration_minutes ? `~${mod.estimated_duration_minutes} min` : "—"}
                  </td>
                  <td className="px-5 py-4 text-ink-soft hidden lg:table-cell font-mono text-xs">
                    v{mod.version}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      mod.status === "published"
                        ? "bg-green-50 text-green-700"
                        : "bg-surface text-ink-soft"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${mod.status === "published" ? "bg-green-500" : "bg-muted"}`} aria-hidden="true" />
                      {mod.status === "published" ? "Publié" : "Brouillon"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/admin/modules/${mod.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-all"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        Éditer
                      </Link>
                      {canDelete && (
                        <DeleteButton
                          deleteUrl={`/api/learning/modules/${mod.id}`}
                          label="Supprimer"
                          redirectTo="/admin/modules"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
