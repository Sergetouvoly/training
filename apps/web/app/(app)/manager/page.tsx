// Refs: SPEC.md §7 — espace manager : vue équipe + progression agrégée
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "../../../auth";
import { getApiClient } from "../../../lib/api";
import { TeamValidationChart, StampsStateChart } from "../admin/AdminCharts";

const MANAGER_ROLES = new Set(["super_admin", "admin", "manager"]);

const JOB_LABELS: Record<string, string> = {
  hr: "RH", developer: "Développeur", manager: "Manager", finance: "Finance",
};

export default async function ManagerPage() {
  const session = await auth();
  const platformRole = (session as any)?.platformRole as string ?? "learner";
  if (!MANAGER_ROLES.has(platformRole)) redirect("/dashboard");

  const api = await getApiClient();
  const learners = await api.user.listLearners().catch(() => [] as Awaited<ReturnType<typeof api.user.listLearners>>);

  const total = learners.length;
  const atRisk = learners.filter((l) => l.red_count > 0);
  const withStamps = learners.filter((l) => l.stamp_count > 0).length;
  const totalStamps = learners.reduce((a, l) => a + l.stamp_count, 0);
  const greenStamps = learners.reduce((a, l) => a + l.green_count, 0);
  const orangeStamps = learners.reduce((a, l) => a + l.orange_count, 0);
  const redStamps = learners.reduce((a, l) => a + l.red_count, 0);

  const avgStamps = total > 0 ? Math.round(totalStamps / total) : 0;
  const avgGreen = total > 0 ? Math.round(greenStamps / total) : 0;
  const validationRate = avgStamps > 0 ? Math.round((avgGreen / avgStamps) * 100) : 0;

  // Données graphique taux de validation par membre (top 10)
  const teamForChart = learners
    .filter((l) => l.stamp_count > 0)
    .slice(0, 10);
  const teamLabels = teamForChart.map((l) => l.display_name.split(" ")[0]);
  const teamValues = teamForChart.map((l) =>
    Math.round((l.green_count / l.stamp_count) * 100)
  );

  const kpis = [
    { label: "Membres",          value: total,          sub: `${withStamps} avec des compétences`, accent: "text-primary-deep" },
    { label: "À risque",         value: atRisk.length,  sub: "stamps expirés",                     accent: atRisk.length > 0 ? "text-red-600" : "text-green-600" },
    { label: "Taux de validation", value: `${validationRate}%`, sub: "stamps verts / total",       accent: validationRate >= 70 ? "text-green-600" : validationRate >= 40 ? "text-amber-600" : "text-red-600" },
    { label: "Moy. stamps",      value: avgStamps,      sub: `${avgGreen} validés en moyenne`,     accent: "text-primary-deep" },
  ];

  return (
    <div className="space-y-8">

      {/* ── En-tête ── */}
      <div>
        <h1 className="text-3xl font-extrabold text-primary-deep">Espace manager</h1>
        <p className="mt-1 text-sm text-ink-soft">Progression et état des compétences de votre équipe</p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-surface-warm bg-white p-6">
            <p className={`text-3xl font-extrabold tabular-nums ${k.accent}`}>{k.value}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{k.label}</p>
            <p className="text-xs text-ink-soft mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Graphiques ── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Taux de validation par membre */}
        <div className="rounded-2xl border border-surface-warm bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-primary-deep">Taux de validation par membre</h2>
            <Link href="/manager/learners" className="text-xs font-medium text-primary hover:text-primary-deep">Voir équipe →</Link>
          </div>
          {teamForChart.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-sm text-ink-soft">Aucun membre avec des stamps</div>
          ) : (
            <div className="h-52">
              <TeamValidationChart labels={teamLabels} values={teamValues} />
            </div>
          )}
        </div>

        {/* État des stamps */}
        <div className="rounded-2xl border border-surface-warm bg-white p-6">
          <h2 className="text-sm font-bold text-primary-deep mb-4">État global des compétences</h2>
          <div className="h-52">
            <StampsStateChart green={greenStamps} orange={orangeStamps} red={redStamps} />
          </div>
        </div>
      </div>

      {/* ── Alertes ── */}
      {atRisk.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-bold text-primary-deep flex items-center gap-2">
            Alertes compétences
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">{atRisk.length}</span>
          </h2>
          <div className="rounded-2xl border border-red-100 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-warm bg-red-50/40">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft">Membre</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft hidden sm:table-cell">Rôle</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft">Stamps expirés</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-ink-soft">Profil</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((l) => (
                  <tr key={l.id} className="border-b border-surface-warm last:border-0 hover:bg-surface/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-red-600">{l.display_name.charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="font-medium text-ink">{l.display_name}</p>
                          <p className="text-xs text-ink-soft">{l.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-ink-soft hidden sm:table-cell">{JOB_LABELS[l.primary_role] ?? l.primary_role}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                        {l.red_count} expiré{l.red_count > 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/manager/learners/${l.id}`} className="rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface hover:border-primary/30 transition-colors">Voir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Équipe complète ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-primary-deep">Toute l'équipe</h2>
          <Link href="/manager/learners" className="text-sm font-medium text-primary hover:text-primary-deep">Voir détail →</Link>
        </div>
        <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-warm bg-surface">
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft">Membre</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft hidden sm:table-cell">Rôle</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft hidden md:table-cell">Compétences</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-ink-soft">Profil</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((l) => (
                <tr key={l.id} className="border-b border-surface-warm last:border-0 hover:bg-surface/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${l.red_count > 0 ? "bg-red-50 text-red-600" : "bg-primary/10 text-primary"}`}>
                        {l.display_name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium text-ink">{l.display_name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-ink-soft hidden sm:table-cell">{JOB_LABELS[l.primary_role] ?? l.primary_role}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    {l.stamp_count === 0 ? (
                      <span className="text-xs text-ink-soft">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-ink tabular-nums">{l.green_count}</span>
                        <span className="text-xs text-ink-soft">/ {l.stamp_count}</span>
                        <div className="ml-1 h-1.5 w-16 overflow-hidden rounded-full bg-surface-warm">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((l.green_count / l.stamp_count) * 100)}%` }} aria-hidden="true" />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/manager/learners/${l.id}`} className="rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface hover:border-primary/30 transition-colors">Voir</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
