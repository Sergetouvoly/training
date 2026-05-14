// Refs: SPEC.md §7 — garde accès espace admin
import { redirect } from "next/navigation";
import { canAccessAdmin } from "../../../lib/permissions";
import { getPermissions } from "../../../lib/api";

export default async function AdminLayout({ children }: { readonly children: React.ReactNode }) {
  const permissions = await getPermissions();
  if (!canAccessAdmin(permissions)) redirect("/dashboard");
  return <>{children}</>;
}
