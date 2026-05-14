// Refs: SPEC-CONTENT.md §6.1 — détail apprenant admin
import { redirect, notFound } from "next/navigation";
import { getApiClient, getPermissions } from "../../../../../lib/api";
import { can } from "../../../../../lib/permissions";
import Link from "next/link";
import { AssignResourceForm } from "./AssignResourceForm";

const STATE_CONFIG = {
  green:  { label: "Validé",    cls: "bg-green-50 text-green-700 border-green-200" },
  orange: { label: "À revoir",  cls: "bg-orange-50 text-orange-700 border-orange-200" },
  red:    { label: "Expiré",    cls: "bg-red-50 text-red-700 border-red-200" },
} as const;

const ROLE_LABELS: Record<string, string> = {
  hr: "Ressources humaines", developer: "Développeur", manager: "Manager", finance: "Finance",
};

export default async function AdminLearnerDetailPage({
  params,
}: {
  readonly params: Promise<{ learnerId: string }>;
}) {
  const [{ learnerId }, permissions] = await Promise.all([params, getPermissions()]);
  if (!can(permissions, "view.admin_learners")) redirect("/dashboard");

  const api = await getApiClient();

  const [learner, modules, paths] = await Promise.all([
    api.user.getLearnerDetail(learnerId).catch(() => null),
    api.learning.listModules().catch(() => [] as Awaited<ReturnType<typeof api.learning.listModules>>),
    api.learning.listPaths().catch(() => [] as Awaited<ReturnType<typeof api.learning.listPaths>>),
  ]);

  if (!learner) notFound();

  const moduleMap = Object.fromEntries(modules.map((m) => [m.id, m]));
  const progressPct = learner.progress.length > 0
    ? Math.round(learner.progress.reduce((acc, p) => acc + p.progress_percent, 0) / learner.progress.length)
    : 0;

  return (
    <div className="max-w-4xl space-y-8">
      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-1.5 text-xs text-ink-soft" aria-label="Fil d'Ariane">
        <Link href="/admin" className="hover:text-primary transition-colors">Administration</Link>
        <span aria-hidden="true">›</span>
        <Link href="/admin/learners" className="hover:text-primary transition-colors">Apprenants</Link>
        <span aria-hidden="true">›</span>
        <span className="text-ink">{learner.display_name}</span>
      </nav>

      {/* En-tête apprenant */}
      <div className="flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-extrabold text-primary">
          {learner.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold text-primary-deep">{learner.display_name}</h1>
          <p className="text-sm text-ink-soft">{learner.email}</p>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <span className="rounded-full border border-surface-warm px-2.5 py-0.5 text-xs font-medium text-ink-soft">
              {ROLE_LABELS[learner.primary_role] ?? learner.primary_role}
            </span>
            {learner.team_id && (
              <span className="rounded-full border border-surface-warm px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                Équipe : {learner.team_id}
              </span>
            )}
            <span className="text-xs text-ink-soft">
              Inscrit le {new Date(learner.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-extrabold text-primary-deep tabular-nums">{learner.stamp_count}</p>
          <p className="text-xs text-ink-soft">stamp{learner.stamp_count > 1 ? "s" : ""}</p>
          {can(permissions, "audit.export") && (
            <a
              href={`/api/audit/learners/${learnerId}/export`}
              download={`audit-${learnerId}.json`}
              aria-label="Exporter le dossier d'audit"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface hover:border-primary/30 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Dossier d'audit
            </a>
          )}
        </div>
      </div>

      {can(permissions, "assignment.create") && (
        <AssignResourceForm learnerId={learner.user_id} modules={modules} paths={paths} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Progression modules */}
        <section>
          <h2 className="text-base font-bold text-primary-deep mb-4">
            Progression modules
            {learner.progress.length > 0 && (
              <span className="ml-2 text-sm font-normal text-ink-soft">
                (moy. {progressPct}%)
              </span>
            )}
          </h2>
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
                        role="progressbar"
                        aria-valuenow={p.progress_percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-ink-soft">
                      Mis à jour le {new Date(p.updated_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Stamps de compétences */}
        <section>
          <h2 className="text-base font-bold text-primary-deep mb-4">
            Passeport de compétences
            <span className="ml-2 text-sm font-normal text-ink-soft">
              ({learner.stamp_count} stamp{learner.stamp_count > 1 ? "s" : ""})
            </span>
          </h2>
          {learner.stamps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-warm bg-surface p-8 text-center text-sm text-ink-soft">
              Aucun stamp obtenu — l'apprenant n'a pas encore passé de quiz.
            </div>
          ) : (
            <div className="space-y-2.5">
              {learner.stamps.map((stamp) => {
                const cfg = STATE_CONFIG[stamp.state as keyof typeof STATE_CONFIG] ?? STATE_CONFIG.red;
                const isExpired = new Date(stamp.expires_at) < new Date();
                return (
                  <div key={stamp.id} className={`rounded-xl border px-5 py-4 ${cfg.cls}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{stamp.competence_label_fr}</p>
                        <p className="text-[11px] opacity-70 font-mono mt-0.5">{stamp.competence_code}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                          {cfg.label}
                        </span>
                        {can(permissions, "certificate.download") && (
                          <a
                            href={`/api/audit/stamps/${stamp.id}/certificate`}
                            download
                            aria-label={`Télécharger le certificat PDF pour ${stamp.competence_label_fr}`}
                            className="flex items-center gap-1 rounded-lg bg-white/60 px-2 py-0.5 text-[11px] font-medium hover:bg-white transition-colors"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            PDF
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-4 text-[11px] opacity-80">
                      <span>Score : <strong>{Math.round(stamp.performance_score)}%</strong></span>
                      <span>{stamp.attempts} tentative{stamp.attempts > 1 ? "s" : ""}</span>
                      <span>
                        {isExpired ? "Expiré le " : "Expire le "}
                        {new Date(stamp.expires_at).toLocaleDateString("fr-FR")}
                      </span>
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

