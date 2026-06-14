/** Purchase order list/detail/receive proxy clients. */

import type { DashboardProductRow } from "@/lib/dashboard-products";

export type PurchaseOrderStatus =
  | "draft"
  | "sent"
  | "partially_received"
  | "received"
  | "complete"
  | "cancelled";

export type PurchaseOrderListRow = Readonly<{
  poId: string;
  displayCode: string;
  vendorName: string;
  warehouseName: string;
  status: PurchaseOrderStatus;
  currency: string | null;
  expectedAt: string | null;
  itemCount: number;
  receivedPct: number;
  total: number | null;
  createdAt: string;
}>;

export type PurchaseOrderItem = Readonly<{
  poItemId: string;
  productId: number;
  productName: string;
  sku: string | null;
  trackBatches: boolean;
  qtyOrdered: number;
  qtyReceived: number;
  qtyOutstanding: number;
  unitCost: number;
  lineSubtotal: number;
  batchNumber: string | null;
  expiryDate: string | null;
}>;

export type PurchaseOrderDetail = Readonly<{
  poId: string;
  displayCode: string;
  vendorId: number;
  vendorName: string;
  warehouseId: number;
  warehouseName: string;
  status: PurchaseOrderStatus;
  currency: string | null;
  expectedAt: string | null;
  notes: string | null;
  extraCosts: number;
  subtotal: number | null;
  total: number | null;
  receivedPct: number;
  createdAt: string;
  receivedAt: string | null;
  cancelledAt: string | null;
  items: PurchaseOrderItem[];
}>;

export type ReceiveLinePayload = Readonly<{
  poItemId: string;
  qtyReceived: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
}>;

export type CreatePoLineInput = Readonly<{
  productId: number;
  qtyOrdered: number;
  unitCost: number;
}>;

export type CreatePurchaseOrderPayload = Readonly<{
  vendorId: number;
  warehouseId: number;
  expectedAt: string | null;
  notes: string | null;
  extraCosts: number;
  items: CreatePoLineInput[];
}>;

export type ReorderSuggestion = Readonly<{
  productId: number;
  name: string;
  sku: string | null;
  onHand: number;
  minimumStock: number;
  suggestedQty: number;
}>;

export type RawCreateLine = Readonly<{
  productId: number | undefined;
  qtyOrdered: number;
  unitCost: number;
}>;

/**
 * Products whose tracked on-hand is below their configured minimum.
 * NOTE (v2): does NOT subtract in-transit PO qty.
 */
export function computeReorderSuggestions(
  products: readonly DashboardProductRow[],
): ReorderSuggestion[] {
  const out: ReorderSuggestion[] = [];
  for (const p of products) {
    if (!p.trackStock) continue;
    if (p.minimumStock == null || p.minimumStock <= 0) continue;
    const onHand = p.onHand ?? 0;
    if (onHand >= p.minimumStock) continue;
    const suggestedQty = Math.max(1, Math.ceil(p.minimumStock - onHand));
    out.push({
      productId: p.productId,
      name: p.name,
      sku: p.sku,
      onHand,
      minimumStock: p.minimumStock,
      suggestedQty,
    });
  }
  out.sort((a, b) => a.onHand - a.minimumStock - (b.onHand - b.minimumStock));
  return out;
}

export function buildCreatePayload(input: {
  vendorId: number | undefined;
  warehouseId: number | undefined;
  expectedAt: string | null;
  notes: string;
  extraCosts: number;
  lines: readonly RawCreateLine[];
}):
  | { ok: true; payload: CreatePurchaseOrderPayload }
  | { ok: false; error: string } {
  if (!input.vendorId || input.vendorId <= 0) {
    return { ok: false, error: "Seleccioná un proveedor." };
  }
  if (!input.warehouseId || input.warehouseId <= 0) {
    return { ok: false, error: "Seleccioná una bodega." };
  }
  const items: CreatePoLineInput[] = [];
  for (const l of input.lines) {
    if (!l.productId || l.productId <= 0) continue;
    if (!Number.isFinite(l.qtyOrdered) || l.qtyOrdered <= 0) {
      return { ok: false, error: "Cada línea debe tener una cantidad mayor a 0." };
    }
    if (!Number.isFinite(l.unitCost) || l.unitCost < 0) {
      return { ok: false, error: "El costo unitario no puede ser negativo." };
    }
    items.push({
      productId: l.productId,
      qtyOrdered: l.qtyOrdered,
      unitCost: l.unitCost,
    });
  }
  if (items.length === 0) {
    return { ok: false, error: "Agregá al menos un producto a la orden." };
  }
  return {
    ok: true,
    payload: {
      vendorId: input.vendorId,
      warehouseId: input.warehouseId,
      expectedAt: input.expectedAt,
      notes: input.notes.trim() || null,
      extraCosts: Number.isFinite(input.extraCosts) && input.extraCosts > 0 ? input.extraCosts : 0,
      items,
    },
  };
}

