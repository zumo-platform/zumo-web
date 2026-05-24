import type { Conversation, Message, Order } from "@/lib/dashboard-types";

export async function backendGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api/backend/${path}`, { cache: "no-store", credentials: "include" });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err?.error ?? `HTTP ${String(res.status)}`);
  }
  return res.json() as Promise<T>;
}

export async function backendPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/backend/${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    throw new Error(
      err?.message?.trim() || err?.error?.trim() || `HTTP ${String(res.status)}`,
    );
  }
  return res.json() as Promise<T>;
}

export function roleBubbleClass(role: Message["role"]): string {
  switch (role) {
    case "customer":
      return "self-start bg-muted text-foreground";
    case "assistant":
    case "seller":
      return "self-end bg-primary text-primary-foreground";
    case "system":
      return "hidden";
    default:
      return "self-center bg-muted/60 text-muted-foreground text-xs italic";
  }
}

function isInternalMessageContent(content: string | undefined): boolean {
  const text = content?.trim() ?? "";
  return text.startsWith("[ORDER_STATE]") || text.startsWith("[PIPELINE_");
}

export function isRenderableThreadMessage(message: Message): boolean {
  if (message.role === "system") return false;
  if (isInternalMessageContent(message.content)) return false;
  return true;
}

/** Message bubble footer time — HH:mm */
export function formatMessageTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
}

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${String(y)}-${String(m)}-${String(day)}`;
}

export function conversationListTimeLabel(lastMessageAt: string | null | undefined): string {
  const raw = lastMessageAt?.trim();
  const fallback = "";

  try {
    const d = raw ? new Date(raw) : null;
    if (!d || !Number.isFinite(d.getTime())) return fallback;

    const now = new Date();
    const todayKey = localDayKey(now);
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterdayKey = localDayKey(y);
    const msgKey = localDayKey(d);

    if (msgKey === todayKey) {
      return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (msgKey === yesterdayKey) return "Ayer";

    const sameYear = d.getFullYear() === now.getFullYear();
    const fmt = new Intl.DateTimeFormat("es", {
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
    });
    return fmt.format(d).replace(/\./g, "");
  } catch {
    return fallback;
  }
}

/** Divider label above first message of a calendar day — Hoy / Ayer / weekday + date */
export function messageDividerLabelForTimestamp(iso: string | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "";

    const now = new Date();
    const todayKey = localDayKey(now);
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterdayKey = localDayKey(y);
    const msgKey = localDayKey(d);

    if (msgKey === todayKey) return "Hoy";
    if (msgKey === yesterdayKey) return "Ayer";

    return new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "short" }).format(d);
  } catch {
    return "";
  }
}

export type ThreadItem =
  | { kind: "divider"; key: string; label: string }
  | { kind: "message"; message: Message };

export function buildMessageThreadItems(messages: readonly Message[]): ThreadItem[] {
  const sorted = [...messages]
    .filter((msg) => isRenderableThreadMessage(msg))
    .sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });

  const out: ThreadItem[] = [];
  let lastDayKey = "";

  for (const msg of sorted) {
    const created = msg.createdAt;
    const d = created ? new Date(created) : null;
    const dayKey = d && Number.isFinite(d.getTime()) ? localDayKey(d) : "";

    if (dayKey && dayKey !== lastDayKey) {
      lastDayKey = dayKey;
      const label = messageDividerLabelForTimestamp(created);
      if (label) out.push({ kind: "divider", key: `d-${dayKey}`, label });
    }

    out.push({ kind: "message", message: msg });
  }

  return out;
}

export function formatAiConfidencePct(order: Order): string | null {
  const v = order.aiConfidence;
  if (v === null || v === undefined || v === "") return null;
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string"
        ? Number(v)
        : NaN;
  if (!Number.isFinite(n)) return null;
  const pct = n <= 1 ? Math.round(n * 100) : Math.round(n);
  const clamped = Math.min(100, Math.max(0, pct));
  return `Confianza: ${String(clamped)}%`;
}

export function ordersForConversationDraftStates(
  orders: readonly Order[],
  conversationId: string,
): Order[] {
  return orders
    .filter(
      (o) =>
        (o.conversationId ?? "").trim() === conversationId.trim() &&
        (o.status === "draft" || o.status === "pending"),
    )
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });
}

export function formatOrderCreatedDateTime(iso?: string | null): string {
  if (!iso?.trim()) return "—";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    return d.toLocaleString("es", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

export function conversationPocName(conversation: Conversation): string {
  const name = conversation.customerName.trim();
  if (name) return name;
  const phone = conversation.customerPhone.trim();
  return phone || "Contacto";
}

/** Orders considered “confirmed” lifecycle for último pedido (not draft/pending). */
export const POST_CONFIRM_STATUSES = new Set(["in_progress", "in_route", "delivered", "cancelled"]);

export function computeCustomerOrderStats(customerId: number, orders: readonly Order[]) {
  const forCustomer = orders.filter((o) => o.customerId === customerId);
  const confirmed = forCustomer.filter((o) => POST_CONFIRM_STATUSES.has(o.status));
  confirmed.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
  const latest = confirmed[0];
  return {
    total: forCustomer.length,
    latestConfirmedCreatedAt: latest?.createdAt ?? null,
    hasHistoricalConfirmed: confirmed.length > 0,
  };
}

export function lastOrderSpanishRelativeDays(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return null;
    const ms = Date.now() - then;
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    if (days <= 0) return "hoy";
    if (days === 1) return "hace 1 día";
    return `hace ${String(days)} días`;
  } catch {
    return null;
  }
}

export function isUnknownConversationCustomer(c: Conversation): boolean {
  if (c.isUnknownCustomer !== undefined) return Boolean(c.isUnknownCustomer);
  return c.customerName.trim() === "";
}
