// Refs: SPEC.md §7 — édition et désactivation d'un compte utilisateur (super_admin + admin uniquement)
import { redirect, notFound } from "next/navigation";
import { getApiClient, getPlatformRole } from "../../../../../lib/api";
import { EditUserForm } from "./EditUserForm";

export default async function EditUserPage({ params }: { readonly params: Promise<{ userId: string }> }) {
  const [{ userId }, platformRole] = await Promise.all([params, getPlatformRole()]);
  if (platformRole !== "super_admin" && platformRole !== "admin") redirect("/dashboard");

  const api = await getApiClient();
  const user = await api.admin.getUser(userId).catch(() => null);
  if (!user) notFound();

  return <EditUserForm user={user} />;
}
