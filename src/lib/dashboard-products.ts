/** Types + server fetch for GET /dashboard/products. */

import { joinApiGatewayPath } from "@/lib/api";
import { parseProductBatch, type ProductBatch } from "@/lib/inventory";

/** Matches backend `MAX_UNLIMITED_STOCK_SENTINEL` (bulk “unlimited” stock UX). */
export const DASHBOARD_PRODUCT_UNLIMITED_STOCK = "999999999999999";

/** Human-readable on-hand quantity for catalog tables. */
export function formatProductStockLabel(stockQuantity: string): string {
  if (stockQuantity === DASHBOARD_PRODUCT_UNLIMITED_STOCK) {
    return "Ilimitado";
  }
  try {
    return BigInt(stockQuantity).toLocaleString("es");
  } catch {
    const n = Number(stockQuantity);
    if (!Number.isFinite(n)) return stockQuantity;
    return Math.trunc(n).toLocaleString("es");
  }
}

export type DashboardProductRow = Readonly<{
  productId: number;
  name: string;
  presentation: string | null;
  unit: string;
  sku: string | null;
  status: string;
  deletedAt: string | null;
  stockQuantity: string;
  price: string | null;
  imageUrl: string | null;
  categoryId: number | null;

  trackStock: boolean;
  available: number | null;
  onHand: number | null;
  reserved: number | null;
  committed: number | null;
  incoming: number | null;
  total: number | null;
  minimumStock: number | null;
}>;

