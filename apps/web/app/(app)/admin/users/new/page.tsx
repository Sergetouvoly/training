// Refs: SPEC.md §7 — création d'un compte utilisateur (super_admin + admin uniquement)
import { redirect } from "next/navigation";
import { getPermissions } from "../../../../../lib/api";
import { can } from "../../../../../lib/permissions";
import { NewUserForm } from "./NewUserForm";

export default async function NewUserPage() {
  const permissions = await getPermissions();
  if (!can(permissions, "view.admin_users")) redirect("/dashboard");
  return <NewUserForm />;
}

