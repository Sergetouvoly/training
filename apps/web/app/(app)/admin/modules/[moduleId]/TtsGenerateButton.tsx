"use client";
// Refs: dev_idea.txt — bouton de génération audio TTS dans la toolbar du module
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Lang = "fr" | "en" | "ko" | "ja";
type Status = "idle" | "loading-preview" | "ready" | "generating" | "success" | "error";

const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
];

const VOICES = ["M1", "M2", "F1", "F2"];

interface Props {
  readonly moduleId: string;
  readonly hasUnsavedChanges?: boolean;
}

export function TtsGenerateButton({ moduleId, hasUnsavedChanges = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState<{ length: number; has_audio: boolean } | null>(null);
  const [lang, setLang] = useState<Lang>("fr");
  const [voice, setVoice] = useState("M1");
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; duration_seconds: number } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Charge l'aperçu (longueur du texte + audio existant) à l'ouverture
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus("loading-preview");
    setError(null);
    setResult(null);
    fetch(`/api/tts/preview/${moduleId}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) {
          setStatus("error");
          setError(d?.error ?? "Impossible de charger l'aperçu");
          return;
        }
        setPreview({ length: d.length, has_audio: d.has_audio });
        setReplace(d.has_audio);
        setStatus("ready");
      })
      .catch((e) => { if (!cancelled) { setStatus("error"); setError(e?.message ?? "Erreur"); } });
    return () => { cancelled = true; };
  }, [open, moduleId]);

  // Fermeture Échap
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && status !== "generating") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, status]);

  async function handleGenerate() {
    setStatus("generating");
    setError(null);
    try {
      const res = await fetch(`/api/tts/generate/${moduleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, voice, replace }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data?.error ?? data?.message ?? "Génération échouée");
        return;
      }
      setResult({ url: data.url, duration_seconds: data.duration_seconds });
      setStatus("success");
      // Rafraîchit la page pour que l'audio apparaisse dans le module
      router.refresh();
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "Erreur réseau");
    }
  }

  const minutes = preview ? Math.max(1, Math.round(preview.length / 1000)) : 0;
  const isBlocking = status === "generating";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Générer un résumé audio du module"
        className="flex items-center gap-2 rounded-xl border border-surface-warm px-4 py-2 text-sm font-medium text-ink hover:bg-surface transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        Générer l'audio
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tts-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !isBlocking) setOpen(false); }}
        >
          <div ref={dialogRef} className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">

            {/* Header */}
            <div className="border-b border-surface-warm px-6 py-4 flex items-center justify-between">
              <h2 id="tts-title" className="text-base font-bold text-primary-deep">Générer l'audio du module</h2>
              <button
                type="button"
                disabled={isBlocking}
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="text-ink-soft hover:text-ink disabled:opacity-30"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">

              {hasUnsavedChanges && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                  Vous avez des modifications non sauvegardées. L'audio sera généré depuis le contenu actuellement enregistré.
                </div>
              )}

              {status === "loading-preview" && (
                <p className="text-sm text-ink-soft">Chargement du contenu…</p>
              )}

              {status === "error" && (
                <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                  {error}
                </div>
              )}

              {preview && status !== "loading-preview" && (
                <>
                  <div className="rounded-lg bg-surface px-4 py-3 text-xs text-ink-soft space-y-1">
                    <p>
                      <span className="font-semibold text-ink">{preview.length.toLocaleString("fr-FR")}</span> caractères extraits
                      <span className="ml-1 text-ink-soft/70">(~{minutes} min de lecture)</span>
                    </p>
                    {preview.has_audio && (
                      <p className="flex items-center gap-1.5 text-amber-700">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        Un audio existe déjà pour ce module
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="tts-lang" className="mb-1 block text-xs font-medium text-ink-soft">Langue</label>
                      <select
                        id="tts-lang"
                        value={lang}
                        onChange={(e) => setLang(e.target.value as Lang)}
                        disabled={isBlocking}
                        className="w-full rounded-lg border border-surface-warm bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="tts-voice" className="mb-1 block text-xs font-medium text-ink-soft">Voix</label>
                      <select
                        id="tts-voice"
                        value={voice}
                        onChange={(e) => setVoice(e.target.value)}
                        disabled={isBlocking}
                        className="w-full rounded-lg border border-surface-warm bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>

                  {preview.has_audio && (
                    <label className="flex items-center gap-2 rounded-lg border border-surface-warm px-3 py-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={replace}
                        onChange={(e) => setReplace(e.target.checked)}
                        disabled={isBlocking}
                        className="accent-primary"
                      />
                      <span className="text-ink">Remplacer l'audio existant</span>
                    </label>
                  )}
                </>
              )}

              {status === "generating" && (
                <div className="flex items-center gap-3 rounded-lg bg-primary/5 px-4 py-3 text-sm text-primary-deep">
                  <svg className="animate-spin shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  <span>Synthèse en cours… (peut prendre 30s à plusieurs minutes selon la longueur)</span>
                </div>
              )}

              {status === "success" && result && (
                <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200 space-y-2">
                  <p className="font-semibold flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Audio généré ({result.duration_seconds.toFixed(0)}s)
                  </p>
                  <audio controls src={result.url} className="w-full">Votre navigateur ne supporte pas l'audio.</audio>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-surface-warm px-6 py-3 flex justify-end gap-2">
              <button
                type="button"
                disabled={isBlocking}
                onClick={() => setOpen(false)}
                className="rounded-lg border border-surface-warm px-4 py-2 text-sm font-medium text-ink hover:bg-surface transition-colors disabled:opacity-50"
              >
                {status === "success" ? "Fermer" : "Annuler"}
              </button>
              {status !== "success" && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={status !== "ready" || (preview?.has_audio && !replace) || isBlocking}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-deep transition-colors disabled:opacity-50"
                >
                  {status === "generating" ? "Génération…" : "Générer"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
