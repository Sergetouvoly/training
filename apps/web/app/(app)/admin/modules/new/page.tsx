// Refs: SPEC-CONTENT.md §6.2 — création module admin
import { redirect } from "next/navigation";
import { getPermissions, getApiClient } from "../../../../../lib/api";
import { can } from "../../../../../lib/permissions";

export default async function NewModulePage() {
  const permissions = await getPermissions();
  if (!can(permissions, "view.admin_modules")) redirect("/dashboard");

  const api = await getApiClient();
  const mod = await api.learning.createModule({
    title_fr: "Nouveau module",
    target_role: "all",
    estimated_duration_minutes: 30,
    competence_ids: [],
  });

  redirect(`/admin/modules/${mod.id}`);
}

