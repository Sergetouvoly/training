"use client";
// Refs: SPEC.md §11 US-1.1 — setup TOTP, enable, disable MFA
import { useState } from "react";
import { useSession } from "next-auth/react";

type Step = "idle" | "setup" | "enabling" | "success";

interface MfaPanelProps {
  readonly mfaEnabled: boolean;
  readonly isSuperAdmin?: boolean;
  readonly targetUserId?: string; // pour désactivation admin sur un autre compte
}

export function MfaPanel({ mfaEnabled: initialEnabled }: MfaPanelProps) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const [enabled, setEnabled] = useState(initialEnabled);
  const [step, setStep] = useState<Step>("idle");
  const [qrUrl, setQrUrl] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  async function startSetup() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/mfa/setup", { method: "POST", headers });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { qr_data_url: string };
      setQrUrl(data.qr_data_url);
      setStep("setup");
    } catch {
      setError("Impossible de démarrer la configuration MFA.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmEnable() {
    if (!/^\d{6}$/.test(code)) { setError("Le code doit être 6 chiffres."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/mfa/enable", {
        method: "POST",
        headers,
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEnabled(true);
      setStep("success");
      setQrUrl("");
      setCode("");
    } catch {
      setError("Code invalide. Vérifiez l'heure de votre application TOTP.");
    } finally {
      setLoading(false);
    }
  }

  async function disableSelf() {
    if (!/^\d{6}$/.test(code)) { setError("Le code doit être 6 chiffres."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/mfa/disable", {
        method: "POST",
        headers,
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEnabled(false);
      setStep("idle");
      setCode("");
    } catch {
      setError("Code invalide ou erreur serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="mfa-title" className="rounded-xl border border-surface-warm bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
          </svg>
        </div>
        <div>
          <h2 id="mfa-title" className="font-semibold text-primary-deep">Authentification à deux facteurs</h2>
          <p className="text-xs text-ink-soft">Sécurisez votre compte avec une application TOTP (Google Authenticator, Authy…)</p>
        </div>
        <span className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${enabled ? "bg-green-50 text-green-700 ring-1 ring-green-200" : "bg-surface text-ink-soft ring-1 ring-surface-warm"}`}>
          {enabled ? "Activé" : "Désactivé"}
        </span>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {step === "success" && (
        <div role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 ring-1 ring-green-200">
          MFA activé avec succès. Votre compte est maintenant protégé.
        </div>
      )}

      {/* ── Étape 1 : idle, MFA non activé ─────────────────── */}
      {!enabled && step === "idle" && (
        <button
          onClick={startSetup}
          disabled={loading}
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-deep disabled:opacity-60"
        >
          {loading ? "Chargement…" : "Configurer le MFA"}
        </button>
      )}

      {/* ── Étape 2 : afficher le QR code ───────────────────── */}
      {step === "setup" && qrUrl && (
        <div className="space-y-4">
          <p className="text-sm text-ink">
            Scannez ce QR code avec votre application TOTP, puis entrez le code à 6 chiffres pour confirmer.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR code TOTP — scannez avec votre application d'authentification" className="mx-auto h-44 w-44 rounded-lg border border-surface-warm" />
          <div>
            <label htmlFor="mfa-code-enable" className="mb-1.5 block text-sm font-medium text-ink">
              Code de vérification
            </label>
            <div className="flex gap-2">
              <input
                id="mfa-code-enable"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-36 rounded-lg border border-surface-warm px-3.5 py-2.5 text-center text-sm font-mono tracking-widest text-ink shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={confirmEnable}
                disabled={loading || code.length !== 6}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-deep disabled:opacity-60"
              >
                {loading ? "Vérification…" : "Activer"}
              </button>
              <button
                onClick={() => { setStep("idle"); setQrUrl(""); setCode(""); setError(""); }}
                className="rounded-lg border border-surface-warm px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Désactiver son propre MFA ────────────────────────── */}
      {enabled && step === "idle" && (
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">Pour désactiver, entrez votre code TOTP actuel.</p>
          <div className="flex gap-2 flex-wrap">
            <input
              id="mfa-code-disable"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="Code TOTP"
              aria-label="Code TOTP pour désactiver le MFA"
              className="w-36 rounded-lg border border-surface-warm px-3.5 py-2.5 text-center text-sm font-mono tracking-widest text-ink shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={disableSelf}
              disabled={loading || code.length !== 6}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              {loading ? "Traitement…" : "Désactiver le MFA"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
