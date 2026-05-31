import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsOrderFlowView } from "@/components/workspace/settings-order-flow-view";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchSellerCanEditDashboard } from "@/lib/dashboard-settings";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Opciones — Flujo de pedidos",
};

export const dynamic = "force-dynamic";

export default async function SettingsOrderFlowPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();
  const canEdit = await fetchSellerCanEditDashboard(apiUrl, idToken, accessToken);

  return <SettingsOrderFlowView canEdit={canEdit} />;
}
