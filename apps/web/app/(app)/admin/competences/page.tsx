// Refs: SPEC.md §7 — gestion du référentiel de compétences
import { redirect } from "next/navigation";
import Link from "next/link";
import { getApiClient, getPermissions } from "../../../../lib/api";
import { can } from "../../../../lib/permissions";
import type { CompetenceDto } from "@elearning/api-client";

export default async function AdminCompetencesPage() {
  const permissions = await getPermissions();
  if (!can(permissions, "view.admin_competences")) redirect("/dashboard");

  const api = await getApiClient();
  const competences: CompetenceDto[] = await api.competence.list().catch(() => []);

  async function createCompetence(formData: FormData) {
    "use server";
    const api = await getApiClient();
    await api.competence.create({
      code: formData.get("code") as string,
      label_fr: formData.get("label_fr") as string,
      label_en: formData.get("label_en") as string,
    });
    redirect("/admin/competences");
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-extrabold text-primary-deep">Compétences</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Référentiel de compétences · {competences.length} entrée{competences.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Formulaire de création inline */}
      <form action={createCompetence} className="rounded-2xl border border-surface-warm bg-white p-6">
        <h2 className="mb-4 text-sm font-bold text-primary-deep">Ajouter une compétence</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="code" className="mb-1.5 block text-xs font-medium text-ink-soft uppercase tracking-wide">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              placeholder="COMP-001"
              className="w-full rounded-xl border border-surface-warm px-3.5 py-2 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label htmlFor="label_fr" className="mb-1.5 block text-xs font-medium text-ink-soft uppercase tracking-wide">
              Libellé (FR) <span className="text-red-500">*</span>
            </label>
            <input
              id="label_fr"
              name="label_fr"
              type="text"
              required
              placeholder="Gestion du stress"
              className="w-full rounded-xl border border-surface-warm px-3.5 py-2 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label htmlFor="label_en" className="mb-1.5 block text-xs font-medium text-ink-soft uppercase tracking-wide">
              Libellé (EN) <span className="text-red-500">*</span>
            </label>
            <input
              id="label_en"
              name="label_en"
              type="text"
              required
              placeholder="Stress management"
              className="w-full rounded-xl border border-surface-warm px-3.5 py-2 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-deep transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Ajouter
        </button>
      </form>

      {/* Liste */}
      {competences.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-warm bg-surface p-16 text-center">
          <p className="text-ink-soft">Aucune compétence définie. Utilisez le formulaire ci-dessus pour en créer.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-warm bg-surface">
                <th className="px-5 py-3 text-left font-semibold text-ink-soft">Code</th>
                <th className="px-5 py-3 text-left font-semibold text-ink-soft">Libellé FR</th>
                <th className="px-5 py-3 text-left font-semibold text-ink-soft hidden md:table-cell">Libellé EN</th>
                <th className="px-5 py-3 text-left font-semibold text-ink-soft hidden lg:table-cell">Créé le</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {competences.map((comp) => (
                <tr key={comp.id} className="border-b border-surface-warm last:border-0 hover:bg-surface/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-ink">{comp.code}</td>
                  <td className="px-5 py-3.5 font-medium text-ink">{comp.label_fr}</td>
                  <td className="px-5 py-3.5 text-ink-soft hidden md:table-cell">{comp.label_en}</td>
                  <td className="px-5 py-3.5 text-xs text-ink-soft hidden lg:table-cell">
                    {new Date(comp.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/admin/competences/${comp.id}`}
                      className="rounded-lg border border-surface-warm px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface hover:border-primary/30 transition-colors"
                    >
                      Éditer
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

