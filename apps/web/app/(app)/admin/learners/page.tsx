// Refs: SPEC-CONTENT.md §6.1 — liste apprenants admin
import { redirect } from "next/navigation";
import { getApiClient, getPlatformRole } from "../../../../lib/api";
import Link from "next/link";

const ADMIN_ROLES = new Set(["super_admin", "admin"]);

const ROLE_LABELS: Record<string, string> = {
  hr: "RH", developer: "Dev", manager: "Manager", finance: "Finance",
};

const STATE_COLORS = {
  green:  { dot: "bg-green-500",  badge: "bg-green-50 text-green-700" },
  orange: { dot: "bg-orange-400", badge: "bg-orange-50 text-orange-700" },
  red:    { dot: "bg-red-500",    badge: "bg-red-50 text-red-700" },
};

export default async function AdminLearnersPage() {
  const platformRole = await getPlatformRole();
  if (!ADMIN_ROLES.has(platformRole)) redirect("/dashboard");

  const api = await getApiClient();
  const learners = await api.user.listLearners().catch(
    () => [] as Awaited<ReturnType<typeof api.user.listLearners>>,
  );

  const total = learners.length;
  const withStamps = learners.filter((l) => l.stamp_count > 0).length;
  const atRisk = learners.filter((l) => l.red_count > 0).length;

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-ink-soft" aria-label="Fil d'Ariane">
            <Link href="/admin" className="hover:text-primary transition-colors">Administration</Link>
            <span aria-hidden="true">›</span>
            <span className="text-ink">Apprenants</span>
          </nav>
          <h1 className="text-2xl font-extrabold text-primary-deep">Apprenants</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {total} apprenant{total > 1 ? "s" : ""} · {withStamps} avec des stamps · {atRisk} à risque
          </p>
        </div>
      </div>

      {/* Indicateurs rapides */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total apprenants", value: total, color: "text-primary-deep" },
          { label: "Avec stamps", value: withStamps, color: "text-green-700" },
          { label: "Stamps rouges", value: atRisk, color: "text-red-700" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-surface-warm bg-white px-6 py-5">
            <p className={`text-3xl font-extrabold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-sm text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {learners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-warm bg-surface p-16 text-center">
          <p className="text-lg font-semibold text-primary-deep mb-2">Aucun apprenant</p>
          <p className="text-sm text-ink-soft">Les apprenants apparaissent ici une fois qu'ils se sont connectés.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-warm bg-surface">
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft">Apprenant</th>
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft hidden sm:table-cell">Rôle</th>
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft hidden md:table-cell">Stamps</th>
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft hidden lg:table-cell">Inscription</th>
                <th className="px-5 py-3.5 text-right font-semibold text-ink-soft">Détail</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((learner) => {
                const hasRed = learner.red_count > 0;
                return (
                  <tr
                    key={learner.id}
                    className="border-b border-surface-warm last:border-0 hover:bg-surface/40 transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {learner.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate group-hover:text-primary transition-colors">
                            {learner.display_name}
                          </p>
                          <p className="text-xs text-ink-soft truncate">{learner.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="rounded-full border border-surface-warm px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                        {ROLE_LABELS[learner.primary_role] ?? learner.primary_role}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      {learner.stamp_count === 0 ? (
                        <span className="text-xs text-ink-soft">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-ink font-medium">{learner.stamp_count}</span>
                          <div className="flex items-center gap-1">
                            {learner.green_count > 0 && (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATE_COLORS.green.badge}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${STATE_COLORS.green.dot}`} aria-hidden="true" />
                                {learner.green_count}
                              </span>
                            )}
                            {learner.orange_count > 0 && (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATE_COLORS.orange.badge}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${STATE_COLORS.orange.dot}`} aria-hidden="true" />
                                {learner.orange_count}
                              </span>
                            )}
                            {learner.red_count > 0 && (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATE_COLORS.red.badge}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${STATE_COLORS.red.dot}`} aria-hidden="true" />
                                {learner.red_count}
                              </span>
                            )}
                          </div>
                          {hasRed && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 shrink-0" aria-label="Attention — stamp rouge">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-ink-soft hidden lg:table-cell">
                      {new Date(learner.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/learners/${learner.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
                      >
                        Voir
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
