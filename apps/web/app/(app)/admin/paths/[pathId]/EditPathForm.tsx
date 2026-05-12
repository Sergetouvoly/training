"use client";
// Refs: SPEC-CONTENT.md §6.1 — formulaire édition parcours
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LearningPath, Module } from "@elearning/api-client";

const ROLES = [
  { value: "all", label: "Tous les rôles" },
  { value: "hr", label: "Ressources humaines" },
  { value: "developer", label: "Développeur" },
  { value: "manager", label: "Manager" },
  { value: "finance", label: "Finance" },
] as const;

interface Props {
  readonly path: LearningPath;
  readonly modules: Module[];
}

export function EditPathForm({ path, modules }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(path.title_fr);
  const [role, setRole] = useState<string>(path.target_role);
  const [mandatory, setMandatory] = useState(path.is_mandatory);
  const [sequence, setSequence] = useState<string[]>(path.module_sequence);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moduleMap = Object.fromEntries(modules.map((m) => [m.id, m]));

  function toggleModule(id: string) {
    setSequence((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setSaved(false);
  }

  function moveUp(i: number) {
    if (i === 0) return;
    setSequence((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
    setSaved(false);
  }

  function moveDown(i: number) {
    setSequence((prev) => {
      if (i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
    setSaved(false);
  }

  function removeFromSequence(id: string) {
    setSequence((prev) => prev.filter((x) => x !== id));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || sequence.length === 0) return;
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/learning/paths/${path.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title_fr: title.trim(),
          target_role: role,
          is_mandatory: mandatory,
          module_sequence: sequence,
        }),
      });
      if (!res.ok) throw new Error("Sauvegarde échouée");
      setSaved(true);
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Vérifiez que l'API est accessible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Titre */}
      <div>
        <label htmlFor="path-title" className="block text-sm font-semibold text-ink mb-1.5">
          Titre du parcours <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="path-title"
          type="text"
          required
          value={title}
          onChange={(e) => { setTitle(e.target.value); setSaved(false); }}
          className="w-full rounded-xl border border-surface-warm px-4 py-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
        />
      </div>

      {/* Rôle + Obligatoire */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="path-role" className="block text-sm font-semibold text-ink mb-1.5">
            Public cible
          </label>
          <select
            id="path-role"
            value={role}
            onChange={(e) => { setRole(e.target.value); setSaved(false); }}
            className="w-full rounded-xl border border-surface-warm px-4 py-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition bg-white"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-surface-warm px-4 py-3 hover:bg-surface transition-colors">
            <input
              type="checkbox"
              checked={mandatory}
              onChange={(e) => { setMandatory(e.target.checked); setSaved(false); }}
              className="h-4 w-4 rounded accent-primary"
            />
            <span className="text-sm font-medium text-ink">Parcours obligatoire</span>
          </label>
        </div>
      </div>

      {/* Sélection modules */}
      <div>
        <p className="text-sm font-semibold text-ink mb-1.5">Modules inclus</p>
        <p className="text-xs text-ink-soft mb-3">Cochez pour ajouter ou retirer des modules.</p>
        {modules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-warm bg-surface p-6 text-center text-sm text-ink-soft">
            Aucun module disponible.
          </div>
        ) : (
          <div className="space-y-1.5 rounded-xl border border-surface-warm bg-white p-3 max-h-56 overflow-y-auto">
            {modules.map((mod) => {
              const selected = sequence.includes(mod.id);
              return (
                <label
                  key={mod.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                    selected ? "bg-primary/10 text-primary" : "hover:bg-surface text-ink"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleModule(mod.id)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <span className="text-sm font-medium leading-snug flex-1">{mod.title_fr}</span>
                  {mod.content_fr && (
                    <span className="shrink-0 text-xs text-ink-soft">
                      {mod.content_fr?.lessons?.length ?? 0} leç. · {mod.content_fr?.estimated_duration_minutes ?? 0}min
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Séquence ordonnée */}
      {sequence.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-ink mb-3">
            Séquence ({sequence.length} module{sequence.length > 1 ? "s" : ""})
          </p>
          <ol className="space-y-2">
            {sequence.map((id, i) => {
              const mod = moduleMap[id];
              return (
                <li key={id} className="flex items-center gap-3 rounded-xl border border-surface-warm bg-white px-4 py-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-ink truncate">
                    {mod?.title_fr ?? id}
                  </span>
                  {mod && (
                    <a
                      href={`/admin/modules/${mod.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded p-1 text-ink-soft hover:text-primary hover:bg-surface transition-colors"
                      aria-label={`Éditer ${mod.title_fr}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      aria-label="Monter"
                      className="rounded p-1 text-ink-soft hover:text-primary hover:bg-surface transition-colors disabled:opacity-30"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(i)}
                      disabled={i === sequence.length - 1}
                      aria-label="Descendre"
                      className="rounded p-1 text-ink-soft hover:text-primary hover:bg-surface transition-colors disabled:opacity-30"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromSequence(id)}
                      aria-label="Retirer"
                      className="rounded p-1 text-ink-soft hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Retour d'état */}
      {saved && (
        <div role="status" className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 ring-1 ring-green-200">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Parcours enregistré avec succès.
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !title.trim() || sequence.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-deep transition-colors disabled:opacity-40 shadow-sm"
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Sauvegarde…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              Enregistrer
            </>
          )}
        </button>
        <Link
          href="/admin/paths"
          className="rounded-xl border border-surface-warm px-5 py-3 text-sm font-medium text-ink hover:bg-surface transition-colors"
        >
          Retour
        </Link>
      </div>
    </form>
  );
}
