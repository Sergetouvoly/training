import { redirect } from "next/navigation";
import { getPermissions } from "../../../lib/api";
import { can } from "../../../lib/permissions";

export default async function ModuleLayout({ children }: { readonly children: React.ReactNode }) {
  const permissions = await getPermissions();
  if (!can(permissions, "view.learner_modules")) redirect("/dashboard");
  return <>{children}</>;
}
