/** Customer-specific resolved product pricing lookup. */

export type CustomerProductPricingRow = Readonly<{
  productId: number;
  name: string;
  sku: string | null;
  unit: string;
  listPrice: number | null;
  unitPrice: number | null;
  basePrice: number | null;
  discountPct: number;
  priceSource: string;
  layerSource: string;
  discountListId: string | null;
  discountListName: string | null;
}>;

function parsePricingRow(raw: unknown): CustomerProductPricingRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const productId = typeof o.productId === "number" ? o.productId : Number(o.productId);
  if (!Number.isFinite(productId)) return null;
  const numOrNull = (v: unknown): number | null =>
    v == null ? null : typeof v === "number" && Number.isFinite(v) ? v : null;
  const num = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;
  return {
    productId,
    name: typeof o.name === "string" ? o.name : "—",
    sku: typeof o.sku === "string" ? o.sku : null,
    unit: typeof o.unit === "string" ? o.unit : "—",
    listPrice: numOrNull(o.listPrice),
    unitPrice: numOrNull(o.unitPrice),
    basePrice: numOrNull(o.basePrice),
    discountPct: num(o.discountPct),
    priceSource: typeof o.priceSource === "string" ? o.priceSource : "list",
    layerSource: typeof o.layerSource === "string" ? o.layerSource : "list",
    discountListId: typeof o.discountListId === "string" ? o.discountListId : null,
    discountListName: typeof o.discountListName === "string" ? o.discountListName : null,
  };
}

export async function fetchCustomerProductPricingViaProxy(
  customerId: number,
  opts: { q?: string; productIds?: readonly number[]; signal?: AbortSignal },
): Promise<CustomerProductPricingRow[]> {
  const params = new URLSearchParams();
  if (opts.q && opts.q.trim().length >= 2) {
    params.set("q", opts.q.trim());
  }
  if (opts.productIds && opts.productIds.length > 0) {
    params.set("productIds", opts.productIds.join(","));
  }

  const res = await fetch(
    `/api/backend/dashboard/customers/${customerId}/pricing?${params.toString()}`,
    { cache: "no-store", credentials: "include", signal: opts.signal },
  );
  const data = (await res.json().catch(() => ({}))) as {
    items?: unknown[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
  }
  if (!Array.isArray(data.items)) return [];
  const rows: CustomerProductPricingRow[] = [];
  for (const item of data.items) {
    const row = parsePricingRow(item);
    if (row) rows.push(row);
  }
  return rows;
}

export const CUSTOMER_PRICE_SOURCE_LABEL: Record<string, string> = {
  list: "Lista",
  customer_override: "Precio especial",
  level: "Nivel de precio",
  discount_list: "Con descuento",
  needs_manual: "Sin precio",
};
