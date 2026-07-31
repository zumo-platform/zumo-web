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

export type InboxChannel = "whatsapp" | "email";

export type SenderTrust = "official" | "known_contact" | "unknown";

export type InboxCard = Readonly<{
  cardId?: string;
  errorId?: string | null;
  errorDisplayCode?: string | null;
  errorStatus?: string | null;
  errorTitle?: string | null;
  errorMessage?: string | null;
  assignedSellerName?: string | null;
  assignedSellerId?: number | null;
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
  orderSeenBySellerId?: number | null;
  orderLineCount?: number | null;
  productNames: string[];
  productSkus: string[];
  hasAiFailure: boolean;
  channel: InboxChannel;
  subject: string | null;
  senderEmail: string | null;
  senderTrust: SenderTrust | null;
}>;

export const SENDER_TRUST_LABELS: Record<SenderTrust, string> = {
  official: "Correo oficial de pedidos",
  known_contact: "Contacto conocido",
  unknown: "Remitente no reconocido",
};

export type EmailThreadMessage = Readonly<{
  role: "customer" | "assistant" | "seller" | "system";
  content: string;
  createdAt: string | null;
  externalId: string | null;
}>;

export type EmailConversationDetail = Readonly<{
  conversationId: string;
  channel: InboxChannel;
  subject: string | null;
  senderEmail: string | null;
  senderTrust: SenderTrust | null;
  customerName: string;
  contactName: string;
  messages: EmailThreadMessage[];
}>;

function parseSenderTrust(value: unknown): SenderTrust | null {
  if (value === "official" || value === "known_contact" || value === "unknown") return value;
  return null;
}

function looksLikeEmailAddress(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  return v.includes("@") && !v.startsWith("+");
}

function parseOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function normalizeInboxCard(raw: InboxCard): InboxCard {
  // Prefer explicit API channel; WhatsApp always wins when set.
  const channel: InboxChannel =
    raw.channel === "whatsapp"
      ? "whatsapp"
      : raw.channel === "email" || looksLikeEmailAddress(raw.senderEmail)
        ? "email"
        : "whatsapp";
  const senderEmail =
    raw.senderEmail ??
    (channel === "email" && looksLikeEmailAddress(raw.customerPhone)
      ? raw.customerPhone.trim()
      : null);
  return {
    ...raw,
    channel,
    subject: channel === "email" ? (raw.subject ?? null) : null,
    senderEmail: channel === "email" ? senderEmail : null,
    senderTrust: channel === "email" ? (parseSenderTrust(raw.senderTrust) ?? "unknown") : null,
    assignedSellerId: parseOptionalInt(raw.assignedSellerId),
    orderSeenBySellerId: parseOptionalInt(raw.orderSeenBySellerId),
  };
}

/** Draft order not yet opened by the current supplier user. */
export function inboxCardIsUnseenForSeller(
  card: InboxCard,
  sellerId: number,
): boolean {
  if (card.column !== "orders" || card.orderStatus !== "draft" || !card.orderId) {
    return false;
  }
  if (sellerId <= 0) return !card.orderSeenAt;
  if (!card.orderSeenAt) return true;
  return card.orderSeenBySellerId == null || card.orderSeenBySellerId !== sellerId;
}

/** Match card against multi-seller filter (empty = all). */
export function inboxCardMatchesSellerFilter(
  card: InboxCard,
  selectedSellerIds: ReadonlySet<number>,
): boolean {
  if (selectedSellerIds.size === 0) return true;
  if (card.assignedSellerId == null) return false;
  return selectedSellerIds.has(card.assignedSellerId);
}

export type InboxBoard = Readonly<{
  columns: Record<InboxColumnKey, InboxCard[]>;
  counts: Record<InboxColumnKey, number>;
}>;

export type ReclamoType =
  | "wrong_quantity"
  | "late_delivery"
  | "wrong_product"
  | "bad_condition"
  | "seller_error"
  | "seller_attitude"
  | "near_expiry"
  | "other";

