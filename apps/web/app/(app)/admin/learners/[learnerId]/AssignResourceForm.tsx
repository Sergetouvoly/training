"use client";
// Refs: SPEC.md §7 assignment.create — assigner un module ou parcours à un apprenant
import { useState } from "react";
import type { Module, LearningPath } from "@elearning/api-client";
import { fr } from "@elearning/i18n";

interface Props {
  readonly learnerId: string;
  readonly modules: Module[];
  readonly paths: LearningPath[];
}

export function AssignResourceForm({ learnerId, modules, paths }: Props) {
  const t = fr;
  const [resourceType, setResourceType] = useState<"module" | "path">("path");
  const [resourceId, setResourceId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "conflict" | "error">("idle");

  const options = resourceType === "path" ? paths : modules;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resourceId) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignee_id: learnerId,
          resource_type: resourceType,
          resource_id: resourceId,
          due_date: dueDate || null,
        }),
      });
      if (res.status === 409) { setStatus("conflict"); return; }
      if (!res.ok) { setStatus("error"); return; }
      setStatus("success");
      setResourceId("");
      setDueDate("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-surface-warm bg-white p-5">
      <h3 className="mb-4 text-sm font-bold text-primary-deep">{t.assignments.createAssignment}</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="assign-type" className="mb-1 block text-xs font-medium text-ink-soft">
            {t.assignments.resourceType}
          </label>
          <select
            id="assign-type"
            value={resourceType}
            onChange={(e) => { setResourceType(e.target.value as "module" | "path"); setResourceId(""); }}
            className="w-full rounded-lg border border-surface-warm bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="path">Parcours</option>
            <option value="module">Module</option>
          </select>
        </div>

        <div>
          <label htmlFor="assign-resource" className="mb-1 block text-xs font-medium text-ink-soft">
            {t.assignments.resource}
          </label>
          <select
            id="assign-resource"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            className="w-full rounded-lg border border-surface-warm bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          >
            <option value="">— Choisir —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.title_fr}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="assign-due" className="mb-1 block text-xs font-medium text-ink-soft">
            {t.assignments.dueDateOptional}
          </label>
          <input
            id="assign-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-lg border border-surface-warm bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={!resourceId || status === "loading"}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-deep disabled:opacity-50"
        >
          {status === "loading" ? "En cours…" : t.assignments.createAssignment}
        </button>
        {status === "success" && (
          <span className="text-xs font-medium text-green-700" role="status">{t.assignments.assignSuccess}</span>
        )}
        {status === "conflict" && (
          <span className="text-xs font-medium text-amber-700" role="alert">{t.assignments.alreadyAssigned}</span>
        )}
        {status === "error" && (
          <span className="text-xs font-medium text-red-700" role="alert">Erreur lors de l'assignation</span>
        )}
      </div>
    </form>
  );
}
