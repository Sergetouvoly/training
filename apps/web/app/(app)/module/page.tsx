"use client";
// Refs: SPEC.md §8, US-1.2 consommer module, progression sauvegardée
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Button } from "@elearning/ui";
import { fr } from "@elearning/i18n";
import type { Module } from "@elearning/api-client";

export default function ModulePage() {
  const t = fr;
  const searchParams = useSearchParams();
  const moduleId = searchParams.get("module_id");

  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!moduleId) { setLoading(false); return; }
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/learning/modules/${moduleId}`);
      if (!res.ok) throw new Error("fetch failed");
      setModule(await res.json() as Module);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => { void load(); }, [load]);

  if (!moduleId) {
    return (
      <section aria-labelledby="module-title">
        <h1 id="module-title" className="mb-6 text-3xl font-bold text-primary">{t.module.title}</h1>
        <p className="text-ink-soft">{t.common.error}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="module-title">
      <h1 id="module-title" className="mb-6 text-3xl font-bold text-primary">
        {module?.title_fr ?? t.module.title}
      </h1>

      {loading && <p className="text-ink-soft" aria-live="polite">{t.common.loading}</p>}

      {error && (
        <div role="alert" className="mb-4 rounded bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.common.error}{" "}
          <button onClick={load} className="underline">{t.common.retry}</button>
        </div>
      )}

      {module && (
        <>
          <Card as="article" aria-labelledby="module-content">
            <h2 id="module-content" className="sr-only">{module.title_fr}</h2>
            <p className="text-sm text-ink-soft">
              Version {module.version} — {module.competence_ids.length} compétences
            </p>
          </Card>

          <nav aria-label={t.module.title} className="mt-6 flex justify-between">
            <Button variant="secondary" aria-label={t.module.previous}>
              {t.module.previous}
            </Button>
            <a
              href={`/eval?module_id=${module.id}`}
              aria-label={t.module.next}
              className="rounded-lg bg-primary px-6 py-3 text-white hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {t.module.complete}
            </a>
          </nav>
        </>
      )}
    </section>
  );
}