function parseOptionalQty(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseProduct(raw: unknown): DashboardProductRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.productId === "number" ? o.productId : Number(o.productId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const unit = typeof o.unit === "string" ? o.unit.trim() : "";
  const skuRaw = typeof o.sku === "string" ? o.sku.trim() : "";
  const status = typeof o.status === "string" ? o.status.trim() : "active";
  const deletedAt =
    o.deletedAt === null || o.deletedAt === undefined
      ? null
      : typeof o.deletedAt === "string"
        ? o.deletedAt
        : null;

  let stockQuantity = DASHBOARD_PRODUCT_UNLIMITED_STOCK;
  const sq = o.stockQuantity;
  if (typeof sq === "string" && sq.trim().length > 0) {
    stockQuantity = sq.trim();
  } else if (typeof sq === "number" && Number.isFinite(sq)) {
    stockQuantity = String(Math.trunc(sq));
  }

  const price =
    o.price === null || o.price === undefined
      ? null
      : typeof o.price === "string"
        ? o.price.trim().length
          ? o.price.trim()
          : null
        : typeof o.price === "number" && Number.isFinite(o.price)
          ? String(o.price)
          : null;

  const imageUrl =
    o.imageUrl === null || o.imageUrl === undefined
      ? null
      : typeof o.imageUrl === "string" && o.imageUrl.trim().length > 0
        ? o.imageUrl.trim()
        : null;

  let categoryId: number | null = null;
  if (o.categoryId !== null && o.categoryId !== undefined && o.categoryId !== "") {
    const cid = typeof o.categoryId === "number" ? o.categoryId : Number(o.categoryId);
    if (Number.isFinite(cid) && cid > 0) categoryId = cid;
  }

  const presentationRaw =
    o.presentation === null || o.presentation === undefined
      ? ""
      : typeof o.presentation === "string"
        ? o.presentation.trim()
        : "";
  const presentation = presentationRaw.length ? presentationRaw : null;

  const trackStock =
    o.trackStock === true ||
    o.trackStock === 1 ||
    o.trackStock === "true" ||
    o.trackStock === "1" ||
    (o.available !== undefined && o.available !== null && o.onHand !== undefined);

  return {
    productId: id,
    name: name || "—",
    presentation,
    unit: unit || "—",
    sku: skuRaw.length ? skuRaw : null,
    status: status || "—",
    deletedAt,
    stockQuantity,
    price,
    imageUrl,
    categoryId,
    trackStock,
    available: trackStock ? (parseOptionalQty(o.available) ?? 0) : null,
    onHand: trackStock ? (parseOptionalQty(o.onHand) ?? 0) : null,
    reserved: trackStock ? (parseOptionalQty(o.reserved) ?? 0) : null,
    committed: trackStock ? (parseOptionalQty(o.committed) ?? 0) : null,
    incoming: trackStock ? (parseOptionalQty(o.incoming) ?? 0) : null,
    total: trackStock
      ? (parseOptionalQty(o.total) ??
          (parseOptionalQty(o.onHand) ?? 0) + (parseOptionalQty(o.incoming) ?? 0))
      : null,
    minimumStock: parseOptionalQty(o.minimumStock),
  };
}

export function catalogIncomingQty(r: DashboardProductRow): number {
  return r.incoming ?? 0;
}

export function catalogTotalQty(r: DashboardProductRow): number {
  const onHand = r.onHand ?? 0;
  return r.total ?? onHand + (r.incoming ?? 0);
}

/** Active catalog rows (omit soft-deleted). */
export function activeProducts(rows: readonly DashboardProductRow[]): DashboardProductRow[] {
  return rows.filter((p) => p.deletedAt == null || p.deletedAt === "");
}

/** Active + selectable in order editor (status active). */
export function selectableProducts(rows: readonly DashboardProductRow[]): DashboardProductRow[] {
  return activeProducts(rows).filter((p) => p.status === "active");
}

/** Client-side catalog load via Route Handler. */
export async function fetchProductBatchesViaProxy(productId: number): Promise<ProductBatch[]> {
  const res = await fetch(`/api/backend/dashboard/products/${productId}/batches`, {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as { batches?: unknown[] };
  if (!res.ok || !Array.isArray(data.batches)) return [];
  return data.batches
    .map((item) => parseProductBatch(item))
    .filter((b): b is ProductBatch => b !== null);
}

/** Client-side catalog load via Route Handler. */
export async function fetchProductsViaProxy(options?: {
  warehouseId?: number | null;
}): Promise<DashboardProductRow[]> {
  const params = new URLSearchParams();
  if (options?.warehouseId != null && options.warehouseId > 0) {
    params.set("warehouseId", String(options.warehouseId));
  }
  const qs = params.toString();
  const url = qs.length > 0 ? `/api/backend/dashboard/products?${qs}` : "/api/backend/dashboard/products";
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) return [];
  return parseDashboardProductsEnvelope(data);
}

/** Prefer id_token (custom tenant claims); fall back to access_token for gateways that reject IDs. */
function uniqBearerCandidates(idToken?: string | null, accessToken?: string | null): string[] {
  return [
    ...new Set(
      [idToken, accessToken].filter((t): t is string => typeof t === "string" && t.length > 0),
    ),
  ];
}

function parseProductsEnvelope(data: unknown): DashboardProductRow[] {
  const o = data as { products?: unknown[] };
  if (!Array.isArray(o.products)) return [];
  const rows: DashboardProductRow[] = [];
  for (const item of o.products) {
    const row = parseProduct(item);
    if (row) rows.push(row);
  }
  return rows;
}

/** Client / Route Handler responses (JSON body shaped like `{ products?: … }`). */
export function parseDashboardProductsEnvelope(data: unknown): DashboardProductRow[] {
  return parseProductsEnvelope(data);
}

function dashboardProductsPayloadFromResponseText(text: string, httpOk: boolean): DashboardProductRow[] | null {
  if (!httpOk) return null;
  let data: unknown;
  try {
    if (text.trim() === "") data = {};
    else data = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  return parseProductsEnvelope(data);
}

/**
 * Server-side catalog load via the app’s own Route Handler (same path/cookies as the browser).
 * Prefer this in RSC when direct API Gateway calls from the Node process fail (TLS, IPv6, env).
 */
export async function fetchProductsDashboardViaAppProxy(
  origin: string,
  cookieHeader: string,
): Promise<DashboardProductRow[] | null> {
  const base = origin.replace(/\/+$/, "");
  if (!base) return null;

  const url = `${base}/api/backend/dashboard/products`;

  try {
    const res = await fetch(url, {
      headers: cookieHeader.length > 0 ? { Cookie: cookieHeader } : {},
      cache: "no-store",
    });
    const text = await res.text();
    return dashboardProductsPayloadFromResponseText(text, res.ok);
  } catch {
    return null;
  }
}

/** Direct Gateway: try Cognito **`id_token` first**, then **`access_token`** on 401/403. */
export async function fetchProductsDashboard(
  apiUrl: string,
  idToken?: string | null,
  accessToken?: string | null,
): Promise<DashboardProductRow[] | null> {
  const base = apiUrl.replace(/\/+$/, "");
  if (!base) return null;

  const bearerCandidates = uniqBearerCandidates(idToken, accessToken);
  if (bearerCandidates.length === 0) return null;

  const upstreamUrl = joinApiGatewayPath(base, "dashboard/products");

  try {
    for (let i = 0; i < bearerCandidates.length; i++) {
      const res = await fetch(upstreamUrl, {
        headers: { Authorization: `Bearer ${bearerCandidates[i]}` },
        cache: "no-store",
      });

      const text = await res.text();

      if (res.ok) {
        return dashboardProductsPayloadFromResponseText(text, true);
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