/** today + leadTimeDays, as YYYY-MM-DD, or null. */
export function expectedFromLeadTime(leadTimeDays: number | null): string | null {
  if (leadTimeDays == null || leadTimeDays < 0) return null;
  const d = new Date();
  d.setDate(d.getDate() + leadTimeDays);
  return d.toISOString().slice(0, 10);
}

export function formatPoMoney(value: number | null, currency: string | null): string {
  if (value === null) return "—";
  try {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: currency ?? "CRC",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toLocaleString("es");
  }
}

type ApiErrorBody = { error?: string; code?: string; message?: string };

function readPoErrorBody(body: ApiErrorBody, status: number): string {
  if (typeof body.message === "string" && body.message.trim().length > 0) {
    return body.message.trim();
  }
  if (typeof body.error === "string" && body.error.trim().length > 0) {
    return body.error.trim();
  }
  return `Error ${status}`;
}

const PO_STATUSES: readonly PurchaseOrderStatus[] = [
  "draft",
  "sent",
  "partially_received",
  "received",
  "complete",
  "cancelled",
];

function parseStatus(value: unknown): PurchaseOrderStatus | null {
  const s = typeof value === "string" ? value.trim() : "";
  return (PO_STATUSES as readonly string[]).includes(s) ? (s as PurchaseOrderStatus) : null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parsePurchaseOrderItem(raw: unknown): PurchaseOrderItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const poItemId = typeof o.poItemId === "string" ? o.poItemId.trim() : "";
  const productId = parseNumber(o.productId);
  const productName = typeof o.productName === "string" ? o.productName.trim() : "";
  const qtyOrdered = parseNumber(o.qtyOrdered);
  const qtyReceived = parseNumber(o.qtyReceived);
  const qtyOutstanding = parseNumber(o.qtyOutstanding);
  const unitCost = parseNumber(o.unitCost);
  const lineSubtotal = parseNumber(o.lineSubtotal);
  if (
    !poItemId ||
    productId === null ||
    productId <= 0 ||
    !productName ||
    qtyOrdered === null ||
    qtyReceived === null ||
    qtyOutstanding === null ||
    unitCost === null ||
    lineSubtotal === null
  ) {
    return null;
  }
  return {
    poItemId,
    productId,
    productName,
    sku: typeof o.sku === "string" && o.sku.trim() ? o.sku.trim() : null,
    trackBatches: o.trackBatches === true,
    qtyOrdered,
    qtyReceived,
    qtyOutstanding,
    unitCost,
    lineSubtotal,
    batchNumber:
      typeof o.batchNumber === "string" && o.batchNumber.trim() ? o.batchNumber.trim() : null,
    expiryDate:
      typeof o.expiryDate === "string" && o.expiryDate.trim() ? o.expiryDate.trim() : null,
  };
}

function parsePurchaseOrderListRow(raw: unknown): PurchaseOrderListRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const poId = typeof o.poId === "string" ? o.poId.trim() : "";
  const displayCode = typeof o.displayCode === "string" ? o.displayCode.trim() : "";
  const vendorName = typeof o.vendorName === "string" ? o.vendorName.trim() : "";
  const warehouseName = typeof o.warehouseName === "string" ? o.warehouseName.trim() : "";
  const status = parseStatus(o.status);
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : "";
  const itemCount = parseNumber(o.itemCount);
  const receivedPct = parseNumber(o.receivedPct);
  if (
    !poId ||
    !displayCode ||
    !vendorName ||
    !warehouseName ||
    !status ||
    !createdAt ||
    itemCount === null ||
    receivedPct === null
  ) {
    return null;
  }
  const total = parseNumber(o.total);
  return {
    poId,
    displayCode,
    vendorName,
    warehouseName,
    status,
    currency: typeof o.currency === "string" && o.currency.trim() ? o.currency.trim() : null,
    expectedAt:
      typeof o.expectedAt === "string" && o.expectedAt.trim() ? o.expectedAt.trim() : null,
    itemCount,
    receivedPct,
    total,
    createdAt,
  };
}

