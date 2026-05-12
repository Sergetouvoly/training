// Refs: SPEC.md §7 — édition/suppression d'une compétence
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getApiClient, getPlatformRole } from "../../../../../lib/api";

const ADMIN_ROLES = new Set(["super_admin", "admin"]);

export default async function EditCompetencePage({ params }: { params: Promise<{ competenceId: string }> }) {
  const [{ competenceId }, platformRole] = await Promise.all([params, getPlatformRole()]);
  if (!ADMIN_ROLES.has(platformRole)) redirect("/dashboard");

  const api = await getApiClient();

  const comp = await api.competence.getOne(competenceId).catch(() => null);
  if (!comp) notFound();

  async function updateCompetence(formData: FormData) {
    "use server";
    const api = await getApiClient();
    await api.competence.update(competenceId, {
      code: formData.get("code") as string,
      label_fr: formData.get("label_fr") as string,
      label_en: formData.get("label_en") as string,
    });
    redirect("/admin/competences");
  }

  async function deleteCompetence() {
    "use server";
    const api = await getApiClient();
    await api.competence.remove(competenceId);
    redirect("/admin/competences");
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/competences"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-warm text-ink-soft hover:bg-surface transition-colors"
          aria-label="Retour"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-primary-deep">{comp.code}</h1>
          <p className="text-sm text-ink-soft">{comp.label_fr}</p>
        </div>
      </div>

      {/* Formulaire */}
      <form action={updateCompetence} className="rounded-2xl border border-surface-warm bg-white p-8 space-y-5">
        <div>
          <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-ink">Code</label>
          <input
            id="code"
            name="code"
            type="text"
            required
            defaultValue={comp.code}
            className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="label_fr" className="mb-1.5 block text-sm font-medium text-ink">Libellé (FR)</label>
          <input
            id="label_fr"
            name="label_fr"
            type="text"
            required
            defaultValue={comp.label_fr}
            className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="label_en" className="mb-1.5 block text-sm font-medium text-ink">Libellé (EN)</label>
          <input
            id="label_en"
            name="label_en"
            type="text"
            required
            defaultValue={comp.label_en}
            className="w-full rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors"
          >
            Enregistrer
          </button>
          <Link
            href="/admin/competences"
            className="flex-1 rounded-xl border border-surface-warm py-2.5 text-center text-sm font-semibold text-ink hover:bg-surface transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>

      {/* Zone danger */}
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6">
        <h2 className="mb-1 text-sm font-bold text-red-700">Supprimer la compétence</h2>
        <p className="mb-4 text-xs text-red-600">
          Cette action est irréversible. Vérifiez qu'aucun module n'y est lié avant de supprimer.
        </p>
        <form action={deleteCompetence}>
          <button
            type="submit"
            className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
          >
            Supprimer
          </button>
        </form>
      </div>
    </div>
  );
}
