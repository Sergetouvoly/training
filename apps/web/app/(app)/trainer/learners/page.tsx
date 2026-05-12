// Refs: SPEC.md §7 — formateur : liste complète de ses apprenants.
// La garde de rôle est assurée par le trainer/layout.tsx (canAccessTrainerSpace).
import Link from "next/link";
import { getApiClient } from "../../../../lib/api";

export default async function TrainerLearnersPage() {
  const api = await getApiClient();
  const learners = await api.user.listLearners().catch(() => [] as Awaited<ReturnType<typeof api.user.listLearners>>);

  const total = learners.length;
  const atRisk = learners.filter((l) => l.red_count > 0).length;
  const withStamps = learners.filter((l) => l.stamp_count > 0).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/trainer"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-warm text-ink-soft hover:bg-surface transition-colors"
          aria-label="Retour"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-primary-deep">Mes apprenants</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {total} apprenant{total > 1 ? "s" : ""} · {withStamps} actifs · {atRisk} à risque
          </p>
        </div>
      </div>

      {learners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-warm bg-surface p-16 text-center">
          <p className="text-ink-soft">Aucun apprenant enregistré.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-warm bg-surface">
                <th className="px-5 py-3 text-left font-semibold text-ink-soft">Apprenant</th>
                <th className="px-5 py-3 text-left font-semibold text-ink-soft hidden sm:table-cell">Stamps</th>
                <th className="px-5 py-3 text-left font-semibold text-ink-soft hidden md:table-cell">État</th>
                <th className="px-5 py-3 text-right font-semibold text-ink-soft">Détail</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((learner) => {
                const hasRisk = learner.red_count > 0;
                return (
                  <tr key={learner.id} className="border-b border-surface-warm last:border-0 hover:bg-surface/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${hasRisk ? "bg-red-50 text-red-600" : "bg-primary/10 text-primary"}`}>
                          {learner.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-ink">{learner.display_name}</p>
                          <p className="text-xs text-ink-soft">{learner.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-ink hidden sm:table-cell">
                      {learner.stamp_count === 0 ? <span className="text-ink-soft">—</span> : learner.stamp_count}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {learner.stamp_count === 0 ? (
                        <span className="text-xs text-ink-soft">Pas encore commencé</span>
                      ) : hasRisk ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                          {learner.red_count} expiré{learner.red_count > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/trainer/learners/${learner.id}`}
                        className="rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface hover:border-primary/30 transition-colors"
                      >
                        Voir
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
