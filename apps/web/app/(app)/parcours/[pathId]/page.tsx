// Refs: SPEC.md §8, US-1.2 progression visible sur parcours
import { notFound } from "next/navigation";
import { getApiClient, getUserId } from "../../../../lib/api";

export default async function PathDetailPage({
  params,
}: {
  readonly params: Promise<{ pathId: string }>;
}) {
  const { pathId } = await params;
  const [api, learnerId] = await Promise.all([getApiClient(), getUserId()]);

  const [path, modules, progress] = await Promise.all([
    api.learning.getPath(pathId).catch(() => null),
    api.learning.listModules().catch(() => [] as Awaited<ReturnType<typeof api.learning.listModules>>),
    learnerId
      ? api.learning.getProgress(learnerId).catch(() => ({} as Record<string, number>))
      : Promise.resolve({} as Record<string, number>),
  ]);

  if (!path) notFound();

  const pathModules = path.module_sequence
    .map((id) => modules.find((m) => m.id === id))
    .filter(Boolean) as Awaited<ReturnType<typeof api.learning.listModules>>;

  const completedCount = pathModules.filter((m) => (progress[m.id] ?? 0) === 100).length;
  const pathPct = pathModules.length > 0
    ? Math.round(pathModules.reduce((acc, m) => acc + (progress[m.id] ?? 0), 0) / pathModules.length)
    : 0;

  return (
    <section aria-labelledby="path-title">
      {/* Header */}
      <div className="mb-8">
        <a href="/parcours" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-primary transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Mes parcours
        </a>
        <h1 id="path-title" className="text-2xl font-bold text-primary-deep leading-snug">
          {path.title_fr}
        </h1>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <p className="text-sm text-ink-soft">
            {completedCount}/{pathModules.length} module{pathModules.length > 1 ? "s" : ""} terminé{completedCount > 1 ? "s" : ""}
          </p>
          {path.is_mandatory && (
            <span className="rounded-full bg-accent-bright px-2.5 py-0.5 text-xs font-semibold text-primary-deep">
              Obligatoire
            </span>
          )}
        </div>

        {/* Barre de progression globale du parcours */}
        {pathModules.length > 0 && (
          <div className="mt-4 max-w-sm">
            <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft">
              <span>Progression globale</span>
              <span className={`font-bold ${pathPct === 100 ? "text-green-700" : "text-primary"}`}>{pathPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-warm">
              <div
                className={`h-full rounded-full transition-all ${pathPct === 100 ? "bg-green-500" : "bg-primary"}`}
                style={{ width: `${pathPct}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        )}
      </div>

      {/* Liste des modules */}
      <ol className="space-y-4">
        {pathModules.map((mod, index) => {
          const pct = progress[mod.id] ?? 0;
          const done = pct === 100;
          const started = pct > 0 && pct < 100;

          return (
            <li key={mod.id}>
              <a
                href={`/parcours/${path.id}/${mod.id}`}
                className={`group flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                  done ? "border-green-200 hover:border-green-300" : "border-surface-warm hover:border-primary"
                }`}
              >
                {/* Indicateur d'état */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  done
                    ? "bg-green-100 text-green-700"
                    : started
                      ? "bg-primary/10 text-primary"
                      : "bg-primary text-white"
                }`}>
                  {done ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-label="Terminé">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Contenu */}
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold leading-snug transition-colors ${
                    done ? "text-green-700" : "text-primary-deep group-hover:text-primary"
                  }`}>
                    {mod.title_fr}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-ink-soft">
                    {mod.content_fr?.lessons?.length ? (
                      <span>{mod.content_fr.lessons.length} leçon{mod.content_fr.lessons.length > 1 ? "s" : ""}</span>
                    ) : null}
                    {mod.content_fr?.estimated_duration_minutes ? (
                      <span>~{mod.content_fr.estimated_duration_minutes} min</span>
                    ) : null}
                  </div>

                  {/* Barre de progression du module */}
                  {started && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 max-w-xs overflow-hidden rounded-full bg-surface-warm">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} aria-hidden="true" />
                      </div>
                      <span className="text-xs font-medium text-primary tabular-nums">{pct}%</span>
                    </div>
                  )}
                </div>

                {/* Badge statut + flèche */}
                <div className="shrink-0 flex flex-col items-end gap-2 self-center">
                  {done ? (
                    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      Terminé
                    </span>
                  ) : started ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      En cours
                    </span>
                  ) : null}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted group-hover:text-primary transition-colors" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
