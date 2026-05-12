// Refs: SPEC.md §8, US-1.2 progression visible sur dashboard, R-1.1 états Stamp
import { redirect } from "next/navigation";
import { fr } from "@elearning/i18n";
import { auth } from "../../../auth";
import { getApiClient, getUserId } from "../../../lib/api";

// Rôles non-apprenants : on les renvoie vers leur espace dédié qui a déjà
// un dashboard complet. /dashboard est réservé aux learners.
const ROLE_REDIRECT: Record<string, string> = {
  super_admin: "/admin",
  admin: "/admin",
  trainer: "/trainer",
  manager: "/manager",
};

function CircularProgress({ value, size = 64 }: { readonly value: number; readonly size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#dddddd" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#1a6c7a" strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="13" fontWeight="700" fill="#153243">
        {value}%
      </text>
    </svg>
  );
}

const stampBadge: Record<string, string> = {
  green:  "bg-green-50 text-green-700 ring-1 ring-green-200",
  orange: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  red:    "bg-red-50 text-red-700 ring-1 ring-red-200",
};
const stampLabel: Record<string, string> = {
  green: fr.profile.valid, orange: fr.profile.expiring, red: fr.profile.expired,
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrateur",
  trainer: "Formateur",
  manager: "Manager",
  learner: "Apprenant",
};

