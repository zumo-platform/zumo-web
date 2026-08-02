import type { Metadata } from "next";

import { SettingsNotificationsView } from "@/components/workspace/settings-notifications-view";

export const metadata: Metadata = {
  title: "Opciones — Notificaciones",
};

export default function NotificationsSettingsPage() {
  return <SettingsNotificationsView />;
}
