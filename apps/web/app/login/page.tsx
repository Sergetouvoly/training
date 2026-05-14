"use client";
// Refs: SPEC.md §9 US-1.1 — formulaire login, MFA optionnel, WCAG AA
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { fr } from "@elearning/i18n";

type ErrorCode = "invalid_credentials" | "account_disabled" | "mfa_invalid" | "generic";

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  invalid_credentials: "Email ou mot de passe incorrect.",
  account_disabled: "Ce compte a été désactivé. Contactez votre administrateur.",
  mfa_invalid: "Code d'authentification incorrect. Vérifiez votre application TOTP.",
  generic: "Une erreur est survenue. Veuillez réessayer.",
};

export default function LoginPage() {
  const t = fr.login;
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorCode(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      ...(needsMfa ? { mfa_code: mfaCode } : {}),
      redirect: false,
    });
    setLoading(false);

    if (result?.ok) {
      router.push(callbackUrl);
      return;
    }

    // NextAuth encode l'erreur dans result.error
    // On parse le message d'erreur qu'on a levé dans authorize()
    const raw = result?.error ?? "";
    if (raw.includes("account_disabled")) {
      setErrorCode("account_disabled");
    } else if (raw.includes("mfa_invalid")) {
      setErrorCode("mfa_invalid");
    } else if (raw.includes("mfa_required") || (!needsMfa && raw === "CredentialsSignin")) {
      // Peut être un compte avec MFA — affiche le champ code
      setNeedsMfa(true);
      setErrorCode(null);
    } else if (raw.includes("invalid_credentials") || raw === "CredentialsSignin") {
      setErrorCode("invalid_credentials");
    } else {
      setErrorCode("generic");
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

          {/* Erreur */}
          {errorCode && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{ERROR_MESSAGES[errorCode]}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            {/* Email */}
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
                onChange={(e) => { setEmail(e.target.value); setErrorCode(null); }}
                placeholder="alice@exemple.fr"
                aria-invalid={errorCode === "invalid_credentials"}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-ink placeholder-muted shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  errorCode === "invalid_credentials"
                    ? "border-red-300 focus:border-red-400"
                    : "border-surface-warm focus:border-primary"
                }`}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-ink">
                  {t.password}
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot((v) => !v)}
                  className="text-xs text-primary hover:text-primary-deep hover:underline transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorCode(null); }}
                  placeholder="••••••••"
                  aria-invalid={errorCode === "invalid_credentials"}
                  className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm text-ink placeholder-muted shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errorCode === "invalid_credentials"
                      ? "border-red-300 focus:border-red-400"
                      : "border-surface-warm focus:border-primary"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition-colors"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Message mot de passe oublié */}
            {showForgot && (
              <div className="rounded-lg bg-accent-soft px-4 py-3 text-sm text-ink-soft ring-1 ring-surface-warm">
                <p className="font-medium text-ink">Vous avez oublié votre mot de passe ?</p>
                <p className="mt-1">
                  Contactez votre administrateur pour qu'il réinitialise votre mot de passe depuis l'espace administration.
                </p>
              </div>
            )}

            {/* Code TOTP */}
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
                  onChange={(e) => { setMfaCode(e.target.value.replace(/\D/g, "")); setErrorCode(null); }}
                  placeholder="123456"
                  aria-invalid={errorCode === "mfa_invalid"}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-center text-sm font-mono tracking-[0.4em] text-ink shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errorCode === "mfa_invalid"
                      ? "border-red-300 focus:border-red-400"
                      : "border-primary"
                  }`}
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
                  {fr.common?.loading ?? "Connexion…"}
                </>
              ) : needsMfa ? "Vérifier le code" : t.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
