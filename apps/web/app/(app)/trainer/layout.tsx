// Refs: docs/BACKLOG.md §2b — guard espace trainer.
// Le shell (sidebar + main) est géré par (app)/layout.tsx — ce layout ne fait que vérifier l'accès.
import { redirect } from "next/navigation";
import { canAccessTrainerSpace } from "../../../lib/permissions";
import { getPermissions } from "../../../lib/api";

export default async function TrainerLayout({ children }: { readonly children: React.ReactNode }) {
  const permissions = await getPermissions();
  if (!canAccessTrainerSpace(permissions)) redirect("/dashboard");
  return <>{children}</>;
}

