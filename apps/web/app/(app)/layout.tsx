// Refs: SPEC.md §8 — WCAG AA, i18n obligatoire
import { Nav } from "@elearning/ui";
import { fr } from "@elearning/i18n";
import { auth } from "../../auth";
import { getApiClient } from "../../lib/api";
import { doSignOut } from "./actions";

// ── Icônes ───────────────────────────────────────────────────────────────────

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

// ── Nav par rôle ──────────────────────────────────────────────────────────────
// admin / trainer / manager ont leur propre sidebar — le header top est épuré (items vides).
// Seul learner a une nav dans le header top.

function navForRole(role: string) {
  if (role === "learner") {
    return [
      { href: "/dashboard",  label: "Tableau de bord",  icon: <IconDashboard /> },
      { href: "/parcours",   label: "Mes parcours",      icon: <IconParcours /> },
      { href: "/profil",     label: "Mon profil",        icon: <IconProfil /> },
    ];
  }
  return []; // sidebar gère la nav pour ces rôles
}

function logoHrefForRole(role: string) {
  const map: Record<string, string> = {
    super_admin: "/admin",
    admin:       "/admin",
    trainer:     "/trainer",
    manager:     "/manager",
  };
  return map[role] ?? "/dashboard";
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default async function AppLayout({ children }: { readonly children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const displayName = (session as any)?.displayName as string | undefined ?? email.split("@")[0] ?? "U";
  const initial = displayName.charAt(0).toUpperCase() || "U";
  const platformRole = (session as any)?.platformRole as string | undefined ?? "learner";
  const ROLE_LABELS: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Administrateur",
    trainer: "Formateur",
    manager: "Manager",
    learner: "Apprenant",
  };

  const notifications = await getApiClient()
    .then((api) => api.notification.list(true))
    .catch(() => [] as Awaited<ReturnType<Awaited<ReturnType<typeof getApiClient>>["notification"]["list"]>>);
  const unreadCount = notifications.length;

  const navItems = navForRole(platformRole);
  const logoHref = logoHrefForRole(platformRole);

  // Les rôles avec sidebar gèrent leur propre layout — pas de wrapper main ici.
  const hasSidebar = platformRole !== "learner";

  return (
    <div className={hasSidebar ? "flex min-h-screen flex-col bg-surface" : "min-h-screen bg-surface"}>
      <Nav
        items={navItems}
        logoLabel="Holenek"
        logoHref={logoHref}
        userInitial={initial}
        userEmail={email}
        userRole={ROLE_LABELS[platformRole] ?? platformRole}
        unreadNotifications={unreadCount}
        signOutAction={doSignOut}
      />
      {hasSidebar ? (
        <div className="flex flex-1 overflow-hidden">
          {children}
        </div>
      ) : (
        <main id="main-content" className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </main>
      )}
    </div>
  );
}
