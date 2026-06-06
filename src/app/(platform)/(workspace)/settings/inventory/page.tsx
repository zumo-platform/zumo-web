import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsInventoryView } from "@/components/workspace/settings-inventory-view";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchSellerCanEditDashboard } from "@/lib/dashboard-settings";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Opciones — Inventario",
};

export const dynamic = "force-dynamic";

export default async function SettingsInventoryPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();
  const canEdit = await fetchSellerCanEditDashboard(apiUrl, idToken, accessToken);
  return <SettingsInventoryView canEdit={canEdit} />;
}
