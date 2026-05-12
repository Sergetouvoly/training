// Refs: SPEC.md §7 — manager : détail d'un membre de l'équipe.
// La garde de rôle est assurée par le manager/layout.tsx.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getApiClient } from "../../../../../lib/api";

const STATE_CONFIG = {
  green:  { label: "Validé",   cls: "bg-green-50 text-green-700 border-green-200" },
  orange: { label: "À revoir", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  red:    { label: "Expiré",   cls: "bg-red-50 text-red-700 border-red-200" },
} as const;

export default async function ManagerLearnerDetailPage({
  params,
}: {
  readonly params: Promise<{ learnerId: string }>;
}) {
  const { learnerId } = await params;
  const api = await getApiClient();
  const [learner, modules] = await Promise.all([
    api.user.getLearnerDetail(learnerId).catch(() => null),
    api.learning.listModules().catch(() => [] as Awaited<ReturnType<typeof api.learning.listModules>>),
  ]);

  if (!learner) notFound();

  const moduleMap = Object.fromEntries(modules.map((m) => [m.id, m]));

  return (
    <div className="max-w-4xl space-y-8">
      <nav className="flex items-center gap-1.5 text-xs text-ink-soft" aria-label="Fil d'Ariane">
        <Link href="/manager" className="hover:text-primary transition-colors">Espace manager</Link>
        <span aria-hidden="true">›</span>
        <span className="text-ink">{learner.display_name}</span>
      </nav>

      <div className="flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-extrabold text-primary">
          {learner.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold text-primary-deep">{learner.display_name}</h1>
          <p className="text-sm text-ink-soft">{learner.email}</p>
          <p className="mt-2 text-xs text-ink-soft">
            Inscrit le {new Date(learner.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-extrabold text-primary-deep tabular-nums">{learner.stamp_count}</p>
          <p className="text-xs text-ink-soft">stamp{learner.stamp_count > 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-base font-bold text-primary-deep mb-4">Progression modules</h2>
          {learner.progress.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-warm bg-surface p-8 text-center text-sm text-ink-soft">
              Aucun module commencé
            </div>
          ) : (
            <div className="space-y-3">
              {learner.progress.map((p) => {
                const mod = moduleMap[p.module_id];
                return (
                  <div key={p.module_id} className="rounded-xl border border-surface-warm bg-white px-5 py-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-ink leading-snug">
                        {mod?.title_fr ?? p.module_id.slice(0, 16) + "…"}
                      </p>
                      <span className={`shrink-0 text-xs font-bold tabular-nums ${p.progress_percent === 100 ? "text-green-700" : "text-primary"}`}>
                        {p.progress_percent}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-warm">
                      <div
                        className={`h-full rounded-full transition-all ${p.progress_percent === 100 ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${p.progress_percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-base font-bold text-primary-deep mb-4">
            Passeport de compétences
            <span className="ml-2 text-sm font-normal text-ink-soft">({learner.stamp_count} stamp{learner.stamp_count > 1 ? "s" : ""})</span>
          </h2>
          {learner.stamps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-warm bg-surface p-8 text-center text-sm text-ink-soft">
              Aucun stamp obtenu
            </div>
          ) : (
            <div className="space-y-2.5">
              {learner.stamps.map((stamp) => {
                const cfg = STATE_CONFIG[stamp.state as keyof typeof STATE_CONFIG] ?? STATE_CONFIG.red;
                return (
                  <div key={stamp.id} className={`rounded-xl border px-5 py-4 ${cfg.cls}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{stamp.competence_label_fr}</p>
                        <p className="text-[11px] opacity-70 font-mono mt-0.5">{stamp.competence_code}</p>
                      </div>
                      <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                        {cfg.label}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-4 text-[11px] opacity-80">
                      <span>Score : <strong>{Math.round(stamp.performance_score)}%</strong></span>
                      <span>{stamp.attempts} tentative{stamp.attempts > 1 ? "s" : ""}</span>
                      <span>Expire le {new Date(stamp.expires_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
