/** Types + server fetch for GET /dashboard/orders (per status; merged for list views). */

import { joinApiGatewayPath } from "@/lib/api";
import type { MarketingLocale } from "@/lib/marketing-locale";
import { parseMatchCoverage } from "@/lib/match-coverage";

export const DASHBOARD_ORDER_STATUSES = [
  "draft",
  "pending",
  "confirmed",
  "in_progress",
  "in_route",
  "delivered",
  "cancelled",
] as const;

export type DashboardOrderStatus = (typeof DASHBOARD_ORDER_STATUSES)[number];

export const DEFAULT_ORDER_STATUS_FILTER: DashboardOrderStatus[] = [
  "draft",
  "pending",
  "confirmed",
];

export const ORDER_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: DashboardOrderStatus;
  label: string;
}> = [
  { value: "draft", label: "Borradores" },
  { value: "pending", label: "En Revisión" },
  { value: "confirmed", label: "Confirmados" },
  { value: "in_progress", label: "En preparación" },
  { value: "in_route", label: "En ruta" },
  { value: "delivered", label: "Entregados" },
  { value: "cancelled", label: "Cancelados" },
];

export type OrderStatusFilterLogic = "or" | "and";

/** Parse `?status=draft,pending` from URL; `all` = no status filter; defaults to active-work statuses. */
export function parseOrderStatusFilter(raw: string | undefined): string[] {
  if (raw === "all") return [];
  if (!raw?.trim()) return [...DEFAULT_ORDER_STATUS_FILTER];
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [...DEFAULT_ORDER_STATUS_FILTER];
}

export function orderStatusFilterToParam(statuses: readonly string[]): string {
  return statuses.length === 0 ? "all" : statuses.join(",");
}

export function parseOrderStatusFilterLogic(raw: string | null | undefined): OrderStatusFilterLogic {
  return raw === "and" ? "and" : "or";
}

export function orderMatchesStatusFilter(
  orderStatusKey: string,
  selected: readonly string[],
  logic: OrderStatusFilterLogic,
): boolean {
  if (selected.length === 0) return true;
  if (logic === "or") return selected.includes(orderStatusKey);
  if (selected.length === 1) return selected[0] === orderStatusKey;
  return false;
}

export function formatOrderStatusFilterSummary(
  selected: readonly string[],
  labelByKey: ReadonlyMap<string, string>,
): string | null {
  if (selected.length === 0) return null;
  const first = selected[0]!;
  const firstLabel = labelByKey.get(first) ?? first;
  if (selected.length === 1) return firstLabel;
  return `${firstLabel} + ${String(selected.length - 1)}`;
}

/** Accent- and case-insensitive search normalization. */
export function normalizeOrderSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export type OrdersViewMode = "list" | "board";

export const ORDERS_VIEW_STORAGE_KEY = "zumo.orders.view";

export function ordersBoardViewLabel(locale: MarketingLocale): string {
  return locale === "en" ? "Flow" : "Flujo";
}

export function ordersBoardFilteredDescription(locale: MarketingLocale, count: number): string {
  if (locale === "en") {
    return `Showing ${String(count)} order${count === 1 ? "" : "s"} in the flow.`;
  }
  return `Mostrando ${String(count)} ${count === 1 ? "pedido" : "pedidos"} en el flujo.`;
}

export function ordersBoardEmptyDescription(locale: MarketingLocale): string {
  return locale === "en"
    ? "Drag orders between columns to change their status."
    : "Arrastrá pedidos entre columnas para cambiar su estado.";
}

export function parseOrdersViewMode(raw: string | null | undefined): OrdersViewMode {
  if (raw === "board" || raw === "list") return raw;
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(ORDERS_VIEW_STORAGE_KEY);
    if (stored === "board" || stored === "list") return stored;
  }
  return "list";
}

export type DashboardOrderListRow = Readonly<{
  orderId: string;
  displayCode: string | null;
  customerId: number;
  status: string;
  effectiveStatusKey: string;
  createdAt: string | null;
  deliveryDate: string | null;
  deliveryDateStatus: string | null;
  isLateOrder: boolean;
  confirmedAt: string | null;
  seenAt: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  lineCount: number;
  conversationId: string | null;
  matchCoverage: number | null;
  isTouchless: boolean;
  productNames: string[];
  productSkus: string[];
  isBackordered: boolean;
  backorderLineCount: number;
  hasBackorderRisk: boolean;
  backorderRiskLineCount: number;
}>;

