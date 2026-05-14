import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center">
      {/* Illustration */}
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
          <path d="M11 8v3M11 14h.01"/>
        </svg>
      </div>

      {/* Code */}
      <p className="mb-2 text-6xl font-extrabold tabular-nums text-primary-deep">404</p>

      {/* Message */}
      <h1 className="mb-3 text-2xl font-bold text-primary-deep">
        Page introuvable
      </h1>
      <p className="mb-8 max-w-sm text-sm text-ink-soft">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
            <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
          </svg>
          Tableau de bord
        </Link>
        <Link
          href="javascript:history.back()"
          className="inline-flex items-center gap-2 rounded-xl border border-surface-warm bg-white px-6 py-3 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          ← Retour
        </Link>
      </div>

      {/* Branding */}
      <div className="mt-12 flex items-center gap-2 text-xs text-ink-soft">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        Holenek LMS
      </div>
    </main>
  );
}
