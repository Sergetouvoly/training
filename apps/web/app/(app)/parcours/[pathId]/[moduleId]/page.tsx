// Refs: SPEC.md §8, US-1.2 progression visible, quiz bloqué avant fin du cours
import { notFound, redirect } from "next/navigation";
import { getApiClient, getPermissions } from "../../../../../lib/api";
import { can } from "../../../../../lib/permissions";
import { auth } from "../../../../../auth";
import { ModuleReader } from "./ModuleReader";

export default async function ModulePage({
  params,
}: {
  readonly params: Promise<{ pathId: string; moduleId: string }>;
}) {
  const { pathId, moduleId } = await params;
  const [api, permissions] = await Promise.all([getApiClient(), getPermissions()]);
  if (!can(permissions, "view.learner_parcours")) redirect("/dashboard");
  await auth();

  const mod = await api.learning.getModule(moduleId).catch(() => null);
  if (!mod || !mod.content_fr) notFound();

  const quizItems = mod.quiz_bank_id
    ? await api.assessment.drawItems(mod.quiz_bank_id, 10).catch(() => [])
    : [];

  return (
    <ModuleReader
      pathId={pathId}
      module={mod}
      quizItems={quizItems}
    />
  );
}
