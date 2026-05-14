// Refs: SPEC-CONTENT.md §6.1 — édition parcours admin
import { redirect, notFound } from "next/navigation";
import { getApiClient, getPermissions } from "../../../../../lib/api";
import { can } from "../../../../../lib/permissions";
import { EditPathForm } from "./EditPathForm";
import Link from "next/link";

export default async function EditPathPage({
  params,
}: {
  readonly params: Promise<{ pathId: string }>;
}) {
  const [{ pathId }, permissions] = await Promise.all([params, getPermissions()]);
  if (!can(permissions, "view.admin_paths")) redirect("/dashboard");

  const api = await getApiClient();

  const [path, modules] = await Promise.all([
    api.learning.getPath(pathId).catch(() => null),
    api.learning.listModules().catch(() => [] as Awaited<ReturnType<typeof api.learning.listModules>>),
  ]);

  if (!path) notFound();

  return (
    <div className="max-w-2xl">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-ink-soft" aria-label="Fil d'Ariane">
        <Link href="/admin" className="hover:text-primary transition-colors">Administration</Link>
        <span aria-hidden="true">›</span>
        <Link href="/admin/paths" className="hover:text-primary transition-colors">Parcours</Link>
        <span aria-hidden="true">›</span>
        <span className="text-ink truncate max-w-[200px]">{path.title_fr}</span>
      </nav>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-deep">{path.title_fr}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {path.module_sequence.length} module{path.module_sequence.length > 1 ? "s" : ""} · {path.target_role}
            {path.is_mandatory ? " · Obligatoire" : ""}
          </p>
        </div>
      </div>

      <EditPathForm path={path} modules={modules} />
    </div>
  );
}

