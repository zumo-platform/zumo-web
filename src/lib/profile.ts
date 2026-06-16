import type { SellerMe } from "@/lib/dashboard-types";

type ApiErr = { error?: string; message?: string };

async function proxy<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const res = await fetch(`/api/backend/${path.replace(/^\/+/, "")}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown> & ApiErr;
  if (!res.ok) {
    const message =
      (typeof body.message === "string" && body.message.trim()) ||
      (typeof body.error === "string" && body.error.trim()) ||
      "No se pudo completar la solicitud.";
    return { ok: false, status: res.status, message };
  }
  return { ok: true, data: body as T };
}

export async function patchSellerProfileViaProxy(input: {
  name?: string;
  phone?: string | null;
}): Promise<SellerMe["seller"]> {
  const result = await proxy<{ seller: SellerMe["seller"] }>("sellers/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!result.ok) throw new Error(result.message);
  return result.data.seller;
}

export async function changePasswordViaProxy(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const result = await proxy<{ success: boolean }>("sellers/me/password", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!result.ok) throw new Error(result.message);
}
