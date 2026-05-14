// Refs: SPEC.md §8 — admin édite le contenu sans code
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getApiClient, getPermissions } from "../../../../../lib/api";
import { can } from "../../../../../lib/permissions";
import { AdminModuleEditorClient } from "./AdminModuleEditorClient";

export default async function AdminModulePage({
  params,
}: {
  readonly params: Promise<{ moduleId: string }>;
}) {
  const [{ moduleId }, permissions] = await Promise.all([params, getPermissions()]);
  if (!can(permissions, "view.admin_modules")) redirect("/dashboard");

  const api = await getApiClient();
  const mod = await api.learning.getModule(moduleId).catch(() => null);
  if (!mod) notFound();

  return (
    <section aria-labelledby="admin-module-title">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 id="admin-module-title" className="text-2xl font-bold text-primary-deep">
            Édition du module
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{mod.title_fr}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/assessment?bank=${moduleId}`}
            className="rounded-xl border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-primary hover:border-primary/30 transition-colors"
          >
            Questions d'évaluation →
          </Link>
          <span className="rounded-full bg-surface px-3 py-1 text-xs text-ink-soft">
            v{mod.version} · {mod.version_hash.slice(0, 16)}…
          </span>
        </div>
      </div>

      <AdminModuleEditorClient module={mod} />
    </section>
  );
}

