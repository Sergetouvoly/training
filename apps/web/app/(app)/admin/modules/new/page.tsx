// Refs: SPEC-CONTENT.md §6.2 — création module admin
import { redirect } from "next/navigation";
import { getPlatformRole, getApiClient } from "../../../../../lib/api";

const CONTENT_ROLES = new Set(["super_admin", "admin", "trainer"]);

export default async function NewModulePage() {
  const platformRole = await getPlatformRole();
  if (!platformRole || !CONTENT_ROLES.has(platformRole)) redirect("/dashboard");

  const api = await getApiClient();
  const mod = await api.learning.createModule({
    title_fr: "Nouveau module",
    target_role: "all",
    estimated_duration_minutes: 30,
    competence_ids: [],
  });

  redirect(`/admin/modules/${mod.id}`);
}
