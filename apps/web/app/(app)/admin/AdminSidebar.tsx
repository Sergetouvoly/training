"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { can, type Permission } from "../../../lib/permissions";

const STORAGE_KEY_COLLAPSED = "holenek_sidebar_collapsed";
const STORAGE_KEY_OPEN      = "holenek_sidebar_open_groups";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavLeaf = {
  kind: "leaf";
  href: string;
  label: string;
  action: Permission;
  icon: React.ReactNode;
};

type NavGroup = {
  kind: "group";
  label: string;
  icon: React.ReactNode;
  // action requis pour voir le groupe (au moins une action enfant doit matcher)
  action: Permission;
  // href optionnel pour le parent lui-même (cliquable + sous-items)
  href?: string;
  children: NavLeaf[];
};

type NavItem = NavLeaf | NavGroup;

type NavSection = {
  label: string;
  items: NavItem[];
};

// ─── Icônes ───────────────────────────────────────────────────────────────────

const ICONS = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
      <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
    </svg>
  ),
  learners: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  modules: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v17H6.5A2.5 2.5 0 0 1 4 19.5z"/>
    </svg>
  ),
  paths: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/>
      <path d="M7 12h6a2 2 0 0 1 2 2v1m0-6V7a2 2 0 0 0-2-2H7"/>
    </svg>
  ),
  competences: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  assessment: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  roles: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  lock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  ),
  config: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  trainer: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  manager: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  parcours: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18M3 6h18M3 18h18"/><polyline points="8 8 4 12 8 16"/>
    </svg>
  ),
  eval: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  profil: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  notifications: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  chevron: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
};

// ─── Structure de navigation ──────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Tableau de bord",
    items: [
      { kind: "leaf", href: "__HOME__", label: "Vue d'ensemble", action: "view.admin", icon: ICONS.dashboard },
    ],
  },
  {
    label: "Utilisateurs",
    items: [
      {
        kind: "group",
        label: "Comptes",
        icon: ICONS.users,
        action: "view.admin_users",
        href: "/admin/users",
        children: [
          { kind: "leaf", href: "/admin/users", label: "Liste des comptes", action: "view.admin_users", icon: ICONS.users },
          { kind: "leaf", href: "/admin/users/new", label: "Nouveau compte", action: "view.admin_users", icon: ICONS.users },
        ],
      },
      { kind: "leaf", href: "/admin/learners", label: "Apprenants", action: "view.admin_learners", icon: ICONS.learners },
    ],
  },
  {
    label: "Contenu",
    items: [
      {
        kind: "group",
        label: "Modules",
        icon: ICONS.modules,
        action: "view.admin_modules",
        href: "/admin/modules",
        children: [
          { kind: "leaf", href: "/admin/modules", label: "Tous les modules", action: "view.admin_modules", icon: ICONS.modules },
          { kind: "leaf", href: "/admin/modules/new", label: "Nouveau module", action: "view.admin_modules", icon: ICONS.modules },
        ],
      },
      {
        kind: "group",
        label: "Parcours",
        icon: ICONS.paths,
        action: "view.admin_paths",
        href: "/admin/paths",
        children: [
          { kind: "leaf", href: "/admin/paths", label: "Tous les parcours", action: "view.admin_paths", icon: ICONS.paths },
          { kind: "leaf", href: "/admin/paths/new", label: "Nouveau parcours", action: "view.admin_paths", icon: ICONS.paths },
        ],
      },
      { kind: "leaf", href: "/admin/competences", label: "Compétences", action: "view.admin_competences", icon: ICONS.competences },
      { kind: "leaf", href: "/admin/assessment", label: "Questions", action: "view.admin_assessment", icon: ICONS.assessment },
    ],
  },
  {
    label: "Système",
    items: [
      {
        kind: "group",
        label: "Accès & Rôles",
        icon: ICONS.roles,
        action: "view.admin_roles",
        children: [
          { kind: "leaf", href: "/admin/roles", label: "Rôles", action: "view.admin_roles", icon: ICONS.roles },
          { kind: "leaf", href: "/admin/permissions", label: "Permissions", action: "role.read", icon: ICONS.lock },
        ],
      },
      { kind: "leaf", href: "/admin/trash", label: "Corbeille", action: "view.admin_trash", icon: ICONS.trash },
      { kind: "leaf", href: "/admin/config", label: "Configuration", action: "view.admin_config", icon: ICONS.config },
    ],
  },
  {
    label: "Espaces",
    items: [
      {
        kind: "group",
        label: "Espaces dédiés",
        icon: ICONS.trainer,
        action: "view.trainer_space",
        children: [
          { kind: "leaf", href: "/trainer", label: "Espace formateur", action: "view.trainer_space", icon: ICONS.trainer },
          { kind: "leaf", href: "/manager", label: "Espace manager",   action: "view.manager_space", icon: ICONS.manager },
        ],
      },
      {
        kind: "group",
        label: "Espace apprenant",
        icon: ICONS.learners,
        action: "view.learner_dashboard",
        children: [
          { kind: "leaf", href: "/dashboard",     label: "Tableau de bord",  action: "view.learner_dashboard",     icon: ICONS.dashboard },
          { kind: "leaf", href: "/parcours",      label: "Mes parcours",     action: "view.learner_parcours",      icon: ICONS.parcours },
          { kind: "leaf", href: "/module/catalogue", label: "Modules",          action: "view.learner_modules",       icon: ICONS.modules },
          { kind: "leaf", href: "/eval",          label: "Évaluations",      action: "view.learner_eval",          icon: ICONS.eval },
          { kind: "leaf", href: "/profil",        label: "Mon profil",       action: "view.learner_profil",        icon: ICONS.profil },
          { kind: "leaf", href: "/notifications", label: "Notifications",    action: "view.learner_notifications", icon: ICONS.notifications },
        ],
      },
    ],
  },
];

