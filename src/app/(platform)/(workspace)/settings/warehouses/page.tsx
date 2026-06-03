import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsWarehousesView } from "@/components/workspace/settings-warehouses-view";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Opciones — Bodegas",
};

export const dynamic = "force-dynamic";

export default async function SettingsWarehousesPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  return <SettingsWarehousesView />;
}
