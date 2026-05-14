"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TrashListDto, TrashType } from "@elearning/api-client";

const TYPE_LABELS: Record<TrashType, string> = {
  module: "Module",
  learning_path: "Parcours",
  evaluation_item: "Question",
  competence: "Compétence",
};

function itemLabel(item: Record<string, unknown>): string {
  return (item["title_fr"] ?? item["label_fr"] ?? item["id"]) as string;
}

interface TrashRowProps {
  type: TrashType;
  item: Record<string, unknown>;
  canRestore: boolean;
  canPurge: boolean;
}

function TrashRow({ type, item, canRestore, canPurge }: TrashRowProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"restore" | "purge" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = item["id"] as string;
  const deletedAt = item["deleted_at"] as string;

  async function doRestore() {
    setLoading("restore");
    setError(null);
    try {
      const res = await fetch(`/api/trash/${type}/${id}`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as any).error ?? "Erreur lors de la restauration.");
        return;
      }
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur.");
    } finally {
      setLoading(null);
    }
  }

  async function doPurge() {
    setLoading("purge");
    setError(null);
    try {
      const res = await fetch(`/api/trash/${type}/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        setError((json as any).error ?? "Erreur lors de la suppression.");
        return;
      }
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-surface-warm bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <span className="inline-block rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-ink-soft mr-2">
          {TYPE_LABELS[type]}
        </span>
        <span className="text-sm font-medium text-ink">{itemLabel(item)}</span>
        <span className="ml-3 text-xs text-ink-soft/70">
          Supprimé le {new Date(deletedAt).toLocaleDateString("fr-FR")}
        </span>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        {canRestore && (
          <button
            type="button"
            disabled={loading !== null}
            onClick={doRestore}
            className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
          >
            {loading === "restore" ? "…" : "Restaurer"}
          </button>
        )}
        {canPurge && (
          <button
            type="button"
            disabled={loading !== null}
            onClick={doPurge}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
          >
            {loading === "purge" ? "…" : "Supprimer"}
          </button>
        )}
      </div>
    </li>
  );
}

interface Props {
  readonly data: TrashListDto;
  readonly canRestore: boolean;
  readonly canPurge: boolean;
}

export function TrashPanel({ data, canRestore, canPurge }: Props) {
  const router = useRouter();
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  const allItems: { type: TrashType; item: Record<string, unknown> }[] = [
    ...data.modules.map((m) => ({ type: "module" as const, item: m as Record<string, unknown> })),
    ...data.learning_paths.map((p) => ({ type: "learning_path" as const, item: p as Record<string, unknown> })),
    ...data.evaluation_items.map((i) => ({ type: "evaluation_item" as const, item: i as Record<string, unknown> })),
    ...data.competences.map((c) => ({ type: "competence" as const, item: c as Record<string, unknown> })),
  ].sort((a, b) =>
    new Date(b.item["deleted_at"] as string).getTime() - new Date(a.item["deleted_at"] as string).getTime()
  );

  async function purgeExpired() {
    setPurging(true);
    setPurgeResult(null);
    try {
      const res = await fetch("/api/trash", { method: "DELETE" });
      if (res.ok) {
        const json = await res.json();
        setPurgeResult(`${json.purged} élément(s) supprimé(s) définitivement (rétention : ${json.retention_days} jours).`);
        router.refresh();
      }
    } finally {
      setPurging(false);
    }
  }

  return (
    <div className="space-y-4">
      {canPurge && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={purging}
            onClick={purgeExpired}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
          >
            {purging ? "Nettoyage…" : "Vider les éléments expirés"}
          </button>
          {purgeResult && <p className="text-sm text-ink-soft">{purgeResult}</p>}
        </div>
      )}

      {allItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-warm bg-surface p-16 text-center">
          <p className="text-ink-soft">La corbeille est vide.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {allItems.map(({ type, item }) => (
            <TrashRow
              key={`${type}-${item["id"]}`}
              type={type}
              item={item}
              canRestore={canRestore}
              canPurge={canPurge}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
