// Refs: SPEC.md §3 L2, R-1.2 — gestion banque de questions admin
import { redirect } from "next/navigation";
import { getApiClient, getPermissions } from "../../../../lib/api";
import { can } from "../../../../lib/permissions";
import Link from "next/link";
import { AssessmentManager } from "./AssessmentManager";
import type { EvaluationItem } from "@elearning/api-client";

export default async function AdminAssessmentPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ bank?: string }>;
}) {
  const [{ bank }, permissions] = await Promise.all([searchParams, getPermissions()]);
  if (!can(permissions, "view.admin_assessment")) redirect("/dashboard");

  const api = await getApiClient();
  const items: EvaluationItem[] = await api.assessment.listItems().catch(() => []);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-ink-soft" aria-label="Fil d'Ariane">
            <Link href="/admin" className="hover:text-primary transition-colors">Administration</Link>
            <span aria-hidden="true">›</span>
            <span className="text-ink">Questions</span>
          </nav>
          <h1 className="text-2xl font-extrabold text-primary-deep">Banque de questions</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {items.length} question{items.length > 1 ? "s" : ""} · Formats QCM, vrai/faux
          </p>
        </div>
      </div>

      <AssessmentManager initialItems={items} initialBankFilter={bank ?? ""} />
    </div>
  );
}

