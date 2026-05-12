"use client";
// Refs: SPEC.md §7 — création d'un compte utilisateur par un admin
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function NewUserForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const body = {
      display_name: data.get("display_name") as string,
      email: data.get("email") as string,
      password: data.get("password") as string,
      platform_role: data.get("platform_role") as string,
      job_role: (data.get("job_role") as string) || undefined,
    };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        setError("Cette adresse e-mail est déjà utilisée.");
        return;
      }
      if (!res.ok) {
        setError("Une erreur est survenue. Vérifiez que l'API est accessible.");
        return;
      }

      router.push("/admin/users");
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/users"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-warm text-ink-soft hover:bg-surface transition-colors"
          aria-label="Retour"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-primary-deep">Nouvel utilisateur</h1>
          <p className="text-sm text-ink-soft">Créer un compte sur la plateforme</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-surface-warm bg-white p-8 space-y-5">
        <div>
          <label htmlFor="display_name" className="mb-1.5 block text-sm font-medium text-ink">
            Nom complet <span className="text-red-500">*</span>
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            required
            placeholder="Marie Dupont"
            className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
            Adresse e-mail <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="marie@exemple.fr"
            className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
            Mot de passe provisoire <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Minimum 8 caractères"
            className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="platform_role" className="mb-1.5 block text-sm font-medium text-ink">
            Rôle plateforme <span className="text-red-500">*</span>
          </label>
          <select
            id="platform_role"
            name="platform_role"
            required
            defaultValue="learner"
            className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="learner">Apprenant</option>
            <option value="manager">Manager</option>
            <option value="trainer">Formateur</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        <div>
          <label htmlFor="job_role" className="mb-1.5 block text-sm font-medium text-ink">
            Rôle métier
          </label>
          <select
            id="job_role"
            name="job_role"
            className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">— Aucun —</option>
            <option value="hr">RH</option>
            <option value="developer">Développeur</option>
            <option value="manager">Manager</option>
            <option value="finance">Finance</option>
          </select>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors disabled:opacity-50"
          >
            {loading ? "Création…" : "Créer le compte"}
          </button>
          <Link
            href="/admin/users"
            className="flex-1 rounded-xl border border-surface-warm py-2.5 text-center text-sm font-semibold text-ink hover:bg-surface transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
