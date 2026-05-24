import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsBusinessView } from "@/components/workspace/settings-business-view";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchSellerCanEditDashboard, fetchSettingsDashboard } from "@/lib/dashboard-settings";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Opciones — Negocio",
};

export const dynamic = "force-dynamic";

export default async function SettingsBusinessPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();
  const [settings, canEdit] = await Promise.all([
    fetchSettingsDashboard(apiUrl, idToken, accessToken),
    fetchSellerCanEditDashboard(apiUrl, idToken, accessToken),
  ]);

  if (!settings) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
        No pudimos cargar la información del negocio. Revisá tu sesión e intentá de nuevo.
      </div>
    );
  }

  return <SettingsBusinessView business={settings.business} canEdit={canEdit} />;
}
