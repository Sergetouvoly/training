// Refs: SPEC-CONTENT.md §6.1 — liste parcours admin
import { redirect } from "next/navigation";
import { getApiClient, getPlatformRole } from "../../../../lib/api";
import Link from "next/link";
import { DeleteButton } from "../DeleteButton";

const CONTENT_ROLES = new Set(["super_admin", "admin", "trainer"]);

const ROLE_LABELS: Record<string, string> = {
  all: "Tous",
  hr: "RH",
  developer: "Dev",
  manager: "Manager",
  finance: "Finance",
};

export default async function AdminPathsPage() {
  const platformRole = await getPlatformRole();
  if (!CONTENT_ROLES.has(platformRole)) redirect("/dashboard");
  const canDelete = platformRole === "admin" || platformRole === "super_admin";

  const api = await getApiClient();
  const [paths, modules] = await Promise.all([
    api.learning.listPaths().catch(() => [] as Awaited<ReturnType<typeof api.learning.listPaths>>),
    api.learning.listModules().catch(() => [] as Awaited<ReturnType<typeof api.learning.listModules>>),
  ]);

  const moduleMap = Object.fromEntries(modules.map((m) => [m.id, m]));

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-ink-soft" aria-label="Fil d'Ariane">
            <Link href="/admin" className="hover:text-primary transition-colors">Administration</Link>
            <span aria-hidden="true">›</span>
            <span className="text-ink">Parcours</span>
          </nav>
          <h1 className="text-2xl font-extrabold text-primary-deep">Parcours de formation</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {paths.length} parcours · {paths.filter((p) => p.is_mandatory).length} obligatoires
          </p>
        </div>
        <Link
          href="/admin/paths/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau parcours
        </Link>
      </div>

      {/* Liste */}
      {paths.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-warm bg-surface p-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
              <path d="M3 3h18M3 12h18M3 21h18" /><path d="M7 7l5 5-5 5" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-primary-deep mb-2">Aucun parcours</p>
          <p className="text-sm text-ink-soft mb-6 max-w-sm mx-auto">
            Assemblez des modules en parcours de formation, définissez le public cible et rendez-les obligatoires si nécessaire.
          </p>
          <Link href="/admin/paths/new" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-deep transition-colors">
            Créer un parcours
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((path) => {
            const pathModules = path.module_sequence
              .map((id) => moduleMap[id])
              .filter(Boolean);
            const totalMin = pathModules.reduce(
              (acc, m) => acc + (m?.content_fr?.estimated_duration_minutes ?? 0),
              0,
            );

            return (
              <div key={path.id} className="group rounded-2xl border border-surface-warm bg-white p-6 hover:border-primary/30 hover:shadow-sm transition-all flex flex-col">
                {/* Badges */}
                <div className="mb-3 flex items-center gap-2 flex-wrap">
                  <span className="rounded-full border border-surface-warm px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                    {ROLE_LABELS[path.target_role] ?? path.target_role}
                  </span>
                  {path.is_mandatory && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                      Obligatoire
                    </span>
                  )}
                </div>

                {/* Titre */}
                <h2 className="font-bold text-primary-deep group-hover:text-primary transition-colors leading-snug mb-3">
                  {path.title_fr}
                </h2>

                {/* Modules séquence */}
                <ol className="flex-1 space-y-1.5 mb-5">
                  {pathModules.slice(0, 4).map((mod, i) => (
                    <li key={mod?.id ?? i} className="flex items-start gap-2 text-xs text-ink-soft">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-warm text-[10px] font-bold text-ink">
                        {i + 1}
                      </span>
                      <span className="truncate">{mod?.title_fr ?? "—"}</span>
                    </li>
                  ))}
                  {pathModules.length > 4 && (
                    <li className="text-xs text-ink-soft pl-6">+{pathModules.length - 4} autres modules</li>
                  )}
                </ol>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-surface-warm pt-4">
                  <p className="text-xs text-ink-soft">
                    {path.module_sequence.length} module{path.module_sequence.length > 1 ? "s" : ""}
                    {totalMin > 0 ? ` · ~${totalMin} min` : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/paths/${path.id}`}
                      className="rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
                    >
                      Éditer
                    </Link>
                    {canDelete && (
                      <DeleteButton
                        deleteUrl={`/api/learning/paths/${path.id}`}
                        label="Supprimer"
                        redirectTo="/admin/paths"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
