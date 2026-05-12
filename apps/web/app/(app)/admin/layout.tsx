// Refs: SPEC.md §7, docs/BACKLOG.md §2b — accès via permissions.can().
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { AdminSidebar } from "./AdminSidebar";
import { canAccessAdmin } from "../../../lib/permissions";

export default async function AdminLayout({ children }: { readonly children: React.ReactNode }) {
  const session = await auth();
  const platformRole = (session as any)?.platformRole as string | undefined ?? "learner";
  const displayName = (session as any)?.displayName as string | undefined ?? session?.user?.email ?? "";
  const email = session?.user?.email ?? "";

  // Garde-fou : un learner ne doit pas atteindre /admin/*.
  // canAccessAdmin() couvre super_admin, admin, trainer, manager.
  if (!canAccessAdmin(platformRole)) redirect("/dashboard");

  const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
    super_admin: { label: "Super Admin", cls: "bg-red-100 text-red-700" },
    admin:       { label: "Admin",       cls: "bg-primary/10 text-primary" },
    trainer:     { label: "Formateur",   cls: "bg-blue-50 text-blue-700" },
    manager:     { label: "Manager",     cls: "bg-amber-50 text-amber-700" },
  };
  const badge = ROLE_BADGE[platformRole] ?? { label: platformRole, cls: "bg-surface text-ink-soft" };

  // Page d'accueil selon le rôle.
  const HOME_BY_ROLE: Record<string, string> = {
    trainer: "/trainer",
    manager: "/manager",
  };
  const homeHref = HOME_BY_ROLE[platformRole] ?? "/admin";

  return (
    <div className="flex flex-1 bg-[#f4f5f7]">
      <AdminSidebar
        platformRole={platformRole}
        displayName={displayName}
        email={email}
        badge={badge}
        homeHref={homeHref}
      />
      {/* ── Contenu principal ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main id="admin-main" className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
