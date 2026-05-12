"use client";
// Refs: SPEC.md §7 — liste et recherche utilisateurs (super_admin + admin)
import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import type { UserDto } from "@elearning/api-client";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  trainer: "Formateur",
  manager: "Manager",
  learner: "Apprenant",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700",
  admin: "bg-primary/10 text-primary",
  trainer: "bg-blue-50 text-blue-700",
  manager: "bg-amber-50 text-amber-700",
  learner: "bg-surface text-ink-soft",
};

const ALL_ROLES = ["super_admin", "admin", "trainer", "manager", "learner"] as const;

interface Props {
  readonly initialUsers: UserDto[];
  readonly canCreate: boolean;
}

export function UserList({ initialUsers, canCreate }: Props) {
  const [users, setUsers] = useState<UserDto[]>(initialUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const search = useCallback(
    (q: string, role: string, status: string) => {
      startTransition(async () => {
        setError(null);
        try {
          const qs = new URLSearchParams();
          if (q) qs.set("q", q);
          if (role) qs.set("role", role);
          if (status) qs.set("status", status);
          const res = await fetch(`/api/users?${qs}`);
          if (!res.ok) throw new Error(`${res.status}`);
          setUsers(await res.json());
        } catch (err: any) {
          setError(err?.message ?? "Erreur de chargement");
        }
      });
    },
    [],
  );

  function handleQuery(value: string) {
    setQuery(value);
    search(value, roleFilter, statusFilter);
  }

  function handleRole(value: string) {
    setRoleFilter(value);
    search(query, value, statusFilter);
  }

  function handleStatus(value: string) {
    setStatusFilter(value);
    search(query, roleFilter, value);
  }

  function clearFilters() {
    setQuery("");
    setRoleFilter("");
    setStatusFilter("");
    search("", "", "");
  }

  const hasFilters = query || roleFilter || statusFilter;

  // Stats par rôle sur les résultats affichés
  const byRole = ALL_ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = users.filter((u) => u.platform_role === r).length;
    return acc;
  }, {});
  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <div className="space-y-6">

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-surface-warm bg-white px-4 py-3">
          <p className="text-xs text-ink-soft">Total</p>
          <p className="text-2xl font-extrabold text-primary-deep">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-surface-warm bg-white px-4 py-3">
          <p className="text-xs text-ink-soft">Actifs</p>
          <p className="text-2xl font-extrabold text-green-600">{activeCount}</p>
        </div>
        {ALL_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => handleRole(roleFilter === r ? "" : r)}
            className={`rounded-2xl border px-4 py-3 text-left transition-all ${
              roleFilter === r
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-surface-warm bg-white hover:border-primary/30"
            }`}
          >
            <p className="text-xs text-ink-soft">{ROLE_LABELS[r]}</p>
            <p className="text-2xl font-extrabold text-ink">{byRole[r]}</p>
          </button>
        ))}
      </div>

      {/* Barre de recherche + filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full rounded-xl border border-surface-warm bg-white py-2.5 pl-10 pr-4 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Rechercher un utilisateur"
          />
          {isPending && (
            <svg
              className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          )}
        </div>

        <select
          value={roleFilter}
          onChange={(e) => handleRole(e.target.value)}
          className="rounded-xl border border-surface-warm bg-white px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="Filtrer par rôle"
        >
          <option value="">Tous les rôles</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => handleStatus(e.target.value)}
          className="rounded-xl border border-surface-warm bg-white px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="inactive">Désactivés</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-surface-warm bg-white px-3 py-2.5 text-sm text-ink-soft hover:text-ink transition-colors"
          >
            Réinitialiser
          </button>
        )}

        {canCreate && (
          <Link
            href="/admin/users/new"
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors shadow-sm"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouvel utilisateur
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          Erreur : {error}
        </p>
      )}

      {/* Résultats */}
      <div className={`transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}>
        {users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-warm bg-surface p-16 text-center">
            <p className="text-ink-soft mb-2">
              {hasFilters ? "Aucun utilisateur ne correspond à cette recherche." : "Aucun utilisateur trouvé."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Effacer les filtres
              </button>
            )}
            {!hasFilters && canCreate && (
              <Link
                href="/admin/users/new"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors"
              >
                Créer le premier utilisateur
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
            <div className="border-b border-surface-warm bg-surface px-5 py-2.5 text-xs text-ink-soft">
              {users.length} résultat{users.length > 1 ? "s" : ""}
              {hasFilters && <span className="ml-1 text-primary">· filtrés</span>}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-warm bg-surface/50">
                  <th className="px-5 py-3 text-left font-semibold text-ink-soft">Nom</th>
                  <th className="px-5 py-3 text-left font-semibold text-ink-soft hidden md:table-cell">Email</th>
                  <th className="px-5 py-3 text-left font-semibold text-ink-soft">Rôle</th>
                  <th className="px-5 py-3 text-left font-semibold text-ink-soft hidden lg:table-cell">Statut</th>
                  <th className="px-5 py-3 text-left font-semibold text-ink-soft hidden lg:table-cell">Créé le</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-surface-warm last:border-0 hover:bg-surface/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {(user.display_name ?? user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-ink">{user.display_name ?? "—"}</p>
                          <p className="text-xs text-ink-soft md:hidden">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-ink-soft hidden md:table-cell">{user.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[user.platform_role] ?? "bg-surface text-ink-soft"}`}>
                        {ROLE_LABELS[user.platform_role] ?? user.platform_role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.is_active ? "bg-green-50 text-green-700" : "bg-surface text-ink-soft"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-green-500" : "bg-muted"}`} aria-hidden="true" />
                        {user.is_active ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-ink-soft hidden lg:table-cell">
                      {new Date(user.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface hover:border-primary/30 transition-colors"
                      >
                        Éditer
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
