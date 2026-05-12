"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

const STORAGE_KEY = "holenek_admin_sidebar_collapsed";

const NAV_SECTIONS = [
  {
    label: "Tableau de bord",
    adminOnly: true,
    items: [
      {
        href: "/admin",
        label: "Vue d'ensemble",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
            <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
          </svg>
        ),
      },
    ],
  },
  {
    label: "Utilisateurs",
    adminOnly: true,
    items: [
      {
        href: "/admin/users",
        label: "Comptes",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
          </svg>
        ),
      },
      {
        href: "/admin/learners",
        label: "Apprenants",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        ),
      },
    ],
  },
  {
    label: "Contenu",
    items: [
      {
        href: "/admin/modules",
        label: "Modules",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v17H6.5A2.5 2.5 0 0 1 4 19.5z"/>
          </svg>
        ),
      },
      {
        href: "/admin/paths",
        label: "Parcours",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3h18M3 12h18M3 21h18"/><path d="M7 7l5 5-5 5"/>
          </svg>
        ),
      },
      {
        href: "/admin/competences",
        label: "Compétences",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        ),
      },
      {
        href: "/admin/assessment",
        label: "Questions",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        ),
      },
    ],
  },
  {
    label: "Système",
    superAdminOnly: true,
    items: [
      {
        href: "/admin/config",
        label: "Configuration",
        superAdminOnly: true,
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        ),
      },
    ],
  },
];

interface SidebarProps {
  readonly isSuperAdmin: boolean;
  readonly isTrainer: boolean;
  readonly displayName: string;
  readonly email: string;
  readonly badge: { label: string; cls: string };
  readonly homeHref: string;
}

export function AdminSidebar({
  isSuperAdmin, isTrainer, displayName, email, badge, homeHref,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch { /* ignore */ }
  }, []);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <aside className={`flex ${collapsed ? "w-14" : "w-52"} shrink-0 flex-col border-r border-[#e3e6ea] bg-white transition-[width] duration-200`}>
      {/* Logo + toggle */}
      {collapsed ? (
        <div className="flex h-14 w-14 flex-col items-center justify-center border-b border-[#e3e6ea] gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <button
            type="button"
            onClick={toggle}
            title="Développer la sidebar"
            aria-label="Développer la sidebar"
            className="flex h-5 w-8 items-center justify-center rounded-md text-ink-soft hover:bg-[#f0f1f3] hover:text-primary transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/><polyline points="15 18 21 12 15 6"/>
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex h-14 items-center gap-2 border-b border-[#e3e6ea] px-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-primary-deep whitespace-nowrap">Holenek</span>
          <span className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-[#f0f1f3] text-ink-soft">
            {isTrainer ? "Contenu" : "Admin"}
          </span>
          <button
            type="button"
            onClick={toggle}
            title="Réduire la sidebar"
            aria-label="Réduire la sidebar"
            className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-[#f0f1f3] hover:text-ink transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"/><polyline points="9 18 3 12 9 6"/>
            </svg>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-5" style={{ padding: collapsed ? "16px 4px" : "16px 8px" }} aria-label="Navigation administration">
        {NAV_SECTIONS.map((section) => {
          if (section.superAdminOnly && !isSuperAdmin) return null;
          if (section.adminOnly && isTrainer) return null;
          const visibleItems = section.items.filter(
            (item) => !("superAdminOnly" in item && item.superAdminOnly) || isSuperAdmin,
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label}>
              {!collapsed && (
                <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-ink-soft/60">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-ink-soft hover:bg-[#f0f1f3] hover:text-primary-deep transition-colors ${collapsed ? "justify-center" : ""}`}
                    >
                      <span className="shrink-0 text-ink-soft/70 group-hover:text-primary transition-colors">
                        {item.icon}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Profil */}
      <div className="border-t border-[#e3e6ea] p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
              title={displayName}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <Link
              href={homeHref}
              title="Tableau de bord"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft hover:bg-[#f0f1f3] hover:text-ink transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink-deep">{displayName}</p>
                <p className="truncate text-[10px] text-ink-soft">{email}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <Link
              href={homeHref}
              className="mt-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-soft hover:bg-[#f0f1f3] hover:text-ink transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Tableau de bord
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}
