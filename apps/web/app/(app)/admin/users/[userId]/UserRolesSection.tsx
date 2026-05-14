"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RoleDto, UserRoleDto } from "@elearning/api-client";

interface Props {
  readonly userId: string;
  readonly allRoles: RoleDto[];
  readonly userRoles: UserRoleDto[];
  readonly canAssign: boolean;
}

export function UserRolesSection({ userId, allRoles, userRoles, canAssign }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignedIds = new Set(userRoles.map((ur) => ur.role_id));

  async function grant(roleId: string) {
    setLoading(roleId);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/roles/${roleId}`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as any).error ?? "Erreur lors de l'attribution.");
        return;
      }
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur.");
    } finally {
      setLoading(null);
    }
  }

  async function revoke(roleId: string) {
    setLoading(roleId);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/roles/${roleId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as any).error ?? "Erreur lors de la révocation.");
        return;
      }
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-surface-warm bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-primary-deep">Rôles attribués</h2>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {assignedIds.size} actif{assignedIds.size > 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {allRoles.map((role) => {
          const isAssigned = assignedIds.has(role.id);
          const isLoading = loading === role.id;
          return (
            <li
              key={role.id}
              className={`flex items-center justify-between rounded-xl border px-4 py-2.5 transition-colors ${
                isAssigned ? "border-primary/20 bg-primary/5" : "border-surface-warm"
              }`}
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-ink">{role.label_fr}</span>
                <span className="ml-2 font-mono text-xs text-ink-soft">{role.code}</span>
                {role.is_system && (
                  <span className="ml-2 text-xs text-ink-soft/50" title="Rôle système">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                )}
              </div>

              {canAssign ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => isAssigned ? revoke(role.id) : grant(role.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    isAssigned
                      ? "border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                  }`}
                >
                  {isLoading ? "…" : isAssigned ? "Révoquer" : "Attribuer"}
                </button>
              ) : isAssigned ? (
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Actif
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
