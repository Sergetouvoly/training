// Refs: SPEC.md §8, US-1.2 parcours obligatoires
import { redirect } from "next/navigation";
import { fr } from "@elearning/i18n";
import { getApiClient, getPermissions, getUserId } from "../../../lib/api";
import { can } from "../../../lib/permissions";
import { ParcoursFilter } from "./ParcoursFilter";

export default async function ParcoursPage() {
  const t = fr;
  const [api, learnerId, permissions] = await Promise.all([getApiClient(), getUserId(), getPermissions()]);
  if (!can(permissions, "view.learner_parcours")) redirect("/dashboard");

  const [paths, progress, assignments] = await Promise.all([
    api.learning.listPaths().catch(() => [] as Awaited<ReturnType<typeof api.learning.listPaths>>),
    learnerId
      ? api.learning.getProgress(learnerId).catch(() => ({} as Record<string, number>))
      : Promise.resolve({} as Record<string, number>),
    learnerId
      ? api.assignment.listForAssignee(learnerId).catch(() => [] as Awaited<ReturnType<typeof api.assignment.listForAssignee>>)
      : Promise.resolve([] as Awaited<ReturnType<typeof api.assignment.listForAssignee>>),
  ]);

  return (
    <section aria-labelledby="parcours-title">
      <div className="mb-8">
        <h1 id="parcours-title" className="text-2xl font-bold text-primary-deep">
          {t.paths.title}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {paths.length} parcours disponible{paths.length > 1 ? "s" : ""}
        </p>
      </div>

      {paths.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-surface-warm bg-white py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted" aria-hidden="true">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <p className="font-medium text-ink">Aucun parcours assigné</p>
          <p className="mt-1 text-sm text-ink-soft">Contactez votre administrateur</p>
        </div>
      ) : (
        <ParcoursFilter paths={paths} progress={progress} assignments={assignments} />
      )}
    </section>
  );
}
