import { redirect } from "next/navigation";
import { getApiClient, getPermissions } from "../../../../lib/api";
import { can } from "../../../../lib/permissions";
import { TrashPanel } from "./TrashPanel";
import type { TrashListDto } from "@elearning/api-client";

export default async function AdminTrashPage() {
  const permissions = await getPermissions();
  if (!can(permissions, "view.admin_trash")) redirect("/dashboard");

  const api = await getApiClient();
  const data = await api.trash.list().catch(
    (): TrashListDto => ({ modules: [], learning_paths: [], evaluation_items: [], competences: [] })
  );

  const total =
    data.modules.length + data.learning_paths.length +
    data.evaluation_items.length + data.competences.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-primary-deep">Corbeille</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {total} élément{total !== 1 ? "s" : ""} en attente · les éléments supprimés ne sont pas visibles dans les autres vues
        </p>
      </div>

      <TrashPanel
        data={data}
        canRestore={can(permissions, "trash.restore")}
        canPurge={can(permissions, "trash.purge")}
      />
    </div>
  );
}
