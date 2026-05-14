// Refs: SPEC.md §7 — configuration système, accès super_admin uniquement
import { redirect } from "next/navigation";
import { getApiClient, getPermissions } from "../../../../lib/api";
import { can } from "../../../../lib/permissions";
import type { AppConfigEntry } from "@elearning/api-client";

const CONFIG_LABELS: Record<string, { label: string; description: string; type: "text" | "number" | "select"; options?: string[]; requiresPermission?: string }> = {
  smtp_host: {
    label: "Serveur SMTP",
    description: "Hôte du serveur SMTP (ex: smtp.gmail.com). Laisser vide pour désactiver les emails.",
    type: "text",
  },
  smtp_port: {
    label: "Port SMTP",
    description: "Port SMTP (587 = TLS, 465 = SSL).",
    type: "number",
  },
  smtp_user: {
    label: "Utilisateur SMTP",
    description: "Identifiant de connexion au serveur SMTP.",
    type: "text",
  },
  smtp_pass: {
    label: "Mot de passe SMTP",
    description: "Mot de passe SMTP. Masquez-le après enregistrement.",
    type: "text",
  },
  platform_url: {
    label: "URL de la plateforme",
    description: "URL de base utilisée dans les liens des emails (ex: https://lms.holenek.fr).",
    type: "text",
  },
  cron_stamps_expiring_enabled: {
    label: "Rappels expiration stamps (cron)",
    description: "Active les rappels automatiques quotidiens pour les stamps expirant dans 30 jours.",
    type: "select",
    options: ["true", "false"],
    requiresPermission: "scheduler.manage",
  },
  cron_overdue_assignments_enabled: {
    label: "Rappels assignations en retard (cron)",
    description: "Active les rappels automatiques quotidiens pour les formations en retard.",
    type: "select",
    options: ["true", "false"],
    requiresPermission: "scheduler.manage",
  },
  cron_streak_reminder_enabled: {
    label: "Rappels streak (cron)",
    description: "Active les rappels quotidiens pour maintenir le streak d'apprentissage.",
    type: "select",
    options: ["true", "false"],
    requiresPermission: "scheduler.manage",
  },
  mastery_window: {
    label: "Fenêtre de maîtrise (jours)",
    description: "Nombre de jours avant qu'une compétence soit considérée comme maîtrisée.",
    type: "number",
  },
  llm_provider: {
    label: "Fournisseur LLM",
    description: "Fournisseur d'IA utilisé pour le simulateur et les recommandations.",
    type: "select",
    options: ["openai", "anthropic", "mistral"],
  },
  llm_model: {
    label: "Modèle LLM",
    description: "Identifiant du modèle à utiliser (ex: gpt-4o, claude-3-haiku-20240307).",
    type: "text",
  },
  token_budget_daily: {
    label: "Budget tokens / utilisateur / jour",
    description: "Nombre maximum de tokens consommables par utilisateur par jour.",
    type: "number",
  },
  token_budget_per_call: {
    label: "Budget tokens / appel",
    description: "Nombre maximum de tokens par requête au LLM.",
    type: "number",
  },
};

export default async function AdminConfigPage() {
  const permissions = await getPermissions();
  if (!can(permissions, "view.admin_config")) redirect("/dashboard");
  const canWriteConfig = can(permissions, "app_config.write");

  const api = await getApiClient();
  const entries: AppConfigEntry[] = await api.config.list().catch(() => []);

  const configMap = Object.fromEntries(entries.map((e) => [e.key, e]));

  async function saveConfig(formData: FormData) {
    "use server";
    const api = await getApiClient();
    const keys = Object.keys(CONFIG_LABELS);
    await Promise.all(
      keys.map((key) => {
        const raw = formData.get(key);
        if (raw === null || raw === "") return Promise.resolve();
        const meta = CONFIG_LABELS[key];
        const value = meta?.type === "number" ? Number(raw) : raw;
        return api.config.set(key, value);
      }),
    );
    redirect("/admin/config");
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-extrabold text-primary-deep">Configuration système</h1>
        <p className="mt-1 text-sm text-ink-soft">Paramètres globaux de la plateforme — accès super_admin uniquement.</p>
      </div>

      <form action={canWriteConfig ? saveConfig : undefined} className="space-y-4">
        {Object.entries(CONFIG_LABELS).map(([key, meta]) => {
          if (meta.requiresPermission && !can(permissions, meta.requiresPermission as any)) return null;
          const current = configMap[key];
          const currentValue = current ? String(current.value) : "";
          return (
            <div key={key} className="rounded-2xl border border-surface-warm bg-white p-6">
              <div className="mb-4 flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <label htmlFor={key} className="block text-sm font-semibold text-ink">{meta.label}</label>
                  <p className="text-xs text-ink-soft">{meta.description}</p>
                </div>
                {current && (
                  <p className="mt-1 shrink-0 text-xs text-ink-soft sm:mt-0">
                    Mis à jour le {new Date(current.updated_at).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>

              {meta.type === "select" ? (
                <select
                  id={key}
                  name={key}
                  defaultValue={currentValue}
                  disabled={!canWriteConfig}
                  className="w-full max-w-xs rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {!currentValue && <option value="">— Non configuré —</option>}
                  {meta.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={key}
                  name={key}
                  type={meta.type}
                  defaultValue={currentValue}
                  placeholder={meta.type === "number" ? "0" : ""}
                  min={meta.type === "number" ? 0 : undefined}
                  disabled={!canWriteConfig}
                  className="w-full max-w-xs rounded-xl border border-surface-warm px-4 py-2.5 text-sm text-ink placeholder-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              )}
            </div>
          );
        })}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!canWriteConfig}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors shadow-sm"
          >
            Enregistrer les paramètres
          </button>
        </div>
      </form>
    </div>
  );
}


