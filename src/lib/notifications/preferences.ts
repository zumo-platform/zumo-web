import type { NotificationPrefs } from "./types";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  notifyEnabled: true,
  notifyOrders: true,
  notifyDraftOrders: true,
  notifyReclamos: true,
};

export async function fetchNotificationPrefs(): Promise<NotificationPrefs> {
  const res = await fetch("/api/backend/dashboard/notifications/preferences", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) return DEFAULT_NOTIFICATION_PREFS;
  const data = (await res.json().catch(() => null)) as NotificationPrefs | null;
  return data ?? DEFAULT_NOTIFICATION_PREFS;
}

export async function saveNotificationPrefs(
  patch: Partial<NotificationPrefs>,
): Promise<NotificationPrefs> {
  const res = await fetch("/api/backend/dashboard/notifications/preferences", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("No se pudieron guardar las preferencias");
  return (await res.json()) as NotificationPrefs;
}
