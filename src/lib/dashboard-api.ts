import { getServerApiBaseUrl, joinApiGatewayPath } from "@/lib/api";
import type { WhatsappStatusResult } from "@/lib/dashboard-types";

export async function fetchWhatsappStatus(
  bearerToken: string,
): Promise<WhatsappStatusResult | null> {
  const baseUrl = getServerApiBaseUrl();
  if (!baseUrl || !bearerToken) return null;

  try {
    const res = await fetch(joinApiGatewayPath(baseUrl, "dashboard/whatsapp/status"), {
      headers: { Authorization: `Bearer ${bearerToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as WhatsappStatusResult;
  } catch {
    return null;
  }
}
