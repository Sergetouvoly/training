// Refs: SPEC.md §7, US-2a.5 — résultats agrégés anonymisés manager
import { redirect } from "next/navigation";
import Link from "next/link";
import { getApiClient, getPermissions } from "../../../lib/api";
import { canAccessManagerSpace } from "../../../lib/permissions";
import { TeamValidationChart, StampsStateChart } from "../admin/AdminCharts";
import { TeamModuleTable } from "./TeamModuleTable";
import type { TeamAggregate } from "@elearning/api-client";


const JOB_LABELS: Record<string, string> = {
  hr: "RH", developer: "Développeur", manager: "Manager", finance: "Finance",
};

const ALERT_ZONE_STYLES: Record<TeamAggregate["alert_zone"], { badge: string; label: string }> = {
  green: { badge: "bg-green-50 text-green-700 ring-1 ring-green-200", label: "Conforme" },
  amber: { badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", label: "Attention" },
  red:   { badge: "bg-red-50 text-red-700 ring-1 ring-red-200",       label: "Critique" },
};

export default async function ManagerPage() {
  const permissions = await getPermissions();
  if (!canAccessManagerSpace(permissions)) redirect("/dashboard");

  const api = await getApiClient();

  // Récupère le team_id du manager depuis son propre profil
  const me = await api.user.getMe().catch(() => null);
  const myTeamId = me?.team_id ?? null;

  const [learners, assignments, teamModuleProgress, allModules] = await Promise.all([
    api.user.listLearners(myTeamId ? { team_id: myTeamId } : undefined)
      .catch(() => [] as Awaited<ReturnType<typeof api.user.listLearners>>),
    api.assignment.list().catch(() => [] as Awaited<ReturnType<typeof api.assignment.list>>),
    myTeamId
      ? api.simulator.getTeamModuleProgress(myTeamId).catch(() => [])
      : Promise.resolve([]),
    api.learning.listModules().catch(() => [] as Awaited<ReturnType<typeof api.learning.listModules>>),
  ]);

  // Métriques agrégées anonymisées (US-2a.5) — uniquement si équipe connue
  const teamAggregate: TeamAggregate | null = myTeamId
    ? await api.simulator.getTeamAnalytics(myTeamId).catch(() => null)
    : null;

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
  const coveragePercent = teamAggregate ? Math.round(teamAggregate.coverage_ratio * 100) : null;

  const teamForChart = learners.filter((l) => l.stamp_count > 0).slice(0, 10);
  const teamLabels = teamForChart.map((l) => l.display_name.split(" ")[0]!);
  const teamValues = teamForChart.map((l) => Math.round((l.green_count / l.stamp_count) * 100));

  const alertStyle = teamAggregate ? ALERT_ZONE_STYLES[teamAggregate.alert_zone] : null;

  const kpis = [
    {
      label: "Membres",
      value: total,
      sub: `${withStamps} avec des compétences`,
      accent: "text-primary-deep",
    },
    {
      label: "À risque",
      value: atRisk.length,
      sub: "stamps expirés",
      accent: atRisk.length > 0 ? "text-red-600" : "text-green-600",
    },
    {
      label: "Couverture équipe",
      value: coveragePercent !== null ? `${coveragePercent}%` : `${validationRate}%`,
      sub: coveragePercent !== null ? "membres avec stamp vert actif" : "stamps verts / total",
      accent: (coveragePercent ?? validationRate) >= 70
        ? "text-green-600"
        : (coveragePercent ?? validationRate) >= 40
          ? "text-amber-600"
          : "text-red-600",
    },
    {
      label: "Moy. stamps",
      value: avgStamps,
      sub: `${avgGreen} validés en moyenne`,
      accent: "text-primary-deep",
    },
  ];

  return (
    <div className="space-y-8">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-deep">Espace manager</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {myTeamId
              ? <>Équipe <span className="font-semibold text-ink">{myTeamId}</span> — progression et compétences</>
              : "Progression et état des compétences de tous les apprenants"
            }
          </p>
        </div>
        {alertStyle && (
          <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${alertStyle.badge}`}>
            {alertStyle.label}
          </span>
        )}
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

      {/* ── Métriques agrégées (si team_id connu) ── */}
      {teamAggregate && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: "Taux de fraîcheur",
              value: `${Math.round(teamAggregate.freshness_ratio * 100)}%`,
              sub: "stamps non expirés",
            },
            {
              label: "Stamps verts",
              value: `${Math.round(teamAggregate.green_ratio * 100)}%`,
              sub: "du total équipe",
            },
            {
              label: "Stamps orange",
              value: `${Math.round(teamAggregate.orange_ratio * 100)}%`,
              sub: "à renouveler",
            },
            {
              label: "Stamps rouges",
              value: `${Math.round(teamAggregate.red_ratio * 100)}%`,
              sub: "expirés ou critiques",
            },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-surface-warm bg-white px-5 py-4">
              <p className="text-2xl font-bold tabular-nums text-primary-deep">{m.value}</p>
              <p className="mt-0.5 text-xs font-semibold text-ink">{m.label}</p>
              <p className="text-[11px] text-ink-soft">{m.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Graphiques ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-surface-warm bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-primary-deep">Taux de validation par membre</h2>
            <Link href="/manager/learners" className="text-xs font-medium text-primary hover:text-primary-deep">
              Voir équipe →
            </Link>
          </div>
          {teamForChart.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-sm text-ink-soft">
              Aucun membre avec des stamps
            </div>
          ) : (
            <div className="h-52">
              <TeamValidationChart labels={teamLabels} values={teamValues} />
            </div>
          )}
        </div>

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
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
              {atRisk.length}
            </span>
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
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-red-600">
                          {l.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-ink">{l.display_name}</p>
                          <p className="text-xs text-ink-soft">{l.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-ink-soft hidden sm:table-cell">
                      {JOB_LABELS[l.primary_role] ?? l.primary_role}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                        {l.red_count} expiré{l.red_count > 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/manager/learners/${l.id}`}
                        className="rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface hover:border-primary/30 transition-colors"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <TeamModuleTable
        learners={learners}
        assignments={assignments}
        teamModuleProgress={teamModuleProgress}
        modules={allModules}
      />
    </div>
  );
}
