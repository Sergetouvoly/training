// Refs: SPEC.md §7 — gestion des comptes utilisateurs (super_admin + admin uniquement)
import { redirect } from "next/navigation";
import { getApiClient, getPlatformRole } from "../../../../lib/api";
import type { UserDto } from "@elearning/api-client";
import { UserList } from "./UserList";

export default async function AdminUsersPage() {
  const [api, platformRole] = await Promise.all([getApiClient(), getPlatformRole()]);

  if (platformRole !== "super_admin" && platformRole !== "admin") redirect("/dashboard");

  let users: UserDto[] = [];
  let fetchError: string | null = null;
  try {
    users = await api.admin.listUsers();
  } catch (err: any) {
    fetchError = err?.message ?? "Erreur lors du chargement des utilisateurs.";
  }

  const canCreate = platformRole === "super_admin" || platformRole === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary-deep">Comptes utilisateurs</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Gérez les accès et les rôles de tous les membres de la plateforme.
        </p>
      </div>

      {fetchError && (
        <div className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
          <p className="font-semibold mb-1">Impossible de charger les utilisateurs</p>
          <p className="font-mono text-xs">{fetchError}</p>
        </div>
      )}

      <UserList initialUsers={users} canCreate={canCreate} />
    </div>
  );
}
