// Refs: SPEC-CONTENT.md §6.1 — création parcours admin
import { redirect } from "next/navigation";
import { getApiClient, getPlatformRole } from "../../../../../lib/api";
import { NewPathForm } from "./NewPathForm";
import Link from "next/link";

const CONTENT_ROLES = new Set(["super_admin", "admin", "trainer"]);

export default async function NewPathPage() {
  const platformRole = await getPlatformRole();
  if (!CONTENT_ROLES.has(platformRole)) redirect("/dashboard");

  const api = await getApiClient();
  const modules = await api.learning.listModules().catch(() => [] as Awaited<ReturnType<typeof api.learning.listModules>>);

  return (
    <div className="max-w-2xl">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-ink-soft" aria-label="Fil d'Ariane">
        <Link href="/admin" className="hover:text-primary transition-colors">Administration</Link>
        <span aria-hidden="true">›</span>
        <Link href="/admin/paths" className="hover:text-primary transition-colors">Parcours</Link>
        <span aria-hidden="true">›</span>
        <span className="text-ink">Nouveau</span>
      </nav>

      <h1 className="text-2xl font-extrabold text-primary-deep mb-1">Nouveau parcours</h1>
      <p className="text-sm text-ink-soft mb-8">
        Assemblez des modules en séquence et définissez le public cible.
      </p>

      <NewPathForm modules={modules} />
    </div>
  );
}
