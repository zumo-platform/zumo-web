import { getServerApiBaseUrl, joinApiGatewayPath } from "@/lib/api";
import type { EmailSettings, WhatsappStatusResult } from "@/lib/dashboard-types";
import { parseEmailSettings } from "@/lib/dashboard-settings";

export async function fetchEmailSettings(
  idToken?: string | null,
  accessToken?: string | null,
): Promise<EmailSettings | null> {
  const baseUrl = getServerApiBaseUrl();
  if (!baseUrl) return null;

  const bearerCandidates = [
    ...new Set(
      [idToken, accessToken].filter((t): t is string => typeof t === "string" && t.length > 0),
    ),
  ];
  if (bearerCandidates.length === 0) return null;

  try {
    for (const bearer of bearerCandidates) {
      const res = await fetch(joinApiGatewayPath(baseUrl, "dashboard/settings"), {
        headers: { Authorization: `Bearer ${bearer}` },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const body = (await res.json()) as unknown;
      return parseEmailSettings(body);
    }
    return null;
  } catch {
    return null;
  }
}

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

export async function connectWhatsapp(
  bearerToken: string,
  payload: { code: string; wabaId: string; phoneNumberId: string },
): Promise<{ ok: boolean; status?: string; phone?: string; detail?: string } | null> {
  const baseUrl = getServerApiBaseUrl();
  if (!baseUrl || !bearerToken) return null;
  try {
    const res = await fetch(joinApiGatewayPath(baseUrl, "dashboard/whatsapp/connect"), {
      method: "POST",
      headers: { Authorization: `Bearer ${bearerToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as {
      ok: boolean;
      status?: string;
      phone?: string;
      detail?: string;
    };
  } catch {
    return null;
  }
}

export async function disconnectWhatsapp(
  bearerToken: string,
): Promise<{ ok: boolean } | null> {
  const baseUrl = getServerApiBaseUrl();
  if (!baseUrl || !bearerToken) return null;
  try {
    const res = await fetch(joinApiGatewayPath(baseUrl, "dashboard/whatsapp/disconnect"), {
      method: "POST",
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    return (await res.json()) as { ok: boolean };
  } catch {
    return null;
  }
}

/** Browser / Route Handler: POST `/api/backend/dashboard/whatsapp/connect`. */
export async function connectWhatsappViaProxy(
  payload: { code: string; wabaId: string; phoneNumberId: string },
): Promise<{ ok: boolean; status?: string; phone?: string; detail?: string } | null> {
  try {
    const res = await fetch("/api/backend/dashboard/whatsapp/connect", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as {
      ok: boolean;
      status?: string;
      phone?: string;
      detail?: string;
    };
  } catch {
    return null;
  }
}

/** Browser / Route Handler: POST `/api/backend/dashboard/whatsapp/disconnect`. */
export async function disconnectWhatsappViaProxy(): Promise<{ ok: boolean } | null> {
  try {
    const res = await fetch("/api/backend/dashboard/whatsapp/disconnect", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
    return (await res.json()) as { ok: boolean };
  } catch {
    return null;
  }
}
