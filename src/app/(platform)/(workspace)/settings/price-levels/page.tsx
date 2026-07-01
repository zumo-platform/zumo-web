import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsPriceLevelsExperience } from "@/components/workspace/settings-price-levels-experience";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchSettingsDashboard } from "@/lib/dashboard-settings";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Opciones — Niveles de precio",
};

export const dynamic = "force-dynamic";

export default async function SettingsPriceLevelsPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();
  const settings = await fetchSettingsDashboard(apiUrl, idToken, accessToken);

  if (!settings) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
        No pudimos cargar la configuración. Revisá tu sesión e intentá de nuevo.
      </div>
    );
  }

  return (
    <SettingsPriceLevelsExperience engineEnabled={settings.pricing.engineEnabled} />
  );
}
