// Refs: SPEC.md §7, docs/BACKLOG.md §2b — espace formateur : modules + suivi.
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "../../../auth";
import { getApiClient } from "../../../lib/api";
import { canAccessTrainerSpace } from "../../../lib/permissions";
import { LessonsPerModuleChart, StampsStateChart } from "../admin/AdminCharts";

export default async function TrainerPage() {
  const session = await auth();
  const platformRole = (session as any)?.platformRole as string ?? "learner";
  if (!canAccessTrainerSpace(platformRole)) redirect("/dashboard");

  const api = await getApiClient();
  const [modules, learners] = await Promise.all([
    api.learning.listModules().catch(() => [] as Awaited<ReturnType<typeof api.learning.listModules>>),
    api.user.listLearners().catch(() => [] as Awaited<ReturnType<typeof api.user.listLearners>>),
  ]);

  const publishedModules = modules.filter((m) => m.content_fr !== null);
  const draftModules = modules.filter((m) => m.content_fr === null);
  const atRisk = learners.filter((l) => l.red_count > 0);
  const activelearners = learners.filter((l) => l.stamp_count > 0);
  const totalLessons = modules.reduce((a, m) => a + (m.content_fr?.lessons?.length ?? 0), 0);

  const totalStamps = learners.reduce((a, l) => a + l.stamp_count, 0);
  const greenStamps = learners.reduce((a, l) => a + l.green_count, 0);
  const orangeStamps = learners.reduce((a, l) => a + l.orange_count, 0);
  const redStamps = learners.reduce((a, l) => a + l.red_count, 0);

  // Données graphique leçons par module (top 8)
  const topModules = modules
    .filter((m) => (m.content_fr?.lessons?.length ?? 0) > 0)
    .slice(0, 8);
  const lessonsLabels = topModules.map((m) => m.title_fr.length > 18 ? m.title_fr.slice(0, 18) + "…" : m.title_fr);
  const lessonsValues = topModules.map((m) => m.content_fr?.lessons?.length ?? 0);

  const kpis = [
    { label: "Modules", value: modules.length, sub: `${publishedModules.length} publiés · ${draftModules.length} brouillons`, href: "/admin/modules", accent: "text-primary-deep" },
    { label: "Leçons créées", value: totalLessons, sub: "dans tous les modules", href: "/admin/modules", accent: "text-primary-deep" },
    { label: "Apprenants", value: learners.length, sub: `${activelearners.length} actifs`, href: "/trainer/learners", accent: "text-primary-deep" },
    { label: "À risque", value: atRisk.length, sub: "stamps expirés", href: "/trainer/learners", accent: atRisk.length > 0 ? "text-red-600" : "text-green-600" },
  ];

  return (
    <div className="space-y-8">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-deep">Espace formateur</h1>
          <p className="mt-1 text-sm text-ink-soft">Gérez vos modules et suivez la progression de vos apprenants</p>
        </div>
        <Link href="/admin/modules/new" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors shadow-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau module
        </Link>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}
            className="rounded-2xl border border-surface-warm bg-white p-6 hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <p className={`text-3xl font-extrabold tabular-nums ${k.accent}`}>{k.value}</p>
            <p className="mt-1 text-sm font-semibold text-ink group-hover:text-primary transition-colors">{k.label}</p>
            <p className="text-xs text-ink-soft mt-0.5">{k.sub}</p>
          </Link>
        ))}
      </div>

      {/* ── Graphiques ── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Leçons par module */}
        <div className="rounded-2xl border border-surface-warm bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-primary-deep">Leçons par module</h2>
            <Link href="/admin/modules" className="text-xs font-medium text-primary hover:text-primary-deep">Gérer →</Link>
          </div>
          {topModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <p className="text-sm text-ink-soft">Aucun module avec du contenu</p>
              <Link href="/admin/modules/new" className="mt-3 text-sm font-medium text-primary hover:text-primary-deep">Créer un module →</Link>
            </div>
          ) : (
            <div className="h-52">
              <LessonsPerModuleChart labels={lessonsLabels} values={lessonsValues} />
            </div>
          )}
        </div>

        {/* État des compétences */}
        <div className="rounded-2xl border border-surface-warm bg-white p-6">
          <h2 className="text-sm font-bold text-primary-deep mb-4">État des compétences apprenants</h2>
          <div className="h-52">
            <StampsStateChart green={greenStamps} orange={orangeStamps} red={redStamps} />
          </div>
        </div>
      </div>

      {/* ── Modules récents ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-primary-deep">Mes modules</h2>
          <Link href="/admin/modules" className="text-sm font-medium text-primary hover:text-primary-deep">Voir tout →</Link>
        </div>
        {modules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-warm bg-surface p-12 text-center">
            <p className="text-ink-soft mb-4">Aucun module créé.</p>
            <Link href="/admin/modules/new" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors">Créer un module</Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.slice(0, 6).map((mod) => (
              <Link key={mod.id} href={`/admin/modules/${mod.id}`}
                className="group rounded-xl border border-surface-warm bg-white p-5 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink group-hover:text-primary transition-colors text-sm leading-snug">{mod.title_fr}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${mod.content_fr ? "bg-green-50 text-green-700" : "bg-surface text-ink-soft"}`}>
                    {mod.content_fr ? "Publié" : "Brouillon"}
                  </span>
                </div>
                <p className="text-xs text-ink-soft">
                  {mod.content_fr?.lessons?.length ?? 0} leçon{(mod.content_fr?.lessons?.length ?? 0) !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Apprenants à risque ── */}
      {atRisk.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-primary-deep flex items-center gap-2">
              Apprenants à risque
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">{atRisk.length}</span>
            </h2>
            <Link href="/trainer/learners" className="text-sm font-medium text-primary hover:text-primary-deep">Voir tout →</Link>
          </div>
          <div className="rounded-2xl border border-red-100 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-warm bg-red-50/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft">Apprenant</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft hidden sm:table-cell">Stamps</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-ink-soft">Profil</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.slice(0, 5).map((l) => (
                  <tr key={l.id} className="border-b border-surface-warm last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-red-600">{l.display_name.charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="font-medium text-ink">{l.display_name}</p>
                          <p className="text-xs text-ink-soft">{l.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                        {l.red_count} expiré{l.red_count > 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/trainer/learners/${l.id}`} className="rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface hover:border-primary/30 transition-colors">Voir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
