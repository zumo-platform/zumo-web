/** Types + browser fetch for GET /dashboard/inbox via the Next proxy. */

import type { DashboardCustomerRow } from "@/lib/dashboard-customers";
import type { DashboardOrderListRow } from "@/lib/dashboard-orders";

export type InboxColumnKey = "orders" | "not_orders" | "errors";

export type ClassifiedIntent =
  | "greeting"
  | "order_new"
  | "order_continue"
  | "order_modify"
  | "order_confirm"
  | "question"
  | "complaint"
  | "lo_de_siempre"
  | "onboarding"
  | "unknown";

export type InboxCard = Readonly<{
  cardId?: string;
  errorId?: string | null;
  errorDisplayCode?: string | null;
  errorStatus?: string | null;
  errorTitle?: string | null;
  errorMessage?: string | null;
  assignedSellerName?: string | null;
  conversationId: string;
  column: InboxColumnKey;
  customerId: number | null;
  customerName: string;
  contactName: string;
  customerPhone: string;
  isUnknownCustomer: boolean;
  latestIntent: ClassifiedIntent | null;
  summary: string | null;
  lastMessageAt: string | null;
  orderId: string | null;
  orderDisplayCode: string | null;
  orderStatus: string | null;
  orderSeenAt?: string | null;
  orderLineCount?: number | null;
  productNames: string[];
  productSkus: string[];
  hasAiFailure: boolean;
}>;

export type InboxBoard = Readonly<{
  columns: Record<InboxColumnKey, InboxCard[]>;
  counts: Record<InboxColumnKey, number>;
}>;

export type InboxErrorDetail = Readonly<{
  errorId: string;
  displayCode: string;
  status: string;
  title: string;
  messageText: string;
  kind: string;
  conversationId: string;
  messageId: string | null;
  customerId: number | null;
  customerName: string;
  contactName: string;
  customerPhone: string;
  isUnknownCustomer: boolean;
  assignedSellerId: number | null;
  assignedSellerName: string;
  productNames: string[];
  productSkus: string[];
  createdAt: string | null;
  resolvedAt: string | null;
}>;

export const INBOX_COLUMN_ORDER: readonly InboxColumnKey[] = [
  "orders",
  "not_orders",
  "errors",
];

export const INBOX_COLUMN_LABELS: Record<InboxColumnKey, string> = {
  orders: "Pedidos",
  not_orders: "No son pedidos",
  errors: "Errores",
};

const EMPTY_BOARD: InboxBoard = {
  columns: { orders: [], not_orders: [], errors: [] },
  counts: { orders: 0, not_orders: 0, errors: 0 },
};

/** Browser: GET /api/backend/dashboard/inbox. */
export async function fetchInboxBoardViaProxy(): Promise<InboxBoard> {
  try {
    const res = await fetch("/api/backend/dashboard/inbox", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return EMPTY_BOARD;
    const body = (await res.json()) as Partial<InboxBoard>;
    return {
      columns: {
        orders: body.columns?.orders ?? [],
        not_orders: body.columns?.not_orders ?? [],
        errors: body.columns?.errors ?? [],
      },
      counts: {
        orders: body.counts?.orders ?? 0,
        not_orders: body.counts?.not_orders ?? 0,
        errors: body.counts?.errors ?? 0,
      },
    };
  } catch {
    return EMPTY_BOARD;
  }
}

/** Browser: GET /api/backend/dashboard/inbox/search?q=. */
export async function searchInboxViaProxy(query: string): Promise<InboxCard[]> {
  const q = query.trim();
  if (q.length === 0) return [];
  try {
    const res = await fetch(
      `/api/backend/dashboard/inbox/search?q=${encodeURIComponent(q)}`,
      { credentials: "same-origin", cache: "no-store" },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { cards?: InboxCard[] };
    return body.cards ?? [];
  } catch {
    return [];
  }
}

export async function fetchInboxErrorViaProxy(errorId: string): Promise<InboxErrorDetail | null> {
  const res = await fetch(`/api/backend/dashboard/inbox/errors/${encodeURIComponent(errorId)}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => ({}))) as { error?: InboxErrorDetail };
  return body.error ?? null;
}

export async function resolveInboxErrorViaProxy(errorId: string): Promise<InboxErrorDetail | null> {
  const res = await fetch(
    `/api/backend/dashboard/inbox/errors/${encodeURIComponent(errorId)}/resolve`,
    {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    },
  );
  if (!res.ok) return null;
  const body = (await res.json().catch(() => ({}))) as { error?: InboxErrorDetail };
  return body.error ?? null;
}

export function draftOrderToInboxCard(
  order: DashboardOrderListRow,
  customer: DashboardCustomerRow | undefined,
): InboxCard {
  const customerName = customer?.name?.trim() || `Cliente #${order.customerId}`;
  return {
    cardId: `order:${order.orderId}`,
    conversationId: order.conversationId ?? `order:${order.orderId}`,
    column: "orders",
    customerId: order.customerId,
    customerName,
    contactName: "",
    customerPhone: customer?.contactPhone ?? "",
    isUnknownCustomer: false,
    latestIntent: "order_new",
    summary: null,
    lastMessageAt: order.createdAt,
    orderId: order.orderId,
    orderDisplayCode: order.displayCode,
    orderStatus: order.status,
    orderSeenAt: order.seenAt,
    orderLineCount: order.lineCount,
    productNames: order.productNames,
    productSkus: order.productSkus,
    hasAiFailure: false,
  };
}

export function inboxCardMatchesQuery(card: InboxCard, query: string): boolean {
  const q = query
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  if (!q) return true;
  const haystack = [
    card.customerName,
    card.contactName,
    card.customerPhone,
    card.orderDisplayCode ?? "",
    card.orderId ?? "",
    ...card.productNames,
    ...card.productSkus,
  ]
    .map((value) =>
      value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase(),
    )
    .join(" ");
  return haystack.includes(q);
}

/** Human label + Badge variant for a classified intent (UI only). */
export function intentLabel(intent: ClassifiedIntent | null): string {
  switch (intent) {
    case "order_new":
    case "order_continue":
    case "order_modify":
    case "order_confirm":
      return "Pedido";
    case "lo_de_siempre":
      return "Lo de siempre";
    case "complaint":
      return "Reclamo";
    case "question":
      return "Consulta";
    case "greeting":
      return "Saludo";
    case "onboarding":
      return "Alta";
    case "unknown":
    case null:
      return "Sin clasificar";
    default:
      return "Sin clasificar";
  }
}
