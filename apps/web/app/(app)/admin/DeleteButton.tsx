"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  readonly deleteUrl: string;
  readonly label?: string;
  readonly confirmMessage?: string;
  readonly redirectTo?: string;
}

export function DeleteButton({ deleteUrl, label = "Supprimer", confirmMessage = "Confirmer la suppression ?", redirectTo }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(deleteUrl, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Erreur lors de la suppression.");
        setConfirm(false);
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur.");
      setConfirm(false);
    } finally {
      setLoading(false);
    }
  }

  if (confirm) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {error && (
          <span className="mr-1 text-xs text-red-600">{error}</span>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {loading ? "…" : "Oui, supprimer"}
        </button>
        <button
          type="button"
          onClick={() => { setConfirm(false); setError(null); }}
          className="rounded-lg border border-surface-warm px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface transition-colors"
        >
          Annuler
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
    >
      {label}
    </button>
  );
}
