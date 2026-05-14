// Refs: SPEC.md §8 view.learner_modules — catalogue de modules avec filtres
import { redirect } from "next/navigation";
import { fr } from "@elearning/i18n";
import { getApiClient, getPermissions, getUserId } from "../../../../lib/api";
import { can } from "../../../../lib/permissions";
import { ModuleCatalogueFilter } from "./ModuleCatalogueFilter";

export default async function ModuleCataloguePage() {
  const t = fr;
  const [api, learnerId, permissions] = await Promise.all([getApiClient(), getUserId(), getPermissions()]);
  if (!can(permissions, "view.learner_modules")) redirect("/dashboard");

  const [modules, competences, progress] = await Promise.all([
    api.learning.listModules().catch(() => [] as Awaited<ReturnType<typeof api.learning.listModules>>),
    api.competence.list().catch(() => [] as Awaited<ReturnType<typeof api.competence.list>>),
    learnerId
      ? api.learning.getProgress(learnerId).catch(() => ({} as Record<string, number>))
      : Promise.resolve({} as Record<string, number>),
  ]);

  const published = modules.filter((m) => m.status === "published");

  return (
    <section aria-labelledby="catalogue-title">
      <div className="mb-8">
        <h1 id="catalogue-title" className="text-2xl font-bold text-primary-deep">
          {t.modules.catalogueTitle}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {published.length} module{published.length > 1 ? "s" : ""} disponible{published.length > 1 ? "s" : ""}
        </p>
      </div>

      {published.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-surface-warm bg-white py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v17H6.5A2.5 2.5 0 0 1 4 19.5z"/>
            </svg>
          </div>
          <p className="font-medium text-ink">Aucun module disponible</p>
          <p className="mt-1 text-sm text-ink-soft">Les modules seront disponibles après publication</p>
        </div>
      ) : (
        <ModuleCatalogueFilter modules={published} competences={competences} progress={progress} />
      )}
    </section>
  );
}
