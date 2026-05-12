// Refs: SPEC.md §8, US-1.2 parcours obligatoires
import { fr } from "@elearning/i18n";
import { getApiClient, getUserId } from "../../../lib/api";

const roleColors: Record<string, string> = {
  hr: "bg-purple-50 text-purple-700",
  developer: "bg-blue-50 text-blue-700",
  manager: "bg-amber-50 text-amber-700",
  finance: "bg-emerald-50 text-emerald-700",
  all: "bg-accent-soft text-primary",
};

const roleLabel: Record<string, string> = {
  hr: "RH",
  developer: "Développeur",
  manager: "Manager",
  finance: "Finance",
  all: "Tous les rôles",
};

export default async function ParcoursPage() {
  const t = fr;
  const [api, learnerId] = await Promise.all([getApiClient(), getUserId()]);

  const [paths, progress] = await Promise.all([
    api.learning.listPaths().catch(() => [] as Awaited<ReturnType<typeof api.learning.listPaths>>),
    learnerId
      ? api.learning.getProgress(learnerId).catch(() => ({} as Record<string, number>))
      : Promise.resolve({} as Record<string, number>),
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
        <ul className="grid gap-5 sm:grid-cols-2">
          {paths.map((path) => {
            const moduleProgresses = path.module_sequence.map((id) => progress[id] ?? 0);
            const pathPct = moduleProgresses.length > 0
              ? Math.round(moduleProgresses.reduce((a, b) => a + b, 0) / moduleProgresses.length)
              : 0;
            const completedCount = moduleProgresses.filter((p) => p === 100).length;

            return (
              <li key={path.id}>
                <article
                  aria-labelledby={`path-${path.id}`}
                  className="group flex flex-col rounded-xl border border-surface-warm bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {path.is_mandatory && (
                        <span className="rounded-full bg-accent-bright px-2.5 py-0.5 text-xs font-semibold text-primary-deep">
                          {t.paths.mandatory}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[path.target_role] ?? roleColors.all}`}>
                        {roleLabel[path.target_role] ?? path.target_role}
                      </span>
                    </div>
                  </div>

                  <h2 id={`path-${path.id}`} className="mb-2 font-semibold text-primary-deep leading-snug">
                    {path.title_fr}
                  </h2>

                  <p className="mb-5 text-sm text-ink-soft">
                    {completedCount}/{path.module_sequence.length} module{path.module_sequence.length > 1 ? "s" : ""} terminé{completedCount > 1 ? "s" : ""}
                  </p>

                  {/* Barre de progression réelle */}
                  <div className="mb-5">
                    <div className="mb-1.5 flex justify-between text-xs text-ink-soft">
                      <span>Progression</span>
                      <span className={`font-medium ${pathPct === 100 ? "text-green-700" : "text-primary"}`}>{pathPct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-warm">
                      <progress
                        value={pathPct}
                        max={100}
                        className="sr-only"
                        aria-label={`Progression ${pathPct}%`}
                      />
                      <div
                        className={`h-full rounded-full transition-all ${pathPct === 100 ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${pathPct}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {(() => {
                      let ctaLabel: string = t.paths.start;
                      if (pathPct === 100) ctaLabel = "Revoir";
                      else if (pathPct > 0) ctaLabel = "Continuer";
                      return (
                        <div className="mt-auto">
                          <a
                            href={`/parcours/${path.id}`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2"
                          >
                            {ctaLabel}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                          </a>
                        </div>
                      );
                    })()}

                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
