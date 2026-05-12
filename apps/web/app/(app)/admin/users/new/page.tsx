// Refs: SPEC.md §7 — création d'un compte utilisateur (super_admin + admin uniquement)
import { redirect } from "next/navigation";
import { getPlatformRole } from "../../../../../lib/api";
import { NewUserForm } from "./NewUserForm";

export default async function NewUserPage() {
  const platformRole = await getPlatformRole();
  if (platformRole !== "super_admin" && platformRole !== "admin") redirect("/dashboard");
  return <NewUserForm />;
}
