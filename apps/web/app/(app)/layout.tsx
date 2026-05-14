// Refs: SPEC.md §8 — WCAG AA, i18n obligatoire
import { Nav } from "@elearning/ui";
import { auth } from "../../auth";
import { getApiClient, getPermissions } from "../../lib/api";
import { can, canAccessAdmin } from "../../lib/permissions";
import { AdminSidebar } from "./admin/AdminSidebar";
import { doSignOut } from "./actions";

// ── Icônes topbar learner ─────────────────────────────────────────────────────

const IconDashboard = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
  </svg>
);
const IconParcours = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);
const IconProfil = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
const IconNotif = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

function navFromPermissions(permissions: readonly string[]) {
  const items: { href: string; label: string; icon: React.ReactNode }[] = [];
  if (can(permissions, "view.learner_dashboard"))
    items.push({ href: "/dashboard",     label: "Tableau de bord", icon: <IconDashboard /> });
  if (can(permissions, "view.learner_parcours"))
    items.push({ href: "/parcours",      label: "Mes parcours",    icon: <IconParcours /> });
  if (can(permissions, "view.learner_profil"))
    items.push({ href: "/profil",        label: "Mon profil",      icon: <IconProfil /> });
  if (can(permissions, "view.learner_notifications"))
    items.push({ href: "/notifications", label: "Notifications",   icon: <IconNotif /> });
  return items;
}

function logoHrefFromPermissions(permissions: readonly string[]): string {
  if (can(permissions, "view.admin"))              return "/admin";
  if (can(permissions, "view.trainer_space"))      return "/trainer";
  if (can(permissions, "view.manager_space"))      return "/manager";
  if (can(permissions, "view.learner_dashboard"))  return "/dashboard";
  return "/dashboard";
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default async function AppLayout({ children }: { readonly children: React.ReactNode }) {
  const [session, permissions] = await Promise.all([auth(), getPermissions()]);

  const email        = session?.user?.email ?? "";
  const displayName  = (session as any)?.displayName as string | undefined ?? email.split("@")[0] ?? "U";
  const platformRole = (session as any)?.platformRole as string | undefined ?? "learner";

  const notifications = await getApiClient()
    .then((api) => api.notification.list(true))
    .catch(() => [] as Awaited<ReturnType<Awaited<ReturnType<typeof getApiClient>>["notification"]["list"]>>);
  const unreadCount = notifications.length;

  // Utilisateurs avec accès admin → sidebar persistante sur toutes les routes (app)
  const hasSidebar = canAccessAdmin(permissions);

  const logoHref = logoHrefFromPermissions(permissions);
  // Topbar nav : uniquement pour les learners purs (pas de sidebar)
  const navItems = hasSidebar ? [] : navFromPermissions(permissions);

  const ROLE_LABELS: Record<string, string> = {
    super_admin: "Super Admin", admin: "Administrateur",
    trainer: "Formateur", manager: "Manager", learner: "Apprenant",
  };
  const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
    super_admin: { label: "Super Admin", cls: "bg-red-100 text-red-700" },
    admin:       { label: "Admin",       cls: "bg-primary/10 text-primary" },
    trainer:     { label: "Formateur",   cls: "bg-blue-50 text-blue-700" },
    manager:     { label: "Manager",     cls: "bg-amber-50 text-amber-700" },
  };
  const badge    = ROLE_BADGE[platformRole] ?? { label: platformRole, cls: "bg-surface text-ink-soft" };
  const homeHref = platformRole === "trainer" ? "/trainer" : platformRole === "manager" ? "/manager" : "/admin";

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Nav
        items={navItems}
        logoLabel="Holenek"
        logoHref={logoHref}
        userInitial={displayName.charAt(0).toUpperCase() || "U"}
        userEmail={email}
        userRole={ROLE_LABELS[platformRole] ?? platformRole}
        unreadNotifications={unreadCount}
        signOutAction={doSignOut}
      />

      {hasSidebar ? (
        // Shell avec sidebar persistante — couvre /admin/*, /trainer, /manager, /parcours, etc.
        <div className="flex flex-1 overflow-hidden bg-[#f4f5f7]">
          <AdminSidebar
            platformRole={platformRole}
            permissions={permissions}
            displayName={displayName}
            email={email}
            badge={badge}
            homeHref={homeHref}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <main id="main-content" className="flex-1 overflow-y-auto p-8">
              {children}
            </main>
          </div>
        </div>
      ) : (
        // Shell sans sidebar — learner pur
        <main id="main-content" className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </main>
      )}
    </div>
  );
}