function parsePurchaseOrderDetail(raw: unknown): PurchaseOrderDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const listBase = parsePurchaseOrderListRow(raw);
  if (!listBase) return null;
  const vendorId = parseNumber(o.vendorId);
  const warehouseId = parseNumber(o.warehouseId);
  const extraCosts = parseNumber(o.extraCosts);
  const subtotal = parseNumber(o.subtotal);
  if (vendorId === null || warehouseId === null || extraCosts === null) return null;

  const itemsRaw = Array.isArray(o.items) ? o.items : [];
  const items: PurchaseOrderItem[] = [];
  for (const item of itemsRaw) {
    const parsed = parsePurchaseOrderItem(item);
    if (parsed) items.push(parsed);
  }

  return {
    ...listBase,
    vendorId,
    warehouseId,
    notes: typeof o.notes === "string" && o.notes.trim() ? o.notes.trim() : null,
    extraCosts,
    subtotal,
    receivedAt:
      typeof o.receivedAt === "string" && o.receivedAt.trim() ? o.receivedAt.trim() : null,
    cancelledAt:
      typeof o.cancelledAt === "string" && o.cancelledAt.trim() ? o.cancelledAt.trim() : null,
    items,
  };
}

export async function fetchPurchaseOrdersViaProxy(params?: {
  status?: PurchaseOrderStatus;
  vendorId?: number;
}): Promise<PurchaseOrderListRow[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.vendorId != null) qs.set("vendorId", String(params.vendorId));
  const suffix = qs.toString();
  const res = await fetch(
    `/api/backend/dashboard/purchase-orders${suffix ? `?${suffix}` : ""}`,
    {
      cache: "no-store",
      credentials: "include",
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    purchaseOrders?: unknown[];
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(readPoErrorBody(data, res.status));
  }
  if (!Array.isArray(data.purchaseOrders)) return [];
  const rows: PurchaseOrderListRow[] = [];
  for (const item of data.purchaseOrders) {
    const row = parsePurchaseOrderListRow(item);
    if (row) rows.push(row);
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows;
}

export async function fetchPurchaseOrderViaProxy(
  poId: string,
): Promise<PurchaseOrderDetail | null> {
  const res = await fetch(
    `/api/backend/dashboard/purchase-orders/${encodeURIComponent(poId)}`,
    {
      cache: "no-store",
      credentials: "include",
    },
  );
  if (res.status === 404) return null;
  const data = (await res.json().catch(() => ({}))) as {
    purchaseOrder?: unknown;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(readPoErrorBody(data, res.status));
  }
  if (!data.purchaseOrder) return null;
  return parsePurchaseOrderDetail(data.purchaseOrder);
}

export async function receivePurchaseOrderViaProxy(
  poId: string,
  receiptRef: string,
  lines: readonly ReceiveLinePayload[],
): Promise<{ ok: true; status: PurchaseOrderStatus } | { ok: false; error: string }> {
  const res = await fetch(
    `/api/backend/dashboard/purchase-orders/${encodeURIComponent(poId)}/receive`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiptRef, lines }),
    },
  );
  const body = (await res.json().catch(() => ({}))) as {
    status?: unknown;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    return { ok: false, error: readPoErrorBody(body, res.status) };
  }
  const status = parseStatus(body.status);
  if (!status) {
    return { ok: false, error: "Respuesta de recepción inválida." };
  }
  return { ok: true, status };
}

export async function cancelPurchaseOrderViaProxy(
  poId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(
    `/api/backend/dashboard/purchase-orders/${encodeURIComponent(poId)}/cancel`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    return { ok: false, error: readPoErrorBody(body, res.status) };
  }
  return { ok: true };
}

export async function createPurchaseOrderViaProxy(
  payload: CreatePurchaseOrderPayload,
): Promise<{ ok: true; poId: string; displayCode: string } | { ok: false; error: string }> {
  const res = await fetch("/api/backend/dashboard/purchase-orders", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    poId?: unknown;
    displayCode?: unknown;
    error?: string;
    message?: string;
  };
  if (!res.ok) return { ok: false, error: readPoErrorBody(data, res.status) };
  const poId = typeof data.poId === "string" ? data.poId : "";
  if (!poId) return { ok: false, error: "Respuesta inválida del servidor." };
  return {
    ok: true,
    poId,
    displayCode: typeof data.displayCode === "string" ? data.displayCode : poId,
  };
}
