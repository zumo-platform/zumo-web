import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsEmailView } from "@/components/workspace/settings-email-view";
import { fetchEmailSettingsDashboard, fetchSellerCanEditDashboard } from "@/lib/dashboard-settings";
import { getServerApiBaseUrl } from "@/lib/api";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Opciones — Canal de correo",
};

export const dynamic = "force-dynamic";

export default async function SettingsEmailPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();
  const [email, canEdit] = await Promise.all([
    fetchEmailSettingsDashboard(apiUrl, idToken, accessToken),
    fetchSellerCanEditDashboard(apiUrl, idToken, accessToken),
  ]);

  if (!email) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
        No pudimos cargar la configuración del canal de correo. Revisá tu sesión e intentá de nuevo.
      </div>
    );
  }

  return <SettingsEmailView canEdit={canEdit} initial={email} />;
}
