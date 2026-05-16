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