export type ReclamoStatus = "open" | "in_progress" | "resolved" | "reopened";

export type InboxErrorInvolvedProduct = Readonly<{
  productId: number | null;
  name: string;
  sku: string;
}>;

export type InboxErrorOrderOption = Readonly<{
  orderId: string;
  displayCode: string | null;
  status: string;
  createdAt: string | null;
}>;

export type InboxErrorDetail = Readonly<{
  errorId: string;
  displayCode: string;
  status: string;
  title: string;
  messageText: string;
  kind: string;
  reclamoType: ReclamoType | null;
  resolutionNote: string;
  conversationId: string;
  messageId: string | null;
  customerId: number | null;
  customerName: string;
  contactName: string;
  customerPhone: string;
  isUnknownCustomer: boolean;
  assignedSellerId: number | null;
  assignedSellerName: string;
  orderId: string | null;
  orderDisplayCode: string | null;
  orderStatus: string | null;
  orderOptions: InboxErrorOrderOption[];
  involvedProducts: InboxErrorInvolvedProduct[];
  productNames: string[];
  productSkus: string[];
  createdAt: string | null;
  resolvedAt: string | null;
}>;

export const RECLAMO_TYPE_LABELS: Record<ReclamoType, string> = {
  wrong_quantity: "Cantidad incorrecta",
  late_delivery: "Entrega tardía",
  wrong_product: "Producto equivocado",
  bad_condition: "Mal estado del producto",
  seller_error: "Error del vendedor",
  seller_attitude: "Mal trato del vendedor",
  near_expiry: "Próximo a vencer",
  other: "Otro",
};

export const RECLAMO_TYPE_OPTIONS: ReadonlyArray<{ value: ReclamoType; label: string }> = (
  Object.keys(RECLAMO_TYPE_LABELS) as ReclamoType[]
).map((value) => ({ value, label: RECLAMO_TYPE_LABELS[value] }));

export const RECLAMO_STATUS_LABELS: Record<ReclamoStatus, string> = {
  open: "Abierto",
  in_progress: "En proceso",
  resolved: "Resuelto",
  reopened: "Reabierto",
};

export type InboxSellerOption = Readonly<{
  sellerId: number;
  name: string;
  role: string;
  active: boolean;
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
        orders: (body.columns?.orders ?? []).map(normalizeInboxCard),
        not_orders: (body.columns?.not_orders ?? []).map(normalizeInboxCard),
        errors: (body.columns?.errors ?? []).map(normalizeInboxCard),
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
    return (body.cards ?? []).map(normalizeInboxCard);
  } catch {
    return [];
  }
}

