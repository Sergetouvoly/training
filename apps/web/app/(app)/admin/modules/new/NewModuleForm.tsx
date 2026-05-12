"use client";
// Refs: SPEC-CONTENT.md §6.2 — formulaire création module
import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "all", label: "Tous les rôles" },
  { value: "hr", label: "Ressources humaines" },
  { value: "developer", label: "Développeur" },
  { value: "manager", label: "Manager" },
  { value: "finance", label: "Finance" },
] as const;

export function NewModuleForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<string>("all");
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/learning/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title_fr: title.trim(),
          target_role: role,
          estimated_duration_minutes: duration,
          competence_ids: [],
        }),
      });
      if (!res.ok) throw new Error("Création échouée");
      const mod = await res.json();
      router.push(`/admin/modules/${mod.id}`);
    } catch {
      setError("Une erreur est survenue. Vérifiez que l'API est accessible.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Titre */}
      <div>
        <label htmlFor="module-title" className="block text-sm font-semibold text-ink mb-1.5">
          Titre du module <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="module-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ex. Introduction au RGPD pour les RH"
          className="w-full rounded-xl border border-surface-warm px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
          autoFocus
        />
      </div>

      {/* Rôle cible */}
      <div>
        <label htmlFor="module-role" className="block text-sm font-semibold text-ink mb-1.5">
          Public cible
        </label>
        <select
          id="module-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-xl border border-surface-warm px-4 py-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition bg-white"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Durée estimée */}
      <div>
        <label htmlFor="module-duration" className="block text-sm font-semibold text-ink mb-1.5">
          Durée estimée (minutes)
        </label>
        <div className="flex items-center gap-4">
          <input
            id="module-duration"
            type="range"
            min={5}
            max={180}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="w-16 text-right text-sm font-semibold text-primary tabular-nums">
            {duration} min
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-soft">Sera affinée automatiquement après ajout des leçons.</p>
      </div>

      {/* Erreur */}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-deep transition-colors disabled:opacity-40 shadow-sm"
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Création…
            </>
          ) : (
            <>
              Créer et accéder à l'éditeur
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
        <a href="/admin/modules" className="rounded-xl border border-surface-warm px-5 py-3 text-sm font-medium text-ink hover:bg-surface transition-colors">
          Annuler
        </a>
      </div>
    </form>
  );
}
