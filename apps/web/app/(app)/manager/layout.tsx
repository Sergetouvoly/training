// Refs: docs/BACKLOG.md §2b — guard espace manager.
// Le shell (sidebar + main) est géré par (app)/layout.tsx — ce layout ne fait que vérifier l'accès.
import { redirect } from "next/navigation";
import { canAccessManagerSpace } from "../../../lib/permissions";
import { getPermissions } from "../../../lib/api";

export default async function ManagerLayout({ children }: { readonly children: React.ReactNode }) {
  const permissions = await getPermissions();
  if (!canAccessManagerSpace(permissions)) redirect("/dashboard");
  return <>{children}</>;
}