export type DashboardOrderPatch = Partial<
  Pick<DashboardOrderListRow, "displayCode" | "seenAt" | "expiresAt" | "isExpired">
>;

export type DashboardOrderStatusChangeHandler = (
  orderId: string,
  status: string,
  patch?: DashboardOrderPatch,
) => void;

function readStringField(o: Record<string, unknown>, key: string): string | null {
  const value = o[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOrderListRow(raw: unknown): DashboardOrderListRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const orderId = typeof o.orderId === "string" ? o.orderId.trim() : "";
  if (!orderId) return null;

  const cid = typeof o.customerId === "number" ? o.customerId : Number(o.customerId);
  if (!Number.isFinite(cid) || cid <= 0) return null;

  const status = typeof o.status === "string" ? o.status.trim() : "draft";
  const effectiveStatusKey =
    typeof o.effectiveStatusKey === "string" && o.effectiveStatusKey.trim()
      ? o.effectiveStatusKey.trim()
      : typeof o.effective_status_key === "string" && o.effective_status_key.trim()
        ? o.effective_status_key.trim()
        : status;
  const createdAt =
    typeof o.createdAt === "string" && o.createdAt.length > 0 ? o.createdAt : null;
  const deliveryDate =
    o.deliveryDate === null || o.deliveryDate === undefined
      ? null
      : typeof o.deliveryDate === "string" && o.deliveryDate.trim().length > 0
        ? o.deliveryDate.trim()
        : null;
  const confirmedAt =
    o.confirmedAt === null || o.confirmedAt === undefined
      ? null
      : typeof o.confirmedAt === "string" && o.confirmedAt.length > 0
        ? o.confirmedAt
        : null;

  const lines = Array.isArray(o.lines) ? o.lines : [];
  const explicitCount =
    typeof o.lineCount === "number" && Number.isFinite(o.lineCount)
      ? o.lineCount
      : typeof o.itemCount === "number" && Number.isFinite(o.itemCount)
        ? o.itemCount
        : null;
  const lineCount = explicitCount ?? lines.length;

  const conversationId =
    o.conversationId === null || o.conversationId === undefined
      ? null
      : typeof o.conversationId === "string" && o.conversationId.trim().length > 0
        ? o.conversationId.trim()
        : null;

  const matchCoverage = parseMatchCoverage(o.matchCoverage);
  const isTouchless = o.isTouchless === true;
  const deliveryDateStatus =
    readStringFieldOrNull(o, "deliveryDateStatus") ??
    readStringFieldOrNull(o, "delivery_date_status");
  const isLateOrder = o.isLateOrder === true || o.is_late_order === true;

  const displayCode =
    readStringField(o, "displayCode") ?? readStringField(o, "display_code");

  const seenAt =
    o.seenAt === null || o.seenAt === undefined
      ? null
      : typeof o.seenAt === "string" && o.seenAt.length > 0
        ? o.seenAt
        : null;

  const expiresAt =
    o.expiresAt === null || o.expiresAt === undefined
      ? null
      : typeof o.expiresAt === "string" && o.expiresAt.length > 0
        ? o.expiresAt
        : null;

  const isExpired =
    o.isExpired === true ||
    (status === "draft" &&
      expiresAt !== null &&
      Number.isFinite(Date.parse(expiresAt)) &&
      Date.parse(expiresAt) < Date.now());

  const productNames = parseStringArrayField(o, "productNames");
  const productSkus = parseStringArrayField(o, "productSkus");
  const isBackordered =
    o.isBackordered === true ||
    lines.some((line) => {
      if (!line || typeof line !== "object") return false;
      const qty = (line as Record<string, unknown>).qtyBackordered;
      return typeof qty === "number" ? qty > 0 : Number(qty) > 0;
    });
  const backorderLineCount =
    typeof o.backorderLineCount === "number" && Number.isFinite(o.backorderLineCount)
      ? o.backorderLineCount
      : lines.filter((line) => {
          if (!line || typeof line !== "object") return false;
          const qty = (line as Record<string, unknown>).qtyBackordered;
          return typeof qty === "number" ? qty > 0 : Number(qty) > 0;
        }).length;

  const hasBackorderRisk =
    typeof o.hasBackorderRisk === "boolean"
      ? o.hasBackorderRisk
      : isBackordered;

  const backorderRiskLineCount =
    typeof o.backorderRiskLineCount === "number" && Number.isFinite(o.backorderRiskLineCount)
      ? o.backorderRiskLineCount
      : isBackordered
        ? backorderLineCount
        : 0;

  return {
    orderId,
    displayCode,
    customerId: cid,
    status: status || "draft",
    effectiveStatusKey: effectiveStatusKey || status || "draft",
    createdAt,
    deliveryDate,
    deliveryDateStatus,
    isLateOrder,
    confirmedAt,
    seenAt,
    expiresAt,
    isExpired,
    lineCount,
    conversationId,
    matchCoverage,
    isTouchless,
    productNames,
    productSkus,
    isBackordered,
    backorderLineCount,
    hasBackorderRisk,
    backorderRiskLineCount,
  };
}

function parseStringArrayField(o: Record<string, unknown>, key: string): string[] {
  const raw = o[key];
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed) out.push(trimmed);
  }
  return out;
}

