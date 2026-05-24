/** Types + server fetch for GET /dashboard/customers (tabla de clientes). */

/** Prefer id_token; fall back to access_token on 401/403. */
function uniqBearerCandidates(idToken?: string | null, accessToken?: string | null): string[] {
  return [
    ...new Set([idToken, accessToken].filter((t): t is string => typeof t === "string" && t.length > 0)),
  ];
}

export type DashboardCustomerRow = Readonly<{
  customerId: number;
  name: string;
  clientCode: string | null;
  location: string;
  sellerAssigned: string | null;
  contactPhone: string;
  email: string | null;
}>;

function parseCustomerRow(raw: unknown): DashboardCustomerRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.customerId === "number" ? o.customerId : Number(o.customerId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const str = (k: string) => (typeof o[k] === "string" ? o[k].trim() : "");
  const maybeNull = (k: string) => {
    const s = str(k);
    return s.length ? s : null;
  };
  return {
    customerId: id,
    name: name || "—",
    clientCode: maybeNull("clientCode"),
    location: str("location") || "—",
    sellerAssigned: maybeNull("sellerAssigned"),
    contactPhone: str("contactPhone") || "—",
    email: maybeNull("email"),
  };
}

function parseCustomersEnvelope(data: unknown): DashboardCustomerRow[] {
  const o = data as { customers?: unknown[] };
  if (!Array.isArray(o.customers)) return [];
  const rows: DashboardCustomerRow[] = [];
  for (const item of o.customers) {
    const row = parseCustomerRow(item);
    if (row) rows.push(row);
  }
  return rows;
}

export type DashboardCustomerDetail = Readonly<{
  customerId: number;
  name: string;
  assignedSellerId: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  wazeAddress: string | null;
}>;

function parseCustomerDetail(raw: unknown): DashboardCustomerDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.customerId === "number" ? o.customerId : Number(o.customerId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const strOrNull = (k: string): string | null => {
    const v = o[k];
    if (v === null || v === undefined) return null;
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length ? t : null;
  };

  let assignedSellerId: number | null = null;
  if (o.assignedSellerId !== null && o.assignedSellerId !== undefined && o.assignedSellerId !== "") {
    const sid =
      typeof o.assignedSellerId === "number" ? o.assignedSellerId : Number(o.assignedSellerId);
    if (Number.isFinite(sid) && sid > 0) assignedSellerId = sid;
  }

  const name = typeof o.name === "string" ? o.name.trim() : "";

  return {
    customerId: id,
    name: name || "—",
    assignedSellerId,
    addressLine1: strOrNull("addressLine1"),
    addressLine2: strOrNull("addressLine2"),
    city: strOrNull("city"),
    region: strOrNull("region"),
    postalCode: strOrNull("postalCode"),
    wazeAddress: strOrNull("wazeAddress"),
  };
}

export function formatCustomerAddress(customer: DashboardCustomerDetail | null): string {
  if (!customer) return "—";
  const parts = [
    customer.addressLine1,
    customer.addressLine2,
    customer.city,
    customer.region,
    customer.postalCode,
  ].filter((p): p is string => Boolean(p && p.trim()));
  if (parts.length > 0) return parts.join(", ");
  return customer.wazeAddress?.trim() || "—";
}

/** Browser / Route Handler: GET `/api/backend/dashboard/customers/{customerId}`. */
export async function fetchCustomerDetailViaProxy(
  customerId: number,
): Promise<DashboardCustomerDetail | null> {
  const res = await fetch(`/api/backend/dashboard/customers/${encodeURIComponent(String(customerId))}`, {
    credentials: "include",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return null;
  const raw =
    body.customer && typeof body.customer === "object" ? body.customer : body;
  return parseCustomerDetail(raw);
}

/** Client-side sellers list via Route Handler. */
export async function fetchSellersViaProxy(): Promise<
  ReadonlyArray<{ sellerId: number; name: string; active: boolean }>
> {
  const res = await fetch("/api/backend/dashboard/sellers", {
    credentials: "include",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return [];
  const raw = body.sellers;
  if (!Array.isArray(raw)) return [];
  const rows: Array<{ sellerId: number; name: string; active: boolean }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const sellerId = typeof o.sellerId === "number" ? o.sellerId : Number(o.sellerId);
    if (!Number.isFinite(sellerId) || sellerId <= 0) continue;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    rows.push({ sellerId, name: name || "—", active: o.active !== false });
  }
  return rows;
}

/** Client / Route Handler responses (JSON body shaped like `{ customers?: … }`). */
export function parseDashboardCustomersEnvelope(data: unknown): DashboardCustomerRow[] {
  return parseCustomersEnvelope(data);
}

function dashboardCustomersPayloadFromResponseText(text: string, httpOk: boolean): DashboardCustomerRow[] | null {
  if (!httpOk) return null;
  try {
    const data = text.trim() === "" ? {} : (JSON.parse(text) as unknown);
    return parseCustomersEnvelope(data);
  } catch {
    return null;
  }
}

/**
 * Returns `null` if the request failed. Empty array = supplier has no customers yet.
 * Tries Cognito **`id_token` first**, then **`access_token`** on 401/403.
 */
export async function fetchCustomersDashboard(
  apiUrl: string,
  idToken?: string | null,
  accessToken?: string | null,
): Promise<DashboardCustomerRow[] | null> {
  const trimmed = apiUrl.replace(/\/$/, "");
  if (!trimmed) return null;

  const bearerCandidates = uniqBearerCandidates(idToken, accessToken);
  if (bearerCandidates.length === 0) return null;

  const url = `${trimmed}/dashboard/customers`;

  try {
    for (let i = 0; i < bearerCandidates.length; i++) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${bearerCandidates[i]}` },
        cache: "no-store",
      });

      const text = await res.text();

      if (res.ok) {
        return dashboardCustomersPayloadFromResponseText(text, true);
      }

      const retriable = res.status === 401 || res.status === 403;
      if (!retriable || i === bearerCandidates.length - 1) {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}
