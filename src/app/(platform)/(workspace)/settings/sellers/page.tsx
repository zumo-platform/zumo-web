import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsSellersTable } from "@/components/workspace/settings-sellers-table";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchSellersDashboard } from "@/lib/dashboard-settings";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Opciones — Vendedores",
};

export const dynamic = "force-dynamic";

export default async function SettingsSellersPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();
  const sellers = await fetchSellersDashboard(apiUrl, idToken, accessToken);

  if (sellers === null) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
        No pudimos cargar la lista de vendedores. Revisá tu sesión e intentá de nuevo.
      </div>
    );
  }

  return <SettingsSellersTable sellers={sellers} />;
}
