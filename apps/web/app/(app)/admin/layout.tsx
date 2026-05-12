// Refs: SPEC.md §7 — platform_role: super_admin, admin uniquement
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { AdminSidebar } from "./AdminSidebar";

// trainer a accès aux pages contenu (modules, parcours lecture, questions) mais pas à la gestion users/système
const ADMIN_ROLES = new Set(["super_admin", "admin", "trainer"]);

export default async function AdminLayout({ children }: { readonly children: React.ReactNode }) {
  const session = await auth();
  const platformRole = (session as any)?.platformRole as string | undefined ?? "learner";
  const displayName = (session as any)?.displayName as string | undefined ?? session?.user?.email ?? "";
  const email = session?.user?.email ?? "";

  if (!ADMIN_ROLES.has(platformRole)) redirect("/dashboard");

  const isSuperAdmin = platformRole === "super_admin";
  const isTrainer = platformRole === "trainer";

  const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
    super_admin: { label: "Super Admin", cls: "bg-red-100 text-red-700" },
    admin:       { label: "Admin",       cls: "bg-primary/10 text-primary" },
    trainer:     { label: "Formateur",   cls: "bg-blue-50 text-blue-700" },
  };
  const badge = ROLE_BADGE[platformRole] ?? { label: platformRole, cls: "bg-surface text-ink-soft" };
  const homeHref = isTrainer ? "/trainer" : "/admin";

  return (
    <div className="flex flex-1 bg-[#f4f5f7]">
      <AdminSidebar
        isSuperAdmin={isSuperAdmin}
        isTrainer={isTrainer}
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
