/** Per-product vendor (proveedor) pricing — who supplies this product. */

export type ProductVendorPricingRow = Readonly<{
  vendorId: number;
  vendorName: string;
  vendorSku: string | null;
  unitCost: number;
  currency: string | null;
  minOrderQty: number | null;
  packSize: number | null;
  leadTimeDays: number | null;
  isPreferred: boolean;
  updatedAt: string;
}>;

export type UpsertProductVendorPricingPayload = Readonly<{
  vendorSku?: string | null;
  unitCost: number;
  currency?: string | null;
  minOrderQty?: number | null;
  packSize?: number | null;
  leadTimeDays?: number | null;
  isPreferred?: boolean;
}>;

function parseVendorPricingRow(raw: unknown): ProductVendorPricingRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const vendorId = typeof o.vendorId === "number" ? o.vendorId : Number(o.vendorId);
  if (!Number.isFinite(vendorId)) return null;
  const unitCost = typeof o.unitCost === "number" ? o.unitCost : Number(o.unitCost);
  if (!Number.isFinite(unitCost)) return null;
  const numOrNull = (v: unknown): number | null =>
    v == null ? null : typeof v === "number" && Number.isFinite(v) ? v : null;
  return {
    vendorId,
    vendorName: typeof o.vendorName === "string" ? o.vendorName : "—",
    vendorSku: typeof o.vendorSku === "string" ? o.vendorSku : null,
    unitCost,
    currency: typeof o.currency === "string" ? o.currency : null,
    minOrderQty: numOrNull(o.minOrderQty),
    packSize: numOrNull(o.packSize),
    leadTimeDays: numOrNull(o.leadTimeDays),
    isPreferred: o.isPreferred === true,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : "",
  };
}

function parseVendorList(data: Record<string, unknown>): ProductVendorPricingRow[] {
  if (!Array.isArray(data.vendors)) return [];
  const rows: ProductVendorPricingRow[] = [];
  for (const item of data.vendors) {
    const row = parseVendorPricingRow(item);
    if (row) rows.push(row);
  }
  return rows;
}

export async function fetchProductVendorPricingViaProxy(
  productId: number,
): Promise<ProductVendorPricingRow[]> {
  const res = await fetch(
    `/api/backend/dashboard/products/${productId}/vendor-pricing`,
    { cache: "no-store", credentials: "include" },
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
  }
  return parseVendorList(data);
}

export async function upsertProductVendorPricingViaProxy(
  productId: number,
  vendorId: number,
  payload: UpsertProductVendorPricingPayload,
): Promise<{ ok: true; vendor: ProductVendorPricingRow } | { ok: false; error: string }> {
  const res = await fetch(
    `/api/backend/dashboard/products/${productId}/vendor-pricing/${vendorId}`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : `Error ${res.status}`,
    };
  }
  const vendor = parseVendorPricingRow(data.vendor);
  if (!vendor) return { ok: false, error: "Respuesta inválida del servidor" };
  return { ok: true, vendor };
}

export async function deleteProductVendorPricingViaProxy(
  productId: number,
  vendorId: number,
): Promise<{ ok: true; vendors: ProductVendorPricingRow[] } | { ok: false; error: string }> {
  const res = await fetch(
    `/api/backend/dashboard/products/${productId}/vendor-pricing/${vendorId}`,
    { method: "DELETE", credentials: "include" },
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : `Error ${res.status}`,
    };
  }
  return { ok: true, vendors: parseVendorList(data) };
}

export async function preferProductVendorPricingViaProxy(
  productId: number,
  vendorId: number,
): Promise<{ ok: true; vendors: ProductVendorPricingRow[] } | { ok: false; error: string }> {
  const res = await fetch(
    `/api/backend/dashboard/products/${productId}/vendor-pricing/${vendorId}/prefer`,
    { method: "POST", credentials: "include" },
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : `Error ${res.status}`,
    };
  }
  return { ok: true, vendors: parseVendorList(data) };
}
