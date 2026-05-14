"use client";
// Refs: SPEC.md §8 US-1.1 — wizard onboarding première connexion (learners uniquement)
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { LearningPath } from "@elearning/api-client";
import { fr } from "@elearning/i18n";

const JOB_ROLES = [
  { value: "hr",        label: "Ressources humaines", emoji: "👥" },
  { value: "developer", label: "Développeur",          emoji: "💻" },
  { value: "manager",   label: "Manager",              emoji: "📋" },
  { value: "finance",   label: "Finance",              emoji: "📊" },
] as const;

type JobRole = (typeof JOB_ROLES)[number]["value"];

interface Props {
  readonly paths: LearningPath[];
}

const DISMISSED_KEY = "onboarding_dismissed";

export function OnboardingWizard({ paths }: Props) {
  const t = fr;
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [jobRole, setJobRole] = useState<JobRole | "">("");
  const [loading, setLoading] = useState(false);

  // Ne jamais afficher si l'utilisateur a cliqué "Plus tard" dans cette session
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(DISMISSED_KEY)) {
      setVisible(true);
    }
  }, []);

  // Focus trap
  useEffect(() => {
    if (visible) dialogRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  const relevantPaths = paths.filter((p) =>
    !jobRole || p.target_role === jobRole || p.target_role === "all",
  );

  const firstModule = relevantPaths[0]?.module_sequence?.[0];

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function complete() {
    if (!jobRole) return;
    setLoading(true);
    try {
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_role: jobRole }),
      });
      setVisible(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onKeyDown={(e) => e.key === "Escape" && dismiss()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl outline-none"
      >
        {/* Header */}
        <div className="border-b border-surface-warm px-6 py-5">
          <div className="flex items-center justify-between">
            <h2 id="onboarding-title" className="text-lg font-bold text-primary-deep">
              {t.onboarding.title}
            </h2>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all ${s === step ? "w-6 bg-primary" : s < step ? "w-2 bg-primary/40" : "w-2 bg-surface-warm"}`}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {step === 1 && (
            <>
              <p className="mb-5 text-sm font-medium text-ink">{t.onboarding.step1Title}</p>
              <div className="grid grid-cols-2 gap-3">
                {JOB_ROLES.map((jr) => (
                  <button
                    key={jr.value}
                    type="button"
                    onClick={() => setJobRole(jr.value)}
                    aria-pressed={jobRole === jr.value}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-colors ${jobRole === jr.value ? "border-primary bg-primary/8 text-primary" : "border-surface-warm text-ink hover:border-primary/30 hover:bg-surface"}`}
                  >
                    <span className="text-2xl">{jr.emoji}</span>
                    {jr.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="mb-5 text-sm font-medium text-ink">{t.onboarding.step2Title}</p>
              {relevantPaths.length === 0 ? (
                <p className="text-sm text-ink-soft">Aucun parcours assigné pour l'instant.</p>
              ) : (
                <ul className="space-y-3">
                  {relevantPaths.slice(0, 4).map((path) => (
                    <li key={path.id} className="flex items-center gap-3 rounded-xl border border-surface-warm p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{path.title_fr}</p>
                        <p className="text-xs text-ink-soft">{path.module_sequence.length} module{path.module_sequence.length > 1 ? "s" : ""}</p>
                      </div>
                      {path.is_mandatory && (
                        <span className="ml-auto shrink-0 rounded-full bg-accent-bright px-2 py-0.5 text-[10px] font-semibold text-primary-deep">
                          Obligatoire
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
                🎓
              </div>
              <p className="font-semibold text-primary-deep">{t.onboarding.step3Title}</p>
              <p className="mt-2 text-sm text-ink-soft">
                Commencez dès maintenant votre premier module.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-surface-warm px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-ink-soft hover:text-ink transition-colors"
          >
            {t.onboarding.dismiss}
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg border border-surface-warm px-4 py-2 text-sm font-medium text-ink hover:bg-surface transition-colors"
              >
                Retour
              </button>
            )}

            {step < 3 && (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 && !jobRole}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-deep disabled:opacity-50"
              >
                Suivant
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={complete}
                disabled={loading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-deep disabled:opacity-50"
              >
                {loading ? "Chargement…" : (
                  firstModule
                    ? <a href={`/module?module_id=${firstModule}`} onClick={complete} className="text-white">{t.onboarding.complete}</a>
                    : t.onboarding.complete
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
