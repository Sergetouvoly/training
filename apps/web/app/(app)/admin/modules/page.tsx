// Refs: SPEC-CONTENT.md §6.1 — liste modules admin avec recherche et filtres
import { redirect } from "next/navigation";
import { getApiClient, getPermissions } from "../../../../lib/api";
import { can } from "../../../../lib/permissions";
import Link from "next/link";
import { DeleteButton } from "../DeleteButton";
import { ModuleListFilter } from "./ModuleListFilter";

export default async function AdminModulesPage() {
  const permissions = await getPermissions();
  if (!can(permissions, "view.admin_modules")) redirect("/dashboard");
  const canDelete = can(permissions, "module.delete");
  const api = await getApiClient();

  const [modules, competences] = await Promise.all([
    api.learning.listModules().catch(() => [] as Awaited<ReturnType<typeof api.learning.listModules>>),
    api.competence.list().catch(() => [] as Awaited<ReturnType<typeof api.competence.list>>),
  ]);

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-ink-soft" aria-label="Fil d'Ariane">
            <Link href="/admin" className="hover:text-primary transition-colors">Administration</Link>
            <span aria-hidden="true">›</span>
            <span className="text-ink">Modules</span>
          </nav>
          <h1 className="text-2xl font-extrabold text-primary-deep">Modules de formation</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {modules.length} module{modules.length > 1 ? "s" : ""} · {published} publié{published > 1 ? "s" : ""} · {totalLessons} leçon{totalLessons > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/modules/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau module
        </Link>
      </div>

      <ModuleListFilter
        modules={modules}
        competences={competences}
        canDelete={canDelete}
        DeleteButton={DeleteButton}
      />
    </div>
  );
}


