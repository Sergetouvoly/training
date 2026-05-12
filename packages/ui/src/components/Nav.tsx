"use client";
// Refs: SPEC.md §8 — WCAG AA, i18n obligatoire
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

interface NavProps {
  readonly items: NavItem[];
  readonly logoLabel: string;
  readonly logoHref?: string;
  readonly userInitial?: string;
  readonly userEmail?: string;
  readonly userRole?: string;
  readonly unreadNotifications?: number;
  readonly signOutAction?: () => Promise<void>;
}

export function Nav({ items, logoLabel, logoHref = "/", userInitial = "U", userEmail, userRole = "Apprenante", unreadNotifications = 0, signOutAction }: NavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-surface-warm bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <a href={logoHref} className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-base font-bold text-primary">{logoLabel}</span>
        </a>

        {/* Nav links — masqué si vide (rôles avec sidebar) */}
        {items.length > 0 && (
        <nav aria-label="Navigation principale">
          <ul className="flex items-center gap-1">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      active
                        ? "bg-primary text-white"
                        : "text-ink hover:bg-surface hover:text-primary"
                    }`}
                  >
                    {item.icon && <span aria-hidden="true">{item.icon}</span>}
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        )}

        {/* Cloche notifications */}
        {(() => {
          const plural = unreadNotifications > 1 ? "s" : "";
          const bellLabel = unreadNotifications > 0
            ? `${unreadNotifications} notification${plural} non lue${plural}`
            : "Notifications";
          return (
        <a
          href="/notifications"
          aria-label={bellLabel}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-surface-warm text-ink-soft hover:bg-surface hover:text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unreadNotifications > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </a>
          );
        })()}

        {/* User dropdown */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="true"
            className="flex items-center gap-2 rounded-lg border border-surface-warm bg-white px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {userInitial}
            </div>
            <span className="hidden sm:block max-w-[140px] truncate">{userEmail}</span>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform text-muted ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-48 rounded-xl border border-surface-warm bg-white py-1 shadow-lg"
            >
              <div className="border-b border-surface-warm px-4 py-2.5">
                <p className="text-xs font-medium text-ink truncate">{userEmail}</p>
                <p className="text-xs text-ink-soft">{userRole}</p>
              </div>
              {signOutAction ? (
                <form action={signOutAction}>
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface hover:text-primary transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Déconnexion
                  </button>
                </form>
              ) : (
                <a
                  href="/signout"
                  role="menuitem"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface hover:text-primary transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Déconnexion
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
