import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsDeliveryView } from "@/components/workspace/settings-delivery-view";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Opciones — Logística",
};

export const dynamic = "force-dynamic";

export default async function SettingsDeliveryPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  return <SettingsDeliveryView />;
}
