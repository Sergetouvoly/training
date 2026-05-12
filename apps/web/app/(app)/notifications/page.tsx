// Refs: SPEC.md §8 — WCAG AA, i18n obligatoire
import { getApiClient } from "../../../lib/api";

export default async function NotificationsPage() {
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
            const isUnread = !(notif as any).read_at;
            return (
              <li
                key={(notif as any).id ?? Math.random()}
                className={`flex items-start gap-4 rounded-xl border bg-white p-4 shadow-sm ${isUnread ? "border-primary/30" : "border-surface-warm"}`}
              >
                <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${isUnread ? "bg-primary" : "bg-transparent"}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${isUnread ? "font-semibold text-ink" : "text-ink-soft"}`}>
                    {(notif as any).message ?? (notif as any).body ?? JSON.stringify(notif)}
                  </p>
                  {(notif as any).created_at && (
                    <p className="mt-1 text-xs text-ink-soft">
                      {new Date((notif as any).created_at).toLocaleDateString("fr-FR", {
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