/** Browser: GET conversation messages + email meta for the inbox email sheet. */
export async function fetchEmailConversation(
  conversationId: string,
  fallback?: Pick<InboxCard, "customerName" | "contactName" | "subject" | "senderEmail" | "senderTrust">,
): Promise<EmailConversationDetail | null> {
  try {
    const res = await fetch(
      `/api/backend/dashboard/conversations/${encodeURIComponent(conversationId)}/messages`,
      { credentials: "same-origin", cache: "no-store" },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      conversation?: {
        conversationId?: string;
        channel?: string;
        subject?: string | null;
        senderEmail?: string | null;
        senderTrust?: string | null;
        customerName?: string | null;
        contactName?: string | null;
      };
      messages?: Array<{
        role?: string;
        content?: string;
        createdAt?: string | null;
        waMessageId?: string | null;
      }>;
    };
    const conv = body.conversation;
    const messages: EmailThreadMessage[] = (body.messages ?? []).map((m) => ({
      role:
        m.role === "assistant" || m.role === "seller" || m.role === "system"
          ? m.role
          : "customer",
      content: typeof m.content === "string" ? m.content : "",
      createdAt: typeof m.createdAt === "string" ? m.createdAt : null,
      externalId: typeof m.waMessageId === "string" ? m.waMessageId : null,
    }));
    return {
      conversationId: conv?.conversationId ?? conversationId,
      channel: conv?.channel === "email" ? "email" : "whatsapp",
      subject: conv?.subject ?? fallback?.subject ?? null,
      senderEmail: conv?.senderEmail ?? fallback?.senderEmail ?? null,
      senderTrust: parseSenderTrust(conv?.senderTrust) ?? fallback?.senderTrust ?? null,
      customerName:
        (typeof conv?.customerName === "string" && conv.customerName.trim()) ||
        fallback?.customerName ||
        "",
      contactName:
        (typeof conv?.contactName === "string" && conv.contactName.trim()) ||
        fallback?.contactName ||
        "",
      messages,
    };
  } catch {
    return null;
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

export type UpdateInboxErrorPayload = Partial<{
  reclamoType: ReclamoType | null;
  resolutionNote: string;
  orderId: string | null;
  involvedProducts: InboxErrorInvolvedProduct[];
  assignedSellerId: number | null;
  status: ReclamoStatus;
}>;

export async function updateInboxErrorViaProxy(
  errorId: string,
  payload: UpdateInboxErrorPayload,
): Promise<InboxErrorDetail | null> {
  const res = await fetch(`/api/backend/dashboard/inbox/errors/${encodeURIComponent(errorId)}`, {
    method: "PATCH",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => ({}))) as { error?: InboxErrorDetail };
  return body.error ?? null;
}

export async function fetchInboxErrorOrderLinesViaProxy(
  errorId: string,
): Promise<InboxErrorInvolvedProduct[]> {
  const res = await fetch(
    `/api/backend/dashboard/inbox/errors/${encodeURIComponent(errorId)}/order-lines`,
    { credentials: "same-origin", cache: "no-store" },
  );
  if (!res.ok) return [];
  const body = (await res.json().catch(() => ({}))) as { lines?: InboxErrorInvolvedProduct[] };
  return body.lines ?? [];
}

export async function fetchSellerOptionsViaProxy(): Promise<InboxSellerOption[]> {
  const res = await fetch("/api/backend/dashboard/sellers", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) return [];
  const body = (await res.json().catch(() => ({}))) as { sellers?: InboxSellerOption[] };
  return (body.sellers ?? []).filter((seller) => seller.active);
}

/** Keep email metadata when draft-order cards overlay inbox API cards. */
export function mergeDraftInboxCardWithApiCard(
  draft: InboxCard,
  api?: InboxCard | null,
): InboxCard {
  if (!api) return draft;
  const channel = draft.channel;
  return {
    ...draft,
    channel,
    subject: channel === "email" ? (api.subject ?? draft.subject) : null,
    senderEmail: channel === "email" ? (api.senderEmail ?? draft.senderEmail) : null,
    senderTrust: channel === "email" ? (api.senderTrust ?? draft.senderTrust) : null,
    conversationId: api.conversationId || draft.conversationId,
    assignedSellerId: api.assignedSellerId ?? draft.assignedSellerId,
  };
}

export function draftOrderToInboxCard(
  order: DashboardOrderListRow,
  customer: DashboardCustomerRow | undefined,
): InboxCard {
  const customerName = customer?.name?.trim() || `Cliente #${order.customerId}`;
  const channel: InboxChannel = order.sourceChannel === "email" ? "email" : "whatsapp";
  return {
    cardId: `order:${order.orderId}`,
    conversationId: order.conversationId ?? `order:${order.orderId}`,
    column: "orders",
    customerId: order.customerId,
    customerName,
    assignedSellerId: order.customerAssignedSellerId ?? null,
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
    orderSeenBySellerId: order.seenBySellerId,
    orderLineCount: order.lineCount,
    productNames: order.productNames,
    productSkus: order.productSkus,
    hasAiFailure: false,
    channel,
    subject: null,
    senderEmail: channel === "email" ? null : null,
    senderTrust: channel === "email" ? "unknown" : null,
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
    card.subject ?? "",
    card.senderEmail ?? "",
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
