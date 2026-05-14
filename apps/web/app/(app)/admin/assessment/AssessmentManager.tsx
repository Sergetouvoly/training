"use client";
// Refs: SPEC.md §3 L2, R-1.2 — CRUD banque de questions
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EvaluationItem } from "@elearning/api-client";

const FORMAT_LABELS: Record<string, string> = {
  qcm_single: "QCM unique",
  qcm_multi: "QCM multiple",
  true_false: "Vrai / Faux",
};

const DIFFICULTY_LABELS: Record<number, string> = { 1: "Très facile", 2: "Facile", 3: "Moyen", 4: "Difficile", 5: "Expert" };
const BLOOM_LABELS: Record<number, string> = { 1: "Mémorisation", 2: "Compréhension", 3: "Application", 4: "Analyse", 5: "Évaluation", 6: "Création" };

interface Props {
  readonly initialItems: EvaluationItem[];
  readonly initialBankFilter?: string;
}

type Tab = "list" | "create" | "import" | "import-json";

interface NewItemForm {
  bank_id: string;
  format: "qcm_single" | "qcm_multi" | "true_false";
  difficulty: number;
  bloom_level: number;
  concept_tags: string;
  question_fr: string;
  question_en: string;
  correct_answer: string;
  choices_json: string;
}

const EMPTY_FORM: NewItemForm = {
  bank_id: "",
  format: "qcm_single",
  difficulty: 3,
  bloom_level: 2,
  concept_tags: "",
  question_fr: "",
  question_en: "",
  correct_answer: "",
  choices_json: "",
};

