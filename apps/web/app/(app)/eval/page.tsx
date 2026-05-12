"use client";
// Refs: SPEC.md §8, US-1.3 évaluation → Stamp v1
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Button } from "@elearning/ui";
import { fr } from "@elearning/i18n";
import type { EvaluationItem, EvalResult } from "@elearning/api-client";

type AnswerMap = Record<string, string | string[]>;

export default function EvalPage() {
  const t = fr;
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleId = searchParams.get("module_id") ?? "";
  const bankId = searchParams.get("bank_id") ?? moduleId;

  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [result, setResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const loadItems = useCallback(async () => {
    if (!bankId) { setLoading(false); return; }
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/assessment/draw?bank_id=${encodeURIComponent(bankId)}&count=10`);
      if (!res.ok) throw new Error("fetch failed");
      setItems(await res.json() as EvaluationItem[]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [bankId]);

  useEffect(() => { void loadItems(); }, [loadItems]);

  const item = items[current];

  function setAnswer(value: string) {
    if (!item) return;
    if (item.format === "qcm_multi") {
      const prev = (answers[item.id] as string[] | undefined) ?? [];
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      setAnswers({ ...answers, [item.id]: next });
    } else {
      setAnswers({ ...answers, [item.id]: value });
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(false);
    try {
      const body = {
        module_id: moduleId,
        module_version_hash: "",
        answers: Object.entries(answers).map(([item_id, answer]) => ({ item_id, answer })),
      };
      const res = await fetch("/api/assessment/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("fetch failed");
      setResult(await res.json() as EvalResult);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const badge = result.stamp_state === "green"
      ? "bg-green-100 text-green-800"
      : result.stamp_state === "orange"
        ? "bg-orange-100 text-orange-800"
        : "bg-red-100 text-red-800";
    const label = result.stamp_state === "green" ? t.profile.valid
      : result.stamp_state === "orange" ? t.profile.expiring
        : t.profile.expired;

    return (
      <section aria-labelledby="result-title">
        <h1 id="result-title" className="mb-6 text-3xl font-bold text-primary">Résultat</h1>
        <Card>
          <p className="text-lg text-ink">
            Score :{" "}
            <strong>{Math.round(result.performance_score * 100)}%</strong>
          </p>
          <p className="mt-2">
            <span className={`rounded px-3 py-1 text-sm font-medium ${badge}`}>{label}</span>
          </p>
        </Card>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" onClick={() => router.push("/dashboard")}>
            {t.common.back}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="eval-title">
      <h1 id="eval-title" className="mb-6 text-3xl font-bold text-primary">
        {t.eval.title}
      </h1>

      {loading && <p className="text-ink-soft" aria-live="polite">{t.common.loading}</p>}

      {error && (
        <div role="alert" className="mb-4 rounded bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.common.error}{" "}
          <button onClick={loadItems} className="underline">{t.common.retry}</button>
        </div>
      )}

      {!loading && !error && item && (
        <>
          <p className="mb-4 text-sm text-ink-soft" aria-live="polite">
            {t.eval.question} {current + 1} {t.eval.of} {items.length}
          </p>

          <Card as="article" aria-labelledby="question-text">
            <h2 id="question-text" className="text-lg font-semibold text-ink">
              {item.content.question_fr}
            </h2>

            {item.content.choices && (
              <fieldset className="mt-4" aria-describedby="question-text">
                <legend className="sr-only">{t.eval.question}</legend>
                <ul className="space-y-2" role="list">
                  {item.content.choices.map((choice, i) => {
                    const id = `choice-${i}`;
                    const currentAnswer = answers[item.id];
                    const checked = item.format === "qcm_multi"
                      ? ((currentAnswer as string[] | undefined) ?? []).includes(choice.label)
                      : currentAnswer === choice.label;
                    return (
                      <li key={i}>
                        <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-surface-warm p-3 hover:bg-surface">
                          <input
                            id={id}
                            type={item.format === "qcm_multi" ? "checkbox" : "radio"}
                            name={`question-${item.id}`}
                            value={choice.label}
                            checked={checked}
                            onChange={() => setAnswer(choice.label)}
                            className="accent-accent-bright"
                          />
                          <span className="text-sm text-ink">{choice.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            )}
          </Card>

          <div className="mt-6 flex justify-end gap-3">
            {current < items.length - 1 ? (
              <Button variant="primary" onClick={() => setCurrent(current + 1)}>
                {t.eval.next}
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? t.common.loading : t.eval.finish}
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