export default async function DashboardPage() {
  const t = fr;
  const [api, session, learnerId] = await Promise.all([getApiClient(), auth(), getUserId()]);

  const platformRole = (session as any)?.platformRole as string ?? "learner";

  const roleRedirect = ROLE_REDIRECT[platformRole];
  if (roleRedirect) redirect(roleRedirect);

  const displayName = (session as any)?.displayName as string ?? session?.user?.email?.split("@")[0] ?? "Utilisateur";
  const initial = displayName.charAt(0).toUpperCase() || "U";

  const [paths, passport, progress] = await Promise.all([
    api.learning.listPaths().catch(() => [] as Awaited<ReturnType<typeof api.learning.listPaths>>),
    api.passport.get().catch(() => null),
    learnerId
      ? api.learning.getProgress(learnerId).catch(() => ({} as Record<string, number>))
      : Promise.resolve({} as Record<string, number>),
  ]);

  const stamps = passport?.stamps ?? [];
  const streak = passport?.streak;

  const greenStamps = stamps.filter((s) => s.state === "green").length;
  const totalStamps = stamps.length;

  const progressValues = Object.values(progress);
  const avgProgress = progressValues.length > 0
    ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
    : 0;

  return (
    <section aria-labelledby="dashboard-title">
      <h1 id="dashboard-title" className="mb-6 text-2xl font-bold text-primary-deep">
        {t.dashboard.title}
      </h1>

      {/* ── Hero card utilisateur ─────────────────────────── */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-primary shadow-md">
        <div className="h-2 w-full bg-gradient-to-r from-primary-deep via-primary to-accent-bright opacity-80" />
        <div className="flex flex-wrap items-center gap-6 px-8 py-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-bold text-primary shadow">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-white">{displayName}</p>
            <span className="mt-1 inline-block rounded-full bg-accent-bright px-3 py-0.5 text-xs font-semibold text-primary-deep">
              {ROLE_LABELS[platformRole] ?? platformRole}
            </span>
          </div>
          <div className="flex gap-8">
            {[
              { value: paths.length,   label: "Parcours" },
              { value: totalStamps,    label: "Compétences" },
              { value: greenStamps,    label: "Validées" },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-2xl font-bold text-white">{m.value}</p>
                <p className="mt-0.5 text-xs text-white/70">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grille 3 colonnes ────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Compétences & Certifications */}
        <article aria-labelledby="card-comp" className="rounded-2xl border border-surface-warm bg-white p-6 shadow-sm">
          <h2 id="card-comp" className="mb-4 font-semibold text-primary-deep">
            Compétences &amp; Certifications
          </h2>

          {stamps.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-soft">Aucune compétence encore</p>
          ) : (
            <ul className="space-y-4" role="list">
              {stamps.slice(0, 3).map((stamp) => {
                const score = Math.round(stamp.performance_score);
                const expires = new Date(stamp.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
                return (
                  <li key={stamp.id} className="flex items-center gap-4">
                    <div className="shrink-0">
                      <CircularProgress value={score} size={56} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{stamp.competence.label_fr}</p>
                      <p className="text-xs text-ink-soft">Valide jusqu'au {expires}</p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${stampBadge[stamp.state] ?? stampBadge.green}`}>
                        {stampLabel[stamp.state] ?? stamp.state}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {stamps.length > 0 && (
            <a
              href="/profil"
              className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-surface-warm px-4 py-2 text-sm font-medium text-primary transition hover:bg-surface"
            >
              Voir le certificat
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          )}
        </article>

        {/* Mes Parcours */}
        <article aria-labelledby="card-paths" className="rounded-2xl border border-surface-warm bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="card-paths" className="font-semibold text-primary-deep">Mes Parcours</h2>
            <a href="/parcours" className="text-xs font-medium text-primary hover:underline">Voir tout →</a>
          </div>

          {/* Progression globale */}
          {progressValues.length > 0 && (
            <div className="mb-4 rounded-xl bg-surface px-4 py-3">
              <div className="flex items-center justify-between text-xs text-ink-soft mb-1.5">
                <span>Progression globale</span>
                <span className="font-bold text-primary">{avgProgress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-warm">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${avgProgress}%` }} />
              </div>
            </div>
          )}

          {paths.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted" aria-hidden="true">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </div>
              <p className="text-sm text-ink-soft">Aucun parcours assigné</p>
            </div>
          ) : (
            <ul className="space-y-3" role="list">
              {paths.slice(0, 3).map((path) => {
                const moduleProgresses = path.module_sequence.map((id) => progress[id] ?? 0);
                const pathPct = moduleProgresses.length > 0
                  ? Math.round(moduleProgresses.reduce((a, b) => a + b, 0) / moduleProgresses.length)
                  : 0;
                return (
                  <li key={path.id}>
                    <a
                      href={`/parcours/${path.id}`}
                      className="flex items-center gap-3 rounded-xl border border-surface-warm p-3 transition hover:border-primary hover:bg-accent-soft group"
                    >
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-deep">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink group-hover:text-primary">{path.title_fr}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-warm">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pathPct}%` }} />
                          </div>
                          <span className="text-xs text-ink-soft tabular-nums">{pathPct}%</span>
                        </div>
                      </div>
                      {path.is_mandatory && (
                        <span className="shrink-0 rounded-full bg-accent-bright px-2 py-0.5 text-xs font-semibold text-primary-deep">
                          {t.paths.mandatory}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        {/* Streak */}
        <article aria-labelledby="card-streak" className="rounded-2xl border border-surface-warm bg-white p-6 shadow-sm">
          <h2 id="card-streak" className="mb-4 font-semibold text-primary-deep">
            Streak d'apprentissage
          </h2>

          <div className="flex flex-col items-center py-4">
            <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <path d="M32 56c11 0 20-8 20-19 0-8-5-14-10-18 1 5-1 9-4 11 0-6-4-12-9-15 1 8-4 14-4 14-3-3-3-8-1-12C18 20 12 27 12 37c0 11 9 19 20 19z" fill="#f97316"/>
              <path d="M32 52c6 0 11-5 11-11 0-5-3-9-7-11 0 3-2 5-4 6 0-4-3-7-5-9 1 5-3 8-3 8-2-2-2-5 0-7-4 3-7 8-7 13 0 6 5 11 15 11z" fill="#fb923c"/>
              <path d="M32 48c3 0 6-3 6-7 0-3-2-5-4-6 0 2-1 3-2 4 0-2-2-4-3-5 0 3-2 5-2 5-1-1-1-3 0-4-2 2-4 4-4 7 0 4 3 6 9 6z" fill="#fde68a"/>
            </svg>
            <p className="mt-2 text-5xl font-extrabold text-primary-deep">
              {streak?.current_days ?? 0}
            </p>
            <p className="mt-1 text-sm font-medium text-ink-soft">jours consécutifs</p>
          </div>

          {streak && streak.longest_days > 0 && (
            <div className="mt-4 rounded-xl bg-surface px-4 py-3 text-center">
              <p className="text-xs text-ink-soft">Record personnel</p>
              <p className="mt-0.5 font-bold text-primary-deep">{streak.longest_days} jours</p>
            </div>
          )}

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-ink-soft">Cette semaine</p>
            <div className="flex justify-between gap-1">
              {["L","M","M","J","V","S","D"].map((d, i) => (
                <div key={d + i} className="flex flex-1 flex-col items-center gap-1">
                  <div className={`w-full rounded-sm ${i < (streak?.current_days ?? 0) % 7 ? "h-6 bg-primary" : "h-6 bg-surface-warm"}`} />
                  <span className="text-[10px] text-ink-soft">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
