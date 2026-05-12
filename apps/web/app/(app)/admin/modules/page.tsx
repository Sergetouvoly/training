// Refs: SPEC-CONTENT.md §6.1 — liste modules admin
import { redirect } from "next/navigation";
import { getApiClient, getPlatformRole } from "../../../../lib/api";
import Link from "next/link";
import { DeleteButton } from "../DeleteButton";

const CONTENT_ROLES = new Set(["super_admin", "admin", "trainer"]);

export default async function AdminModulesPage() {
  const platformRole = await getPlatformRole();
  if (!CONTENT_ROLES.has(platformRole)) redirect("/dashboard");
  const canDelete = platformRole === "admin" || platformRole === "super_admin";
  const api = await getApiClient();
  const modules = await api.learning.listModules().catch(() => [] as Awaited<ReturnType<typeof api.learning.listModules>>);

  const published = modules.filter((m) => m.content_fr !== null).length;
  const totalLessons = modules.reduce((acc, m) => acc + (m.content_fr?.lessons.length ?? 0), 0);

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

      {/* Liste */}
      {modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-warm bg-surface p-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v17H6.5A2.5 2.5 0 0 1 4 19.5z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-primary-deep mb-2">Aucun module pour l'instant</p>
          <p className="text-sm text-ink-soft mb-6 max-w-sm mx-auto">
            Créez votre premier module de formation et ajoutez des leçons, des images, des vidéos et des quiz.
          </p>
          <Link href="/admin/modules/new" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-deep transition-colors">
            Créer le premier module
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-warm bg-surface">
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft">Module</th>
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft hidden sm:table-cell">Leçons</th>
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft hidden md:table-cell">Durée</th>
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft hidden lg:table-cell">Version</th>
                <th className="px-5 py-3.5 text-left font-semibold text-ink-soft">Statut</th>
                <th className="px-5 py-3.5 text-right font-semibold text-ink-soft">Actions</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => (
                <tr key={mod.id} className="border-b border-surface-warm last:border-0 hover:bg-surface/40 transition-colors group">
                  <td className="px-5 py-4">
                    <p className="font-medium text-ink group-hover:text-primary transition-colors">{mod.title_fr}</p>
                    <p className="text-xs text-ink-soft mt-0.5 font-mono">{mod.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-5 py-4 text-ink-soft hidden sm:table-cell tabular-nums">
                    {mod.content_fr?.lessons.length ?? 0}
                  </td>
                  <td className="px-5 py-4 text-ink-soft hidden md:table-cell">
                    {mod.content_fr ? `~${mod.content_fr.estimated_duration_minutes} min` : "—"}
                  </td>
                  <td className="px-5 py-4 text-ink-soft hidden lg:table-cell font-mono text-xs">
                    v{mod.version}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      mod.content_fr
                        ? "bg-green-50 text-green-700"
                        : "bg-surface text-ink-soft"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${mod.content_fr ? "bg-green-500" : "bg-muted"}`} aria-hidden="true" />
                      {mod.content_fr ? "Publié" : "Brouillon"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/admin/modules/${mod.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-all"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        Éditer
                      </Link>
                      {canDelete && (
                        <DeleteButton
                          deleteUrl={`/api/learning/modules/${mod.id}`}
                          label="Supprimer"
                          redirectTo="/admin/modules"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
