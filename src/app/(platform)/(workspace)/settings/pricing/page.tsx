import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsPricingForm } from "@/components/workspace/settings-pricing-form";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchSellerCanEditDashboard, fetchSettingsDashboard } from "@/lib/dashboard-settings";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Opciones — Precios",
};

export const dynamic = "force-dynamic";

export default async function SettingsPricingPage() {
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
        No pudimos cargar la configuración de precios. Revisá tu sesión e intentá de nuevo.
      </div>
    );
  }

  return <SettingsPricingForm canEdit={canEdit} initialPricing={settings.pricing} />;
}
