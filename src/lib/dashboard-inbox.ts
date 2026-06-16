/** Types + browser fetch for GET /dashboard/inbox via the Next proxy. */

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
  productNames: string[];
  productSkus: string[];
  hasAiFailure: boolean;
}>;

export type InboxBoard = Readonly<{
  columns: Record<InboxColumnKey, InboxCard[]>;
  counts: Record<InboxColumnKey, number>;
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