export function AssessmentManager({ initialItems, initialBankFilter = "" }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [tab, setTab] = useState<Tab>("list");

  const [form, setForm] = useState<NewItemForm>(EMPTY_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [csvText, setCsvText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);

  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [jsonLoading, setJsonLoading] = useState(false);
  const [jsonResult, setJsonResult] = useState<{ imported: number; errors: string[] } | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [filterBank, setFilterBank] = useState(initialBankFilter);
  const [filterFormat, setFilterFormat] = useState("");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    let choices: { label: string; is_correct: boolean }[] | undefined;
    if (form.choices_json.trim()) {
      try {
        choices = JSON.parse(form.choices_json);
      } catch {
        setCreateError("choices_json invalide — vérifiez le format JSON.");
        setCreateLoading(false);
        return;
      }
    }

    const body = {
      bank_id: form.bank_id.trim(),
      format: form.format,
      difficulty: Number(form.difficulty) as 1 | 2 | 3 | 4 | 5,
      bloom_level: Number(form.bloom_level) as 1 | 2 | 3 | 4 | 5 | 6,
      concept_tags: form.concept_tags.split(",").map((t) => t.trim()).filter(Boolean),
      content: {
        question_fr: form.question_fr.trim(),
        ...(form.question_en.trim() && { question_en: form.question_en.trim() }),
        ...(form.correct_answer.trim() && { correct_answer: form.correct_answer.trim() }),
        ...(choices && { choices }),
      },
    };

    try {
      const res = await fetch("/api/assessment/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setCreateError("Erreur lors de la création."); return; }
      const created = await res.json();
      setItems((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
      setTab("list");
      router.refresh();
    } catch {
      setCreateError("Impossible de joindre le serveur.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/assessment/items/${id}`, { method: "DELETE" });
      if (!res.ok) { setDeleteError("Erreur lors de la suppression."); return; }
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteId(null);
    } catch {
      setDeleteError("Impossible de joindre le serveur.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setImportLoading(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/assessment/items/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      if (!res.ok) { setImportResult({ imported: 0, errors: ["Erreur serveur lors de l'import."] }); return; }
      const result = await res.json();
      setImportResult(result);
      if (result.imported > 0) {
        const refreshed = await fetch("/api/assessment/items");
        if (refreshed.ok) setItems(await refreshed.json());
        setCsvText("");
        router.refresh();
      }
    } catch {
      setImportResult({ imported: 0, errors: ["Impossible de joindre le serveur."] });
    } finally {
      setImportLoading(false);
    }
  }

  async function handleJsonImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!jsonFile) return;
    setJsonLoading(true);
    setJsonResult(null);
    try {
      const text = await jsonFile.text();
      const res = await fetch("/api/assessment/import-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: text }),
      });
      if (!res.ok) { setJsonResult({ imported: 0, errors: ["Erreur serveur lors de l'import."] }); return; }
      const result = await res.json();
      setJsonResult(result);
      if (result.imported > 0) {
        const refreshed = await fetch("/api/assessment/items");
        if (refreshed.ok) setItems(await refreshed.json());
        setJsonFile(null);
        router.refresh();
      }
    } catch {
      setJsonResult({ imported: 0, errors: ["Impossible de joindre le serveur."] });
    } finally {
      setJsonLoading(false);
    }
  }

  const banks = [...new Set(items.map((i) => i.bank_id))].sort();
  const filtered = items.filter((i) => {
    if (filterBank && i.bank_id !== filterBank) return false;
    if (filterFormat && i.format !== filterFormat) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="flex gap-1 rounded-xl border border-surface-warm bg-surface p-1 w-fit">
        {(["list", "create", "import", "import-json"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-primary shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            {t === "list" ? "Liste" : t === "create" ? "Nouvelle question" : t === "import" ? "Import CSV" : "Import JSON"}
          </button>
        ))}
      </div>

      {/* ── Liste ── */}
      {tab === "list" && (
        <div className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
              className="rounded-xl border border-surface-warm bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Toutes les banques</option>
              {banks.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="rounded-xl border border-surface-warm bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Tous les formats</option>
              <option value="qcm_single">QCM unique</option>
              <option value="qcm_multi">QCM multiple</option>
              <option value="true_false">Vrai / Faux</option>
            </select>
            {(filterBank || filterFormat) && (
              <button
                type="button"
                onClick={() => { setFilterBank(""); setFilterFormat(""); }}
                className="rounded-xl border border-surface-warm bg-white px-3 py-2 text-sm text-ink-soft hover:text-ink transition-colors"
              >
                Réinitialiser
              </button>
            )}
            <span className="ml-auto self-center text-sm text-ink-soft">
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            </span>
          </div>

          {deleteError && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {deleteError}
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-warm bg-surface p-12 text-center">
              <p className="text-ink-soft mb-4">Aucune question trouvée.</p>
              <button
                type="button"
                onClick={() => setTab("create")}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors"
              >
                Créer la première question
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-warm bg-surface">
                    <th className="px-5 py-3 text-left font-semibold text-ink-soft">Question</th>
                    <th className="px-5 py-3 text-left font-semibold text-ink-soft hidden sm:table-cell">Banque</th>
                    <th className="px-5 py-3 text-left font-semibold text-ink-soft hidden md:table-cell">Format</th>
                    <th className="px-5 py-3 text-left font-semibold text-ink-soft hidden lg:table-cell">Difficulté</th>
                    <th className="px-5 py-3 text-left font-semibold text-ink-soft hidden lg:table-cell">Bloom</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-surface-warm last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink line-clamp-2">
                          {(item.content as any)?.question_fr ?? "—"}
                        </p>
                        {item.concept_tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.concept_tags.map((t) => (
                              <span key={t} className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-soft">{t}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-ink-soft font-mono text-xs hidden sm:table-cell">{item.bank_id}</td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {FORMAT_LABELS[item.format] ?? item.format}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-ink-soft">
                          {item.difficulty}/5 — {DIFFICULTY_LABELS[item.difficulty] ?? ""}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-ink-soft">
                          {item.bloom_level}/6 — {BLOOM_LABELS[item.bloom_level] ?? ""}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {deleteId === item.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-red-600">Confirmer ?</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteLoading}
                              className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {deleteLoading ? "…" : "Oui"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(null)}
                              className="rounded-lg border border-surface-warm px-3 py-1 text-xs font-medium text-ink hover:bg-surface transition-colors"
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            className="rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                          >
                            Supprimer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Nouvelle question ── */}
      {tab === "create" && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-surface-warm bg-white p-8 space-y-5 max-w-2xl">
          <h2 className="text-base font-bold text-ink">Nouvelle question</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bank_id" className="mb-1.5 block text-sm font-medium text-ink">
                Banque (bank_id) <span className="text-red-500">*</span>
              </label>
              <input
                id="bank_id" type="text" required
                value={form.bank_id}
                onChange={(e) => setForm((f) => ({ ...f, bank_id: e.target.value }))}
                placeholder="ex: rgpd-module-1"
                className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="format" className="mb-1.5 block text-sm font-medium text-ink">Format <span className="text-red-500">*</span></label>
              <select
                id="format"
                value={form.format}
                onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as NewItemForm["format"] }))}
                className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="qcm_single">QCM unique</option>
                <option value="qcm_multi">QCM multiple</option>
                <option value="true_false">Vrai / Faux</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="difficulty" className="mb-1.5 block text-sm font-medium text-ink">Difficulté (1–5)</label>
              <select
                id="difficulty"
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: Number(e.target.value) }))}
                className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} — {DIFFICULTY_LABELS[n]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="bloom_level" className="mb-1.5 block text-sm font-medium text-ink">Niveau Bloom (1–6)</label>
              <select
                id="bloom_level"
                value={form.bloom_level}
                onChange={(e) => setForm((f) => ({ ...f, bloom_level: Number(e.target.value) }))}
                className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n} — {BLOOM_LABELS[n]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="concept_tags" className="mb-1.5 block text-sm font-medium text-ink">Tags (séparés par virgule)</label>
            <input
              id="concept_tags" type="text"
              value={form.concept_tags}
              onChange={(e) => setForm((f) => ({ ...f, concept_tags: e.target.value }))}
              placeholder="rgpd, consentement, données-personnelles"
              className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label htmlFor="question_fr" className="mb-1.5 block text-sm font-medium text-ink">
              Question (FR) <span className="text-red-500">*</span>
            </label>
            <textarea
              id="question_fr" required rows={3}
              value={form.question_fr}
              onChange={(e) => setForm((f) => ({ ...f, question_fr: e.target.value }))}
              placeholder="Quelle est la durée maximale de conservation des données personnelles ?"
              className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div>
            <label htmlFor="question_en" className="mb-1.5 block text-sm font-medium text-ink">Question (EN) <span className="text-xs text-ink-soft">optionnel</span></label>
            <input
              id="question_en" type="text"
              value={form.question_en}
              onChange={(e) => setForm((f) => ({ ...f, question_en: e.target.value }))}
              className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {(form.format === "qcm_single" || form.format === "qcm_multi") && (
            <div>
              <label htmlFor="choices_json" className="mb-1.5 block text-sm font-medium text-ink">
                Choix (JSON) <span className="text-xs text-ink-soft">ex: [{`{"label":"A","is_correct":true}`},{`{"label":"B","is_correct":false}`}]</span>
              </label>
              <textarea
                id="choices_json" rows={4}
                value={form.choices_json}
                onChange={(e) => setForm((f) => ({ ...f, choices_json: e.target.value }))}
                placeholder={`[{"label": "A", "is_correct": true}, {"label": "B", "is_correct": false}]`}
                className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm font-mono text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          )}

          {form.format === "true_false" && (
            <div>
              <label htmlFor="correct_answer" className="mb-1.5 block text-sm font-medium text-ink">Bonne réponse</label>
              <select
                id="correct_answer"
                value={form.correct_answer}
                onChange={(e) => setForm((f) => ({ ...f, correct_answer: e.target.value }))}
                className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Sélectionner —</option>
                <option value="true">Vrai</option>
                <option value="false">Faux</option>
              </select>
            </div>
          )}

          {createError && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{createError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit" disabled={createLoading}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors disabled:opacity-50"
            >
              {createLoading ? "Création…" : "Créer la question"}
            </button>
            <button
              type="button" onClick={() => { setForm(EMPTY_FORM); setTab("list"); }}
              className="rounded-xl border border-surface-warm px-6 py-2.5 text-sm font-semibold text-ink hover:bg-surface transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* ── Import JSON ── */}
      {tab === "import-json" && (
        <div className="space-y-5 max-w-2xl">
          <div className="rounded-xl border border-surface-warm bg-surface p-5 text-sm text-ink-soft space-y-2">
            <p className="font-semibold text-ink">Format JSON attendu</p>
            <code className="block rounded bg-white px-3 py-2 text-xs font-mono border border-surface-warm whitespace-pre">
{`{
  "bank_id": "bank-rgpd-2026",
  "items": [
    {
      "format": "qcm_single",
      "difficulty": 2,
      "bloom_level": 3,
      "concept_tags": ["rgpd"],
      "question_fr": "...",
      "choices": [
        { "label": "A", "is_correct": true },
        { "label": "B", "is_correct": false }
      ]
    },
    {
      "format": "true_false",
      "difficulty": 1,
      "bloom_level": 1,
      "concept_tags": ["conformite"],
      "question_fr": "...",
      "correct_answer": "true"
    }
  ]
}`}
            </code>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>format</strong> : qcm_single | qcm_multi | true_false</li>
              <li><strong>difficulty</strong> : 1–5 · <strong>bloom_level</strong> : 1–6</li>
              <li><strong>choices</strong> : tableau requis pour QCM</li>
              <li><strong>correct_answer</strong> : "true" / "false" pour true_false</li>
            </ul>
          </div>

          <form onSubmit={handleJsonImport} className="rounded-2xl border border-surface-warm bg-white p-8 space-y-5">
            <div>
              <label htmlFor="json_file" className="mb-1.5 block text-sm font-medium text-ink">
                Fichier JSON <span className="text-red-500">*</span>
              </label>
              <input
                id="json_file"
                type="file"
                accept=".json,application/json"
                required
                onChange={(e) => { setJsonFile(e.target.files?.[0] ?? null); setJsonResult(null); }}
                className="w-full rounded-xl border border-surface-warm bg-white px-4 py-2.5 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-primary/8 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/12"
              />
              {jsonFile && (
                <p className="mt-1.5 text-xs text-ink-soft">{jsonFile.name} ({(jsonFile.size / 1024).toFixed(1)} Ko)</p>
              )}
            </div>

            {jsonResult && (
              <div className={`rounded-xl px-4 py-3 text-sm ring-1 ${
                jsonResult.errors.length === 0
                  ? "bg-green-50 text-green-700 ring-green-200"
                  : "bg-amber-50 text-amber-700 ring-amber-200"
              }`}>
                <p className="font-semibold mb-1">
                  {jsonResult.imported} question{jsonResult.imported > 1 ? "s" : ""} importée{jsonResult.imported > 1 ? "s" : ""}
                </p>
                {jsonResult.errors.length > 0 && (
                  <ul className="list-disc list-inside text-xs space-y-0.5 mt-1">
                    {jsonResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit" disabled={jsonLoading || !jsonFile}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors disabled:opacity-50"
              >
                {jsonLoading ? "Import…" : "Importer"}
              </button>
              <button
                type="button" onClick={() => { setJsonFile(null); setJsonResult(null); }}
                className="rounded-xl border border-surface-warm px-6 py-2.5 text-sm font-semibold text-ink hover:bg-surface transition-colors"
              >
                Effacer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Import CSV ── */}
      {tab === "import" && (
        <div className="space-y-5 max-w-2xl">
          <div className="rounded-xl border border-surface-warm bg-surface p-5 text-sm text-ink-soft space-y-2">
            <p className="font-semibold text-ink">Format CSV attendu</p>
            <p>En-tête obligatoire :</p>
            <code className="block rounded bg-white px-3 py-2 text-xs font-mono border border-surface-warm">
              bank_id,format,difficulty,bloom_level,concept_tags,question_fr,question_en,correct_answer,choices_json
            </code>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>format</strong> : qcm_single | qcm_multi | true_false</li>
              <li><strong>difficulty</strong> : 1–5</li>
              <li><strong>bloom_level</strong> : 1–6</li>
              <li><strong>concept_tags</strong> : tags séparés par des virgules dans la cellule</li>
              <li><strong>choices_json</strong> : JSON inline pour QCM, ex: {`[{"label":"A","is_correct":true}]`}</li>
            </ul>
          </div>

          <form onSubmit={handleImport} className="rounded-2xl border border-surface-warm bg-white p-8 space-y-5">
            <div>
              <label htmlFor="csv_text" className="mb-1.5 block text-sm font-medium text-ink">
                Contenu CSV <span className="text-red-500">*</span>
              </label>
              <textarea
                id="csv_text" required rows={12}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={"bank_id,format,difficulty,bloom_level,concept_tags,question_fr,correct_answer\nrgpd-m1,true_false,2,1,rgpd,Le RGPD s'applique aux données anonymisées.,false"}
                className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm font-mono text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            {importResult && (
              <div className={`rounded-xl px-4 py-3 text-sm ring-1 ${
                importResult.errors.length === 0
                  ? "bg-green-50 text-green-700 ring-green-200"
                  : "bg-amber-50 text-amber-700 ring-amber-200"
              }`}>
                <p className="font-semibold mb-1">
                  {importResult.imported} question{importResult.imported > 1 ? "s" : ""} importée{importResult.imported > 1 ? "s" : ""}
                </p>
                {importResult.errors.length > 0 && (
                  <ul className="list-disc list-inside text-xs space-y-0.5 mt-1">
                    {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit" disabled={importLoading || !csvText.trim()}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors disabled:opacity-50"
              >
                {importLoading ? "Import…" : "Importer"}
              </button>
              <button
                type="button" onClick={() => { setCsvText(""); setImportResult(null); }}
                className="rounded-xl border border-surface-warm px-6 py-2.5 text-sm font-semibold text-ink hover:bg-surface transition-colors"
              >
                Effacer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
