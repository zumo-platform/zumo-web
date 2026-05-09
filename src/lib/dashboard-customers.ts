/** Types + server fetch for GET /dashboard/customers (tabla de clientes). */

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

/**
 * Returns `null` if the request failed. Empty array = supplier has no customers yet.
 */
export async function fetchCustomersDashboard(
  apiUrl: string,
  idToken: string,
): Promise<DashboardCustomerRow[] | null> {
  const trimmed = apiUrl.replace(/\/$/, "");
  if (!trimmed) return null;

  try {
    const res = await fetch(`${trimmed}/dashboard/customers`, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { customers?: unknown[] };
    if (!Array.isArray(data.customers)) return [];
    const rows: DashboardCustomerRow[] = [];
    for (const item of data.customers) {
      const row = parseCustomerRow(item);
      if (row) rows.push(row);
    }
    return rows;
  } catch {
    return null;
  }
}