function parseOrdersEnvelope(data: unknown): DashboardOrderListRow[] {
  const o = data as { orders?: unknown[] };
  if (!Array.isArray(o.orders)) return [];
  const rows: DashboardOrderListRow[] = [];
  for (const item of o.orders) {
    const row = parseOrderListRow(item);
    if (row) rows.push(row);
  }
  return rows;
}

function dashboardOrdersPayloadFromResponseText(text: string, httpOk: boolean): DashboardOrderListRow[] | null {
  if (!httpOk) return null;
  try {
    const data = text.trim() === "" ? {} : (JSON.parse(text) as unknown);
    return parseOrdersEnvelope(data);
  } catch {
    return null;
  }
}

function uniqBearerCandidates(idToken?: string | null, accessToken?: string | null): string[] {
  return [
    ...new Set([idToken, accessToken].filter((t): t is string => typeof t === "string" && t.length > 0)),
  ];
}

/** Merge rows from multiple status queries (each order appears in at most one status). */
export function mergeAndSortOrders(rows: readonly DashboardOrderListRow[]): DashboardOrderListRow[] {
  const byId = new Map<string, DashboardOrderListRow>();
  for (const r of rows) {
    byId.set(r.orderId, r);
  }
  const merged = [...byId.values()];
  merged.sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  });
  return merged;
}

async function fetchOrdersByStatus(
  upstreamUrl: string,
  bearer: string,
  status: string,
): Promise<DashboardOrderListRow[] | null> {
  const url = `${upstreamUrl}?status=${encodeURIComponent(status)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearer}` },
      cache: "no-store",
    });
    const text = await res.text();
    return dashboardOrdersPayloadFromResponseText(text, res.ok);
  } catch {
    return null;
  }
}

export type DashboardOrdersFetchResult =
  | { ok: true; orders: DashboardOrderListRow[] }
  | { ok: false };

/**
 * Loads orders for every dashboard status and merges them (newest first).
 * Empty `orders` means the tenant has no orders — not an error.
 * `ok: false` only when every request fails for every bearer candidate.
 */
export async function fetchAllOrdersDashboard(
  apiUrl: string,
  idToken?: string | null,
  accessToken?: string | null,
  statuses: readonly string[] = DEFAULT_ORDER_STATUS_FILTER,
): Promise<DashboardOrdersFetchResult> {
  const base = apiUrl.replace(/\/+$/, "");
  if (!base) return { ok: false };

  const bearerCandidates = uniqBearerCandidates(idToken, accessToken);
  if (bearerCandidates.length === 0) return { ok: false };

  const upstreamBase = joinApiGatewayPath(base, "dashboard/orders");
  const statusList = statuses.length > 0 ? statuses : DEFAULT_ORDER_STATUS_FILTER;

  for (let i = 0; i < bearerCandidates.length; i++) {
    const bearer = bearerCandidates[i];
    const batchResults = await Promise.all(
      statusList.map((s) => fetchOrdersByStatus(upstreamBase, bearer, s)),
    );

    const flat: DashboardOrderListRow[] = [];
    let anyOk = false;
    for (const chunk of batchResults) {
      if (chunk !== null) {
        anyOk = true;
        flat.push(...chunk);
      }
    }

    if (anyOk) {
      return { ok: true, orders: mergeAndSortOrders(flat) };
    }

    const retriable =
      batchResults.some((c) => c === null) && i < bearerCandidates.length - 1;
    if (!retriable) break;
  }

  return { ok: false };
}

