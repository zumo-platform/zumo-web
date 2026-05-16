/** Types + server fetch for GET /dashboard/orders (per status; merged for list views). */

import { joinApiGatewayPath } from "@/lib/api";

export const DASHBOARD_ORDER_STATUSES = [
  "draft",
  "pending",
  "in_progress",
  "in_route",
  "delivered",
  "cancelled",
] as const;

export type DashboardOrderStatus = (typeof DASHBOARD_ORDER_STATUSES)[number];

export type DashboardOrderListRow = Readonly<{
  orderId: string;
  customerId: number;
  status: string;
  createdAt: string | null;
  deliveryDate: string | null;
  confirmedAt: string | null;
  lineCount: number;
  conversationId: string | null;
}>;

function parseOrderListRow(raw: unknown): DashboardOrderListRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const orderId = typeof o.orderId === "string" ? o.orderId.trim() : "";
  if (!orderId) return null;

  const cid = typeof o.customerId === "number" ? o.customerId : Number(o.customerId);
  if (!Number.isFinite(cid) || cid <= 0) return null;

  const status = typeof o.status === "string" ? o.status.trim() : "draft";
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
  const lineCount = lines.length;

  const conversationId =
    o.conversationId === null || o.conversationId === undefined
      ? null
      : typeof o.conversationId === "string" && o.conversationId.trim().length > 0
        ? o.conversationId.trim()
        : null;

  return {
    orderId,
    customerId: cid,
    status: status || "draft",
    createdAt,
    deliveryDate,
    confirmedAt,
    lineCount,
    conversationId,
  };
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
  status: DashboardOrderStatus,
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

/**
 * Loads orders for every dashboard status and merges them (newest first).
 * Returns `null` only when every request fails for every bearer candidate.
 */
export async function fetchAllOrdersDashboard(
  apiUrl: string,
  idToken?: string | null,
  accessToken?: string | null,
): Promise<DashboardOrderListRow[] | null> {
  const base = apiUrl.replace(/\/+$/, "");
  if (!base) return null;

  const bearerCandidates = uniqBearerCandidates(idToken, accessToken);
  if (bearerCandidates.length === 0) return null;

  const upstreamBase = joinApiGatewayPath(base, "dashboard/orders");

  for (let i = 0; i < bearerCandidates.length; i++) {
    const bearer = bearerCandidates[i];
    const batchResults = await Promise.all(
      DASHBOARD_ORDER_STATUSES.map((s) => fetchOrdersByStatus(upstreamBase, bearer, s)),
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
      return mergeAndSortOrders(flat);
    }

    const retriable =
      batchResults.some((c) => c === null) && i < bearerCandidates.length - 1;
    if (!retriable) break;
  }

  return null;
}

/** Client / Route Handler envelope `{ orders?: … }` for a single status response. */
export function parseDashboardOrdersEnvelope(data: unknown): DashboardOrderListRow[] {
  return parseOrdersEnvelope(data);
}