// ─── Composant principal ──────────────────────────────────────────────────────

interface SidebarProps {
  readonly platformRole: string;
  readonly permissions: readonly string[];
  readonly displayName: string;
  readonly email: string;
  readonly badge: { label: string; cls: string };
  readonly homeHref: string;
}

export function AdminSidebar({ platformRole, permissions, displayName, email, badge, homeHref }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Hydratation depuis localStorage
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY_COLLAPSED) === "1");
      const stored = localStorage.getItem(STORAGE_KEY_OPEN);
      if (stored) setOpenGroups(new Set(JSON.parse(stored) as string[]));
    } catch { /* ignore */ }
  }, []);

  // Auto-ouvrir le groupe contenant la route active
  useEffect(() => {
    NAV_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        if (item.kind === "group") {
          const isActive = item.children.some((c) => pathname.startsWith(c.href));
          if (isActive) {
            setOpenGroups((prev) => {
              if (prev.has(item.label)) return prev;
              const next = new Set(prev);
              next.add(item.label);
              persist(next);
              return next;
            });
          }
        }
      });
    });
  }, [pathname]);

  function persist(groups: Set<string>) {
    try { localStorage.setItem(STORAGE_KEY_OPEN, JSON.stringify([...groups])); } catch { /* ignore */ }
  }

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem(STORAGE_KEY_COLLAPSED, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) { next.delete(label); } else { next.add(label); }
      persist(next);
      return next;
    });
  }

  function isLeafActive(href: string) {
    if (href === "__HOME__") return pathname === homeHref;
    return pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
  }

  return (
    <aside
      className={`flex ${collapsed ? "w-14" : "w-56"} shrink-0 flex-col border-r border-surface-warm bg-white transition-[width] duration-200`}
      aria-label="Sidebar administration"
    >
      {/* ── En-tête logo ── */}
      <div className="flex h-14 items-center border-b border-surface-warm px-3 gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {!collapsed && (
          <>
            <span className="text-sm font-bold text-primary-deep whitespace-nowrap">Holenek</span>
            <span className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-surface text-ink-soft">
              {platformRole === "trainer" ? "Contenu" : platformRole === "manager" ? "Équipe" : "Admin"}
            </span>
          </>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Développer" : "Réduire"}
          aria-label={collapsed ? "Développer la sidebar" : "Réduire la sidebar"}
          className={`${collapsed ? "mx-auto mt-1" : "ml-1"} flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-surface hover:text-primary transition-colors`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {collapsed
              ? <><polyline points="9 18 15 12 9 6"/><polyline points="15 18 21 12 15 6"/></>
              : <><polyline points="15 18 9 12 15 6"/><polyline points="9 18 3 12 9 6"/></>
            }
          </svg>
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4" style={{ padding: collapsed ? "12px 6px" : "12px 8px" }} aria-label="Navigation administration">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (item.kind === "leaf") return can(permissions, item.action);
            return item.children.some((c) => can(permissions, c.action));
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              {!collapsed && (
                <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-ink-soft/50">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  if (item.kind === "leaf") {
                    const href = item.href === "__HOME__" ? homeHref : item.href;
                    const active = isLeafActive(href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={href}
                          title={collapsed ? item.label : undefined}
                          className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                            active
                              ? "bg-primary/8 text-primary font-semibold"
                              : "text-ink-soft hover:bg-surface hover:text-primary-deep"
                          } ${collapsed ? "justify-center" : ""}`}
                        >
                          <span className={`shrink-0 transition-colors ${active ? "text-primary" : "text-ink-soft/60 group-hover:text-primary"}`}>
                            {item.icon}
                          </span>
                          {!collapsed && <span className="truncate">{item.label}</span>}
                          {!collapsed && active && (
                            <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          )}
                        </Link>
                      </li>
                    );
                  }

                  // ── Groupe avec sous-items ──
                  const visibleChildren = item.children.filter((c) => can(permissions, c.action));
                  if (visibleChildren.length === 0) return null;

                  const isOpen = openGroups.has(item.label);
                  const isGroupActive = visibleChildren.some((c) => isLeafActive(c.href));

                  return (
                    <li key={item.label}>
                      {collapsed ? (
                        // En mode réduit : le groupe devient un lien direct vers href ou le premier enfant
                        <Link
                          href={item.href ?? visibleChildren[0]!.href}
                          title={item.label}
                          className={`group flex items-center justify-center rounded-lg px-2 py-2 transition-colors ${
                            isGroupActive ? "bg-primary/8 text-primary" : "text-ink-soft hover:bg-surface hover:text-primary-deep"
                          }`}
                        >
                          <span className={`shrink-0 transition-colors ${isGroupActive ? "text-primary" : "text-ink-soft/60 group-hover:text-primary"}`}>
                            {item.icon}
                          </span>
                        </Link>
                      ) : (
                        <>
                          {/* Déclencheur du groupe */}
                          <button
                            type="button"
                            onClick={() => toggleGroup(item.label)}
                            aria-expanded={isOpen}
                            className={`group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                              isGroupActive && !isOpen
                                ? "bg-primary/8 text-primary"
                                : "text-ink-soft hover:bg-surface hover:text-primary-deep"
                            }`}
                          >
                            <span className={`shrink-0 transition-colors ${isGroupActive ? "text-primary" : "text-ink-soft/60 group-hover:text-primary"}`}>
                              {item.icon}
                            </span>
                            <span className="flex-1 truncate text-left">{item.label}</span>
                            <span className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>
                              {ICONS.chevron}
                            </span>
                          </button>

                          {/* Sous-items en accordion */}
                          {isOpen && (
                            <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-surface-warm pl-3">
                              {visibleChildren.map((child) => {
                                const active = isLeafActive(child.href);
                                return (
                                  <li key={child.href}>
                                    <Link
                                      href={child.href}
                                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                                        active
                                          ? "text-primary font-semibold"
                                          : "text-ink-soft hover:text-primary-deep hover:bg-surface"
                                      }`}
                                    >
                                      {active && <span className="h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                                      <span className="truncate">{child.label}</span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* ── Profil utilisateur ── */}
      <div className="border-t border-surface-warm p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
              title={displayName}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink">{displayName}</p>
              <p className="truncate text-[10px] text-ink-soft">{email}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
