// Refs: SPEC.md §8, US-1.2 progression visible, quiz bloqué avant fin du cours
import { notFound } from "next/navigation";
import { getApiClient } from "../../../../../lib/api";
import { auth } from "../../../../../auth";
import { ModuleReader } from "./ModuleReader";

export default async function ModulePage({
  params,
}: {
  readonly params: Promise<{ pathId: string; moduleId: string }>;
}) {
  const { pathId, moduleId } = await params;
  const [api] = await Promise.all([getApiClient(), auth()]);

  const mod = await api.learning.getModule(moduleId).catch(() => null);
  if (!mod || !mod.content_fr) notFound();

  const quizItems = await api.assessment
    .drawItems(moduleId, 10)
    .catch(() => [] as Awaited<ReturnType<typeof api.assessment.drawItems>>);

  return (
    <ModuleReader
      pathId={pathId}
      module={mod}
      quizItems={quizItems}
    />
  );
}
