"use client";
// Refs: SPEC.md §7 — édition, désactivation, reset mot de passe d'un compte utilisateur
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserDto } from "@elearning/api-client";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  trainer: "Formateur",
  manager: "Manager",
  learner: "Apprenant",
};

interface Props {
  readonly user: UserDto;
}

export function EditUserForm({ user }: Props) {
  const router = useRouter();

  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateError(null);

    const data = new FormData(e.currentTarget);
    const body = {
      display_name: data.get("display_name") as string,
      platform_role: data.get("platform_role") as string,
      is_active: data.get("is_active") === "true",
      job_role: (data.get("job_role") as string) || null,
    };

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 403) {
        const json = await res.json().catch(() => ({}));
        setUpdateError(json.message ?? "Action non autorisée.");
        return;
      }
      if (!res.ok) {
        setUpdateError("Une erreur est survenue lors de la mise à jour.");
        return;
      }

      router.push("/admin/users");
      router.refresh();
    } catch {
      setUpdateError("Impossible de joindre le serveur.");
    } finally {
      setUpdateLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });

      if (res.status === 403) {
        const json = await res.json().catch(() => ({}));
        setDeleteError(json.message ?? "Action non autorisée.");
        setDeleteConfirm(false);
        return;
      }
      if (!res.ok) {
        setDeleteError("Erreur lors de la suppression.");
        setDeleteConfirm(false);
        return;
      }

      router.push("/admin/users");
      router.refresh();
    } catch {
      setDeleteError("Impossible de joindre le serveur.");
      setDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(false);

    try {
      const res = await fetch(`/api/users/${user.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });

      if (!res.ok) {
        setResetError("Erreur lors du reset du mot de passe.");
        return;
      }

      setResetPassword("");
      setResetSuccess(true);
    } catch {
      setResetError("Impossible de joindre le serveur.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      {/* En-tête */}
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
          <h1 className="text-2xl font-extrabold text-primary-deep">{user.display_name ?? user.email}</h1>
          <p className="text-sm text-ink-soft">
            {ROLE_LABELS[user.platform_role] ?? user.platform_role} · {user.is_active ? "Actif" : "Désactivé"}
          </p>
        </div>
      </div>

      {/* Formulaire principal */}
      <form onSubmit={handleUpdate} className="rounded-2xl border border-surface-warm bg-white p-8 space-y-5">
        <div>
          <label htmlFor="display_name" className="mb-1.5 block text-sm font-medium text-ink">
            Nom complet
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            defaultValue={user.display_name ?? ""}
            className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
          <p className="rounded-xl border border-surface-warm bg-surface px-4 py-2.5 text-sm text-ink-soft">
            {user.email}
          </p>
        </div>

        <div>
          <label htmlFor="platform_role" className="mb-1.5 block text-sm font-medium text-ink">
            Rôle plateforme
          </label>
          <select
            id="platform_role"
            name="platform_role"
            defaultValue={user.platform_role}
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
            defaultValue={user.job_role ?? ""}
            className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">— Aucun —</option>
            <option value="hr">RH</option>
            <option value="developer">Développeur</option>
            <option value="manager">Manager</option>
            <option value="finance">Finance</option>
          </select>
        </div>

        <div>
          <label htmlFor="is_active" className="mb-1.5 block text-sm font-medium text-ink">
            Statut du compte
          </label>
          <select
            id="is_active"
            name="is_active"
            defaultValue={user.is_active ? "true" : "false"}
            className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="true">Actif</option>
            <option value="false">Désactivé</option>
          </select>
        </div>

        {updateError && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {updateError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={updateLoading}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors disabled:opacity-50"
          >
            {updateLoading ? "Enregistrement…" : "Enregistrer"}
          </button>
          <Link
            href="/admin/users"
            className="flex-1 rounded-xl border border-surface-warm py-2.5 text-center text-sm font-semibold text-ink hover:bg-surface transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>

      {/* Reset mot de passe */}
      <form onSubmit={handleResetPassword} className="rounded-2xl border border-surface-warm bg-white p-6 space-y-4">
        <h2 className="text-sm font-bold text-ink">Réinitialiser le mot de passe</h2>
        <div>
          <label htmlFor="new_password" className="mb-1.5 block text-sm font-medium text-ink">
            Nouveau mot de passe provisoire
          </label>
          <input
            id="new_password"
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            minLength={8}
            required
            placeholder="Minimum 8 caractères"
            className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {resetError && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {resetError}
          </p>
        )}
        {resetSuccess && (
          <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 ring-1 ring-green-200">
            Mot de passe mis à jour.
          </p>
        )}

        <button
          type="submit"
          disabled={resetLoading || resetPassword.length < 8}
          className="rounded-xl border border-surface-warm px-4 py-2 text-sm font-semibold text-ink hover:bg-surface transition-colors disabled:opacity-50"
        >
          {resetLoading ? "Mise à jour…" : "Définir le mot de passe"}
        </button>
      </form>

      {/* Zone danger */}
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 space-y-4">
        <div>
          <h2 className="mb-1 text-sm font-bold text-red-700">Zone dangereuse</h2>
          <p className="text-xs text-red-600">
            La suppression est irréversible. Préférez désactiver le compte si possible.
          </p>
        </div>

        {deleteError && (
          <p role="alert" className="rounded-xl bg-white px-4 py-3 text-sm text-red-700 ring-1 ring-red-300">
            {deleteError}
          </p>
        )}

        {!deleteConfirm ? (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
          >
            Supprimer le compte
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-red-700">
              Confirmer la suppression de <strong>{user.display_name ?? user.email}</strong> ?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? "Suppression…" : "Oui, supprimer"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="rounded-xl border border-surface-warm bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-surface transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
