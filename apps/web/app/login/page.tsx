"use client";
// Refs: SPEC.md §9 US-1.1 — formulaire login, MFA optionnel, WCAG AA
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { fr } from "@elearning/i18n";

export default function LoginPage() {
  const t = fr.login;
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(false);
    setLoading(true);

    // Premier essai sans code MFA pour détecter si MFA est requis
    const result = await signIn("credentials", {
      email,
      password,
      ...(needsMfa ? { mfa_code: mfaCode } : {}),
      redirect: false,
    });
    setLoading(false);

    if (result?.ok) {
      router.push(callbackUrl);
    } else if (!needsMfa && result?.error === "CredentialsSignin") {
      // Peut être un échec MFA — on affiche le champ code et on laisse réessayer
      setNeedsMfa(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Panneau gauche — illustration */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-white">Holenek</span>
        </div>

        <div>
          <blockquote className="text-2xl font-semibold leading-snug text-white">
            "Réduisez votre risque de non-conformité avec une plateforme e-learning qui s'adapte à votre organisation."
          </blockquote>
          <div className="mt-8 flex gap-6">
            {[
              { value: "98%", label: "Taux de conformité" },
              { value: "3×", label: "Engagement vs LMS classique" },
              { value: "ISO 27001", label: "Compatible" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-primary">Holenek</span>
          </div>

          <h1 className="text-2xl font-bold text-primary-deep">{t.title}</h1>
          <p className="mt-2 text-sm text-ink-soft">Connectez-vous à votre espace de formation</p>

          {error && (
            <div role="alert" className="mt-4 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {t.error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                {t.email}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@exemple.fr"
                className="w-full rounded-lg border border-surface-warm px-3.5 py-2.5 text-sm text-ink placeholder-muted shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                {t.password}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-surface-warm px-3.5 py-2.5 text-sm text-ink placeholder-muted shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Champ code TOTP — apparaît uniquement si le serveur l'exige */}
            {needsMfa && (
              <div>
                <label htmlFor="mfa-code" className="mb-1.5 block text-sm font-medium text-ink">
                  Code d'authentification
                </label>
                <p className="mb-2 text-xs text-ink-soft">
                  Entrez le code à 6 chiffres de votre application TOTP (Google Authenticator, Authy…)
                </p>
                <input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full rounded-lg border border-primary px-3.5 py-2.5 text-center text-sm font-mono tracking-[0.4em] text-ink shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  {fr.common.loading}
                </>
              ) : needsMfa ? "Vérifier le code" : t.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
