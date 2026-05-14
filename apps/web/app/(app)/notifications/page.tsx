// Refs: SPEC.md §8, US-2b.5 — notifications in-app avec messages lisibles
import { redirect } from "next/navigation";
import { getApiClient, getPermissions } from "../../../lib/api";
import { can } from "../../../lib/permissions";

type NotifPayload = {
  title?: string;
  action_url?: string;
  resource_type?: string;
  competence?: string;
};

function renderMessage(type: string, payload: NotifPayload): string {
  switch (type) {
    case "module_assigned":
      return payload.title ? `Nouvelle formation assignée : ${payload.title}` : "Nouvelle formation assignée";
    case "assignment_due_reminder":
      return payload.title ? `Rappel : "${payload.title}" est dû bientôt` : "Rappel : une formation est due bientôt";
    case "stamp_expiring":
      return payload.competence
        ? `Votre certification "${payload.competence}" expire bientôt`
        : "Une certification expire bientôt";
    case "stamp_state_changed":
      return payload.competence
        ? `La compétence "${payload.competence}" a changé d'état`
        : "Une compétence a changé d'état";
    case "streak_reminder":
      return "N'oubliez pas votre streak d'apprentissage !";
    case "buddy_request":
      return "Quelqu'un vous a envoyé une demande de buddy";
    case "challenge_result":
      return "Un défi équipe s'est terminé";
    default:
      return type;
  }
}

const TYPE_ICONS: Record<string, string> = {
  module_assigned: "📚",
  assignment_due_reminder: "⏰",
  stamp_expiring: "⚠️",
  stamp_state_changed: "🏅",
  streak_reminder: "🔥",
  buddy_request: "🤝",
  challenge_result: "🏆",
};

export default async function NotificationsPage() {
  const permissions = await getPermissions();
  if (!can(permissions, "view.learner_notifications")) redirect("/dashboard");

  const notifications = await getApiClient()
    .then((api) => api.notification.list(false))
    .catch(() => [] as Awaited<ReturnType<Awaited<ReturnType<typeof getApiClient>>["notification"]["list"]>>);

  return (
    <section aria-labelledby="notif-title">
      <h1 id="notif-title" className="mb-6 text-2xl font-bold text-primary-deep">
        Notifications
      </h1>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-warm bg-white py-16 text-center shadow-sm">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-ink-soft" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p className="text-sm text-ink-soft">Aucune notification</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notif) => {
            const n = notif as any;
            const isUnread = !n.read;
            const payload = (n.payload ?? {}) as NotifPayload;
            const message = renderMessage(n.type ?? "", payload);
            const icon = TYPE_ICONS[n.type ?? ""] ?? "🔔";
            const actionUrl = payload.action_url;

            return (
              <li
                key={n.id ?? Math.random()}
                className={`flex items-start gap-4 rounded-xl border bg-white p-4 shadow-sm ${isUnread ? "border-primary/30" : "border-surface-warm"}`}
              >
                <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${isUnread ? "bg-primary" : "bg-transparent"}`} aria-hidden="true" />
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-base" aria-hidden="true">
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${isUnread ? "font-semibold text-ink" : "text-ink-soft"}`}>
                    {message}
                  </p>
                  {actionUrl && (
                    <a
                      href={actionUrl}
                      className="mt-1 inline-flex text-xs font-medium text-primary hover:underline"
                    >
                      Voir →
                    </a>
                  )}
                  {n.created_at && (
                    <p className="mt-1 text-xs text-ink-soft">
                      {new Date(n.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
