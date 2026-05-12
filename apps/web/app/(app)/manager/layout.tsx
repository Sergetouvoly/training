// Refs: docs/BACKLOG.md §2b — chrome unifié (sidebar admin) pour l'espace manager.
// La sidebar filtre via permissions.can() : un manager voit Apprenants (lecture).
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { AdminSidebar } from "../admin/AdminSidebar";
import { canAccessManagerSpace } from "../../../lib/permissions";

export default async function ManagerLayout({ children }: { readonly children: React.ReactNode }) {
  const session = await auth();
  const platformRole = (session as any)?.platformRole as string | undefined ?? "learner";
  const displayName = (session as any)?.displayName as string | undefined ?? session?.user?.email ?? "";
  const email = session?.user?.email ?? "";

  if (!canAccessManagerSpace(platformRole)) redirect("/dashboard");

  const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
    super_admin: { label: "Super Admin", cls: "bg-red-100 text-red-700" },
    admin:       { label: "Admin",       cls: "bg-primary/10 text-primary" },
    manager:     { label: "Manager",     cls: "bg-amber-50 text-amber-700" },
  };
  const badge = ROLE_BADGE[platformRole] ?? { label: platformRole, cls: "bg-surface text-ink-soft" };

  return (
    <div className="flex flex-1 bg-[#f4f5f7]">
      <AdminSidebar
        platformRole={platformRole}
        displayName={displayName}
        email={email}
        badge={badge}
        homeHref="/manager"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
