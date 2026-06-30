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