/** Client / Route Handler envelope `{ orders?: … }` for a single status response. */
export function parseDashboardOrdersEnvelope(data: unknown): DashboardOrderListRow[] {
  return parseOrdersEnvelope(data);
}

export type CreateOrderLineInput = Readonly<{
  productId: number | null;
  productNameRaw: string;
  quantity: number;
  unit: string;
  unitPrice?: number | null;
  notes?: string;
}>;

export type CreateOrderInput = Readonly<{
  customerId: number;
  lines: CreateOrderLineInput[];
  deliveryDate: string;
  deliveryTimeWindow?: string | null;
  deliveryNotes?: string;
  notes?: string;
}>;

export class CreateDashboardOrderError extends Error {
  readonly status: number;
  readonly details?: Record<string, string[]>;
  readonly lineIndex?: number;
  readonly responseBody?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    options?: {
      details?: Record<string, string[]>;
      lineIndex?: number;
      responseBody?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = "CreateDashboardOrderError";
    this.status = status;
    this.details = options?.details;
    this.lineIndex = options?.lineIndex;
    this.responseBody = options?.responseBody;
  }
}

/** Browser / Route Handler: POST `/api/backend/dashboard/orders`. */
export async function createDashboardOrderViaProxy(
  input: CreateOrderInput,
): Promise<{ orderId: string }> {
  const res = await fetch("/api/backend/dashboard/orders", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const details = body.details;
    const fieldErrors =
      details && typeof details === "object" && !Array.isArray(details)
        ? (details as Record<string, string[]>)
        : undefined;
    const lineIndex =
      typeof body.lineIndex === "number" && Number.isFinite(body.lineIndex)
        ? body.lineIndex
        : undefined;
    const msg =
      typeof body.error === "string" && body.error.trim().length > 0
        ? body.error.trim()
        : `No se pudo crear el pedido (HTTP ${String(res.status)}).`;
    throw new CreateDashboardOrderError(msg, res.status, {
      details: fieldErrors,
      lineIndex,
      responseBody: body,
    });
  }

  const order = body.order as Record<string, unknown> | undefined;
  const orderId = typeof order?.orderId === "string" ? order.orderId.trim() : "";
  if (!orderId) {
    throw new CreateDashboardOrderError("Respuesta inválida del servidor.", 502, {
      responseBody: body,
    });
  }

  return { orderId };
}

export class DashboardOrderActionError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DashboardOrderActionError";
    this.status = status;
  }
}

/** Parse a single order from list/detail/action API payloads. */
export function parseDashboardOrderRow(raw: unknown): DashboardOrderListRow | null {
  return parseOrderListRow(raw);
}

async function parseOrderActionError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return parseOrderActionErrorFromBody(body, res.status, fallback);
}

function parseOrderActionErrorFromBody(
  body: Record<string, unknown>,
  _status: number,
  fallback: string,
): string {
  let msg =
    typeof body.error === "string" && body.error.trim().length > 0 ? body.error.trim() : fallback;
  if (body.code === "SHORTFALL_BLOCKED" && Array.isArray(body.shortLines)) {
    const parts: string[] = [];
    for (const line of body.shortLines) {
      if (!line || typeof line !== "object") continue;
      const row = line as Record<string, unknown>;
      parts.push(
        `producto ${String(row.productId)}: pedido ${String(row.requested)}, disponible ${String(row.available)}`,
      );
    }
    if (parts.length > 0) msg = `${msg} (${parts.join("; ")})`;
  }
  return msg;
}

export type ConfirmOrderResult = Readonly<{
  isBackordered: boolean;
  order: DashboardOrderListRow | null;
}>;

