// Refs: SPEC.md §7 — tableau de bord super_admin/admin
import { getApiClient, getPermissions } from "../../../lib/api";
import { can } from "../../../lib/permissions";
import Link from "next/link";
import {
  RolesChart, ModulesStatusChart, LearnersProgressChart,
  StampsStateChart, ActivityByRoleChart,
} from "./AdminCharts";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", admin: "Administrateur",
  trainer: "Formateur", manager: "Manager", learner: "Apprenant",
};
const ROLE_COLORS: Record<string, string> = {
  super_admin: "#153243", admin: "#1a6c7a",
  trainer: "#2563eb", manager: "#d97706", learner: "#16a34a",
};
const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700",
  admin: "bg-primary/10 text-primary",
  trainer: "bg-blue-50 text-blue-700",
  manager: "bg-amber-50 text-amber-700",
  learner: "bg-surface text-ink-soft",
};

export default async function AdminDashboardPage() {
  const [api, permissions] = await Promise.all([getApiClient(), getPermissions()]);
  const canReadConfig = can(permissions, "app_config.read");

  const [users, modules, paths, learners, competences, config] = await Promise.all([
    api.admin.listUsers().catch(() => [] as Awaited<ReturnType<typeof api.admin.listUsers>>),
    api.learning.listModules().catch(() => [] as Awaited<ReturnType<typeof api.learning.listModules>>),
    api.learning.listPaths().catch(() => [] as Awaited<ReturnType<typeof api.learning.listPaths>>),
    api.user.listLearners().catch(() => [] as Awaited<ReturnType<typeof api.user.listLearners>>),
    api.competence.list().catch(() => [] as Awaited<ReturnType<typeof api.competence.list>>),
    canReadConfig
      ? api.config.list().catch(() => [] as Awaited<ReturnType<typeof api.config.list>>)
      : Promise.resolve([] as Awaited<ReturnType<typeof api.config.list>>),
  ]);

  // Stats dérivées
  const publishedModules = modules.filter((m) => m.content_fr !== null).length;
  const draftModules = modules.length - publishedModules;
  const learnersAtRisk = learners.filter((l) => l.red_count > 0).length;
  const totalStamps = learners.reduce((a, l) => a + l.stamp_count, 0);
  const greenStamps = learners.reduce((a, l) => a + l.green_count, 0);
  const orangeStamps = learners.reduce((a, l) => a + l.orange_count, 0);
  const redStamps = learners.reduce((a, l) => a + l.red_count, 0);
  const mandatoryPaths = paths.filter((p) => p.is_mandatory).length;

  // Répartition utilisateurs par rôle (pour le donut)
  const roleCount = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.platform_role] = (acc[u.platform_role] ?? 0) + 1;
    return acc;
  }, {});
  const rolesChartData = Object.entries(roleCount).map(([role, count]) => ({
    label: ROLE_LABELS[role] ?? role,
    value: count,
    color: ROLE_COLORS[role] ?? "#87A8B9",
  }));

  // Activité par rôle — count
  const activityLabels = Object.keys(roleCount).map((r) => ROLE_LABELS[r] ?? r);
  const activityValues = Object.values(roleCount);

  // Leçons totales
  const totalLessons = modules.reduce((a, m) => a + (m.content_fr?.lessons?.length ?? 0), 0);

  const kpis = [
    { label: "Utilisateurs", value: users.length, sub: `${Object.keys(roleCount).length} rôles`, href: "/admin/users", accent: "text-primary-deep" },
    { label: "Apprenants",   value: learners.length, sub: learnersAtRisk > 0 ? `⚠ ${learnersAtRisk} à risque` : "Tous OK", href: "/admin/learners", accent: learnersAtRisk > 0 ? "text-red-600" : "text-green-600" },
    { label: "Modules",      value: modules.length, sub: `${publishedModules} publiés · ${draftModules} brouillons`, href: "/admin/modules", accent: "text-primary-deep" },
    { label: "Parcours",     value: paths.length, sub: `${mandatoryPaths} obligatoires`, href: "/admin/paths", accent: "text-primary-deep" },
    { label: "Compétences",  value: competences.length, sub: `${totalStamps} stamps émis`, href: "/admin/competences", accent: "text-primary-deep" },
    { label: "Leçons",       value: totalLessons, sub: "dans tous les modules", href: "/admin/modules", accent: "text-primary-deep" },
  ];

  return (
    <div className="space-y-8">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-deep">Tableau de bord</h1>
          <p className="mt-1 text-sm text-ink-soft">Vue d'ensemble de la plateforme Holenek</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/users/new" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors shadow-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nouvel utilisateur
          </Link>
          <Link href="/admin/modules/new" className="inline-flex items-center gap-2 rounded-xl border border-surface-warm px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface transition-colors">
            Nouveau module
          </Link>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}
            className="rounded-2xl border border-surface-warm bg-white p-5 hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <p className={`text-3xl font-extrabold tabular-nums ${k.accent}`}>{k.value}</p>
            <p className="mt-1 text-sm font-semibold text-ink group-hover:text-primary transition-colors">{k.label}</p>
            <p className="text-xs text-ink-soft mt-0.5">{k.sub}</p>
          </Link>
        ))}
      </div>

      {/* ── Graphiques ligne 1 ── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Répartition utilisateurs */}
        <div className="rounded-2xl border border-surface-warm bg-white p-6">
          <h2 className="text-sm font-bold text-primary-deep mb-4">Répartition des utilisateurs</h2>
          <div className="h-56">
            <RolesChart data={rolesChartData} />
          </div>
        </div>

        {/* Modules publiés vs brouillons */}
        <div className="rounded-2xl border border-surface-warm bg-white p-6">
          <h2 className="text-sm font-bold text-primary-deep mb-4">État des modules</h2>
          <div className="h-56">
            <ModulesStatusChart published={publishedModules} draft={draftModules} />
          </div>
        </div>

        {/* État des stamps */}
        <div className="rounded-2xl border border-surface-warm bg-white p-6">
          <h2 className="text-sm font-bold text-primary-deep mb-4">État des compétences (stamps)</h2>
          <div className="h-56">
            <StampsStateChart green={greenStamps} orange={orangeStamps} red={redStamps} />
          </div>
        </div>
      </div>

      {/* ── Graphiques ligne 2 ── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Activité par rôle */}
        <div className="rounded-2xl border border-surface-warm bg-white p-6">
          <h2 className="text-sm font-bold text-primary-deep mb-4">Utilisateurs par rôle</h2>
          <div className="h-52">
            <ActivityByRoleChart labels={activityLabels} values={activityValues} />
          </div>
        </div>

        {/* Apprenants à risque */}
        <div className="rounded-2xl border border-surface-warm bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-primary-deep">Apprenants à risque</h2>
            <Link href="/admin/learners" className="text-xs font-medium text-primary hover:text-primary-deep">Voir tout →</Link>
          </div>
          {learnersAtRisk === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p className="text-sm font-semibold text-green-700">Aucun apprenant à risque</p>
              <p className="text-xs text-ink-soft mt-1">Tous les stamps sont valides</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-red-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-50/60 border-b border-red-100">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-ink-soft">Apprenant</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-ink-soft">Expirés</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {learners.filter((l) => l.red_count > 0).slice(0, 5).map((l) => (
                    <tr key={l.id} className="border-b border-surface-warm last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-600">{l.display_name.charAt(0).toUpperCase()}</div>
                          <span className="text-sm font-medium text-ink">{l.display_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                          {l.red_count} expiré{l.red_count > 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/learners/${l.id}`} className="text-xs font-medium text-primary hover:text-primary-deep">Voir →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Utilisateurs récents ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-primary-deep">Utilisateurs récents</h2>
          <Link href="/admin/users" className="text-sm font-medium text-primary hover:text-primary-deep">Voir tout →</Link>
        </div>
        <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-warm bg-surface">
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft">Nom</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft hidden sm:table-cell">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft">Rôle</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 8).map((user) => (
                <tr key={user.id} className="border-b border-surface-warm last:border-0 hover:bg-surface/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-ink">{user.display_name ?? "—"}</td>
                  <td className="px-5 py-3.5 text-ink-soft hidden sm:table-cell text-xs">{user.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE[user.platform_role] ?? "bg-surface text-ink-soft"}`}>
                      {ROLE_LABELS[user.platform_role] ?? user.platform_role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/admin/users/${user.id}`} className="rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface hover:border-primary/30 transition-colors">Éditer</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Modules récents ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-primary-deep">Modules récents</h2>
          <Link href="/admin/modules" className="text-sm font-medium text-primary hover:text-primary-deep">Voir tout →</Link>
        </div>
        {modules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-warm bg-surface p-12 text-center">
            <p className="text-ink-soft mb-4">Aucun module créé.</p>
            <Link href="/admin/modules/new" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors">Créer le premier module</Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-warm bg-surface">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft">Titre</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft hidden sm:table-cell">Leçons</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-soft">Statut</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {modules.slice(0, 6).map((mod) => (
                  <tr key={mod.id} className="border-b border-surface-warm last:border-0 hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-ink">{mod.title_fr}</td>
                    <td className="px-5 py-3.5 text-ink-soft hidden sm:table-cell tabular-nums text-xs">{mod.content_fr?.lessons?.length ?? 0}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${mod.content_fr ? "bg-green-50 text-green-700" : "bg-surface text-ink-soft"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${mod.content_fr ? "bg-green-500" : "bg-muted"}`} aria-hidden="true" />
                        {mod.content_fr ? "Publié" : "Brouillon"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/admin/modules/${mod.id}`} className="rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface hover:border-primary/30 transition-colors">Éditer</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Configuration système (super_admin only) */}
      {canReadConfig && config.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-primary-deep">Configuration système</h2>
            <Link href="/admin/config" className="text-sm font-medium text-primary hover:text-primary-deep">Gérer →</Link>
          </div>
          <div className="rounded-2xl border border-surface-warm bg-white p-5">
            <p className="text-sm text-ink-soft">{config.length} paramètre{config.length > 1 ? "s" : ""} configuré{config.length > 1 ? "s" : ""}.</p>
          </div>
        </section>
      )}
    </div>
  );
}


