import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsWhatsappView } from "@/components/workspace/settings-whatsapp-view";
import { fetchWhatsappStatus } from "@/lib/dashboard-api";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Opciones — Conexión de WhatsApp",
};

export const dynamic = "force-dynamic";

export default async function SettingsWhatsappPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const bearer = idToken ?? accessToken ?? "";
  const status = await fetchWhatsappStatus(bearer);

  const appId =
    process.env.NEXT_PUBLIC_WHATSAPP_APP_ID?.trim() ||
    process.env.WHATSAPP_APP_ID?.trim() ||
    "1449079386459388";
  const configId = process.env.NEXT_PUBLIC_WHATSAPP_ES_CONFIG_ID?.trim() || "";

  return (
    <SettingsWhatsappView appId={appId} configId={configId} initialStatus={status} />
  );
}