/** Browser / Route Handler: POST `/api/backend/dashboard/orders/{orderId}/convert`. */
export async function convertDashboardOrderViaProxy(
  orderId: string,
): Promise<DashboardOrderListRow | null> {
  const res = await fetch(`/api/backend/dashboard/orders/${encodeURIComponent(orderId)}/convert`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const msg =
      typeof body.error === "string" && body.error.trim().length > 0
        ? body.error.trim()
        : "No se pudo convertir el borrador.";
    throw new DashboardOrderActionError(msg, res.status);
  }

  const orderRaw =
    body.order && typeof body.order === "object" ? body.order : body;
  return parseDashboardOrderRow(orderRaw);
}

/** Browser / Route Handler: POST `/api/backend/dashboard/orders/{orderId}/confirm`. */
export async function confirmDashboardOrderViaProxy(orderId: string): Promise<ConfirmOrderResult> {
  const res = await fetch(`/api/backend/dashboard/orders/${encodeURIComponent(orderId)}/confirm`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new DashboardOrderActionError(
      parseOrderActionErrorFromBody(body, res.status, "No se pudo confirmar el pedido."),
      res.status,
    );
  }

  const orderRaw = body.order && typeof body.order === "object" ? body.order : body;
  return {
    isBackordered: body.isBackordered === true,
    order: parseDashboardOrderRow(orderRaw),
  };
}

