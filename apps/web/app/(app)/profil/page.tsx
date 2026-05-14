// Refs: SPEC.md §8, US-1.1 MFA, US-1.4 export RGPD JSON, R-1.1 états Stamp
import { redirect } from "next/navigation";
import { fr } from "@elearning/i18n";
import { getApiClient, getPermissions } from "../../../lib/api";
import { can } from "../../../lib/permissions";
import { auth } from "../../../auth";
import { MfaPanel } from "./MfaPanel";
import { AccountForm } from "./AccountForm";

const stampConfig: Record<string, { badge: string; dot: string; label: string }> = {
  green:  { badge: "bg-green-50 text-green-700 ring-1 ring-green-200",  dot: "bg-green-400",  label: fr.profile.valid },
  orange: { badge: "bg-orange-50 text-orange-700 ring-1 ring-orange-200", dot: "bg-orange-400", label: fr.profile.expiring },
  red:    { badge: "bg-red-50 text-red-700 ring-1 ring-red-200",        dot: "bg-red-400",    label: fr.profile.expired },
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrateur",
  trainer: "Formateur",
  manager: "Manager",
  learner: "Apprenant",
};

export default async function ProfilPage() {
  const t = fr;
  const [api, session, permissions] = await Promise.all([getApiClient(), auth(), getPermissions()]);
  if (!can(permissions, "view.learner_profil")) redirect("/dashboard");

  const platformRole = (session as any)?.platformRole as string ?? "learner";
  const displayName = (session as any)?.displayName as string ?? session?.user?.email?.split("@")[0] ?? "Utilisateur";
  const email = session?.user?.email ?? "";
  const initial = displayName.charAt(0).toUpperCase() || "U";

  const [passport, me] = await Promise.all([
    api.passport.get().catch(() => null),
    api.user.getMe().catch(() => null),
  ]);
  const stamps = passport?.stamps ?? [];
  const streak = passport?.streak;
  const mfaEnabled = me?.mfa_enabled ?? false;

  const greenCount = stamps.filter((s) => s.state === "green").length;

  return (
    <section aria-labelledby="profil-title">
      <div className="mb-8">
        <h1 id="profil-title" className="text-2xl font-bold text-primary-deep">
          {t.profile.title}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">Votre progression et vos certifications</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne gauche — identité + streak */}
        <div className="flex flex-col gap-5">
          {/* Identity card */}
          <div className="rounded-xl border border-surface-warm bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                {initial}
              </div>
              <p className="mt-3 font-semibold text-primary-deep">{displayName}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{email}</p>
              <span className="mt-2 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                {ROLE_LABELS[platformRole] ?? platformRole}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-surface-warm pt-5">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-deep">{stamps.length}</p>
                <p className="text-xs text-ink-soft">Compétences</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-deep">{greenCount}</p>
                <p className="text-xs text-ink-soft">Validées</p>
              </div>
            </div>
          </div>

          {/* Streak card */}
          {streak && (
            <div className="rounded-xl border border-surface-warm bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Streak</p>
                  <p className="text-2xl font-bold text-primary-deep">
                    {streak.current_days}
                    <span className="ml-1 text-sm font-normal text-ink-soft">jours</span>
                  </p>
                </div>
              </div>
              {streak.longest_days > 0 && (
                <p className="mt-3 text-xs text-ink-soft">
                  Record : <span className="font-medium text-ink">{streak.longest_days} jours</span>
                </p>
              )}
            </div>
          )}

          {/* MFA */}
          <MfaPanel mfaEnabled={mfaEnabled} />

          {/* Modifier le compte */}
          <AccountForm displayName={displayName} />

          {/* Export RGPD */}
          <a
            href="/api/user/export"
            aria-label={t.profile.export}
            className="flex items-center justify-center gap-2 rounded-xl border border-surface-warm bg-white px-4 py-3 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {t.profile.export}
          </a>
        </div>

        {/* Colonne droite — liste des compétences */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-surface-warm bg-white shadow-sm">
            <div className="border-b border-surface-warm px-6 py-4">
              <h2 className="font-semibold text-primary-deep">{t.profile.competences}</h2>
            </div>

            {stamps.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <p className="text-sm text-ink-soft">Aucune compétence validée pour l'instant</p>
              </div>
            ) : (
              <ul className="divide-y divide-surface-warm">
                {stamps.map((stamp) => {
                  const cfg = stampConfig[stamp.state] ?? stampConfig.green;
                  const expires = new Date(stamp.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
                  return (
                    <li key={stamp.id} className="flex items-center gap-4 px-6 py-4">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">{stamp.competence.label_fr}</p>
                        <p className="text-xs text-ink-soft">
                          Expire le <time dateTime={stamp.expires_at}>{expires}</time>
                          {stamp.performance_score > 0 && (
                            <> · Score : <span className="font-medium text-ink">{Math.round(stamp.performance_score)}%</span></>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        {can(permissions, "certificate.download") && (
                          <a
                            href={`/api/audit/stamps/${stamp.id}/certificate`}
                            download
                            aria-label={`${t.profile.downloadCertificateAriaLabel} ${stamp.competence.label_fr}`}
                            className="flex items-center gap-1 rounded-lg border border-surface-warm px-2.5 py-1 text-xs font-medium text-ink hover:border-primary/30 hover:bg-surface transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            PDF
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
