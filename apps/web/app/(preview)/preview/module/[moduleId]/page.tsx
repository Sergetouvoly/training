// Refs: SPEC-CONTENT.md §6.2 — prévisualisation admin du rendu apprenant exact
import { notFound } from "next/navigation";
import { getApiClient } from "../../../../../lib/api";
import { ModuleReader } from "../../../../(app)/parcours/[pathId]/[moduleId]/ModuleReader";

export default async function PreviewModulePage({
  params,
}: {
  readonly params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const api = await getApiClient();
  const mod = await api.learning.getModule(moduleId).catch(() => null);
  if (!mod) notFound();

  return (
    <ModuleReader
      pathId="preview"
      module={mod}
      quizItems={[]}
    />
  );
}