/** Browser / Route Handler: POST `/api/backend/dashboard/orders/{orderId}/status`. */
export async function updateDashboardOrderStatusViaProxy(
  orderId: string,
  status: string,
): Promise<DashboardOrderListRow | null> {
  const res = await fetch(
    `/api/backend/dashboard/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
      cache: "no-store",
    },
  );

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const msg =
      typeof body.error === "string" && body.error.trim().length > 0
        ? body.error.trim()
        : "No se pudo cambiar el estado del pedido.";
    throw new DashboardOrderActionError(msg, res.status);
  }

  const orderRaw =
    body.order && typeof body.order === "object" ? body.order : body;
  return parseDashboardOrderRow(orderRaw);
}

/** Browser / Route Handler: POST `/api/backend/dashboard/orders/{orderId}/seen`. */
export async function markDashboardOrderSeenViaProxy(orderId: string): Promise<void> {
  const res = await fetch(`/api/backend/dashboard/orders/${encodeURIComponent(orderId)}/seen`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new DashboardOrderActionError(
      await parseOrderActionError(res, "No se pudo marcar el borrador como visto."),
      res.status,
    );
  }
}

/** Browser / Route Handler: DELETE `/api/backend/dashboard/orders/{orderId}`. */
export async function deleteDashboardDraftViaProxy(orderId: string): Promise<void> {
  const res = await fetch(`/api/backend/dashboard/orders/${encodeURIComponent(orderId)}`, {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new DashboardOrderActionError(
      await parseOrderActionError(res, "No se pudo eliminar el borrador."),
      res.status,
    );
  }
}

export type PatchOrderLineInput = Readonly<{
  productId: number;
  quantity: number;
  unitPrice?: number;
}>;

export type PatchOrderInput = Readonly<{
  deliveryDate: string | null;
  lines: PatchOrderLineInput[];
}>;

export type DashboardOrderDetailLine = Readonly<{
  productId: number | null;
  productName: string;
  quantity: number;
  qtyReserved: number;
  qtyBackordered: number;
  unit: string;
  unitPrice: number | null;
  lineSubtotal: number | null;
  bandMin: number | null;
  bandMax: number | null;
  resolvedUnitPrice: number | null;
}>;

export type DashboardOrderDetail = Readonly<{
  orderId: string;
  displayCode: string | null;
  customerId: number;
  status: string;
  createdAt: string | null;
  deliveryDate: string | null;
  subtotal: number | null;
  total: number | null;
  lines: DashboardOrderDetailLine[];
  matchCoverage: number | null;
  isTouchless: boolean;
  isBackordered: boolean;
  hasBackorderRisk: boolean;
}>;

function asNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

function readStringFieldOrNull(o: Record<string, unknown>, key: string): string | null {
  const value = o[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Parse full order detail from GET /dashboard/orders/{orderId}. */
export function parseDashboardOrderDetail(
  raw: unknown,
  fallbackOrderId: string,
): DashboardOrderDetail | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!root) return null;

  const o =
    root.order && typeof root.order === "object" && !Array.isArray(root.order)
      ? (root.order as Record<string, unknown>)
      : root;

  const orderId = readStringFieldOrNull(o, "orderId") ?? fallbackOrderId;
  const customerId = parsePositiveInt(o.customerId);
  if (!customerId) return null;

  const linesRaw = Array.isArray(o.lines) ? o.lines : [];
  const lines: DashboardOrderDetailLine[] = [];
  for (const item of linesRaw) {
    if (!item || typeof item !== "object") continue;
    const line = item as Record<string, unknown>;
    const quantity = asNumberOrNull(line.quantity);
    if (quantity === null || quantity <= 0) continue;
    const qtyBackordered = Math.max(0, asNumberOrNull(line.qtyBackordered) ?? 0);
    const qtyReservedRaw = asNumberOrNull(line.qtyReserved);
    const qtyReserved =
      qtyReservedRaw !== null ? Math.max(0, qtyReservedRaw) : Math.max(0, quantity - qtyBackordered);
    lines.push({
      productId: parsePositiveInt(line.productId),
      productName:
        readStringFieldOrNull(line, "productName") ??
        readStringFieldOrNull(line, "productNameRaw") ??
        "—",
      quantity,
      qtyReserved,
      qtyBackordered,
      unit: readStringFieldOrNull(line, "unit") ?? "—",
      unitPrice: asNumberOrNull(line.unitPrice),
      lineSubtotal: asNumberOrNull(line.lineSubtotal),
      bandMin: asNumberOrNull(line.bandMin),
      bandMax: asNumberOrNull(line.bandMax),
      resolvedUnitPrice: asNumberOrNull(line.resolvedUnitPrice),
    });
  }

  const isBackordered =
    o.isBackordered === true ||
    lines.some((line) => line.qtyBackordered > 0);

  const hasBackorderRisk =
    typeof o.hasBackorderRisk === "boolean" ? o.hasBackorderRisk : isBackordered;

  return {
    orderId,
    displayCode:
      readStringFieldOrNull(o, "displayCode") ?? readStringFieldOrNull(o, "display_code"),
    customerId,
    status: readStringFieldOrNull(o, "status") ?? "draft",
    createdAt: readStringFieldOrNull(o, "createdAt"),
    deliveryDate: readStringFieldOrNull(o, "deliveryDate"),
    subtotal: asNumberOrNull(o.subtotal),
    total: asNumberOrNull(o.total),
    lines,
    matchCoverage: parseMatchCoverage(o.matchCoverage),
    isTouchless: o.isTouchless === true,
    isBackordered,
    hasBackorderRisk,
  };
}

/** Browser / Route Handler: GET `/api/backend/dashboard/orders/{orderId}`. */
export async function fetchDashboardOrderDetailViaProxy(
  orderId: string,
): Promise<DashboardOrderDetail | null> {
  const res = await fetch(`/api/backend/dashboard/orders/${encodeURIComponent(orderId)}`, {
    credentials: "include",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) return null;
  return parseDashboardOrderDetail(body, orderId);
}

/** Browser / Route Handler: PATCH `/api/backend/dashboard/orders/{orderId}`. */
export async function patchDashboardOrderViaProxy(
  orderId: string,
  input: PatchOrderInput,
): Promise<DashboardOrderDetail> {
  const res = await fetch(`/api/backend/dashboard/orders/${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const msg =
      typeof body.error === "string" && body.error.trim().length > 0
        ? body.error.trim()
        : "No se pudo guardar el pedido.";
    throw new DashboardOrderActionError(msg, res.status);
  }

  const detail = parseDashboardOrderDetail(body, orderId);
  if (!detail) {
    throw new DashboardOrderActionError("Respuesta inválida del servidor.", 502);
  }
  return detail;
}

/** Browser / Route Handler: POST `/api/backend/dashboard/orders/{orderId}/reject`. */
export async function rejectDashboardOrderViaProxy(
  orderId: string,
  reason?: string,
): Promise<void> {
  const res = await fetch(`/api/backend/dashboard/orders/${encodeURIComponent(orderId)}/reject`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new DashboardOrderActionError(
      await parseOrderActionError(res, "No se pudo rechazar el pedido."),
      res.status,
    );
  }
}
