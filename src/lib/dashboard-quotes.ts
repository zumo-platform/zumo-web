// Client + server helpers for the Quotes feature. Browser calls go through
// the /api/backend proxy; server loads use fetchX(apiUrl, idToken, accessToken).

import { joinApiGatewayPath } from "@/lib/api";

export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted_to_order"
  | "cancelled";

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Vencida",
  converted_to_order: "Convertida en pedido",
  cancelled: "Cancelada",
};

export type QuoteItemRow = Readonly<{
  quoteItemId: string;
  lineNo: number;
  productId: number | null;
  rawText: string;
  productName: string | null;
  quantity: string;
  unit: string;
  unitPrice: string | null;
  discountPct: string;
  discountAmount: string;
  lineSubtotal: string;
  lineTotal: string;
  priceSource: string | null;
  notes: string | null;
}>;

export type QuoteRow = Readonly<{
  quoteId: string;
  quoteNumber: string | null;
  status: QuoteStatus;
  recipientType: "customer" | "lead";
  customerId: number | null;
  leadId: number | null;
  recipientName: string;
  quoteDate: string;
  validUntil: string | null;
  totalQuantity: string;
  subtotal: string;
  discountTotal: string;
  netTotal: string;
  currency: string;
  paymentTerms: string;
  termsAndConditions: string;
  notes: string;
  createdByAi: boolean;
  createdAt: string;
}>;

export type QuoteWithItems = QuoteRow & { items: QuoteItemRow[] };

export type QuoteLinePayload = Readonly<{
  productId: number | null;
  rawText: string;
  productName: string | null;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  discountPct: number;
  notes?: string | null;
}>;

export type CreateQuotePayload = Readonly<{
  recipientType: "customer" | "lead";
  customerId: number | null;
  leadId: number | null;
  quoteDate: string;
  validUntil: string | null;
  currency: string;
  paymentTerms: string;
  termsAndConditions: string;
  notes: string;
  lines: QuoteLinePayload[];
}>;

function num(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "0";
}
function optNumStr(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return typeof v === "number" ? String(v) : String(v);
}
function optStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function apiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;
  const detail = typeof o.message === "string" && o.message.trim().length > 0 ? o.message.trim() : null;
  const error = typeof o.error === "string" && o.error.trim().length > 0 ? o.error.trim() : null;
  if (detail && error && detail !== error) return `${error}: ${detail}`;
  return detail ?? error ?? fallback;
}

function parseItem(raw: unknown): QuoteItemRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.quoteItemId !== "string") return null;
  return {
    quoteItemId: o.quoteItemId,
    lineNo: typeof o.lineNo === "number" ? o.lineNo : Number(o.lineNo) || 1,
    productId:
      o.productId === null || o.productId === undefined ? null : Number(o.productId),
    rawText: typeof o.rawText === "string" ? o.rawText : "",
    productName: optStr(o.productName),
    quantity: num(o.quantity),
    unit: typeof o.unit === "string" ? o.unit : "unit",
    unitPrice: optNumStr(o.unitPrice),
    discountPct: num(o.discountPct),
    discountAmount: num(o.discountAmount),
    lineSubtotal: num(o.lineSubtotal),
    lineTotal: num(o.lineTotal),
    priceSource: optStr(o.priceSource),
    notes: optStr(o.notes),
  };
}

function parseQuote(raw: unknown): QuoteRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.quoteId !== "string") return null;
  return {
    quoteId: o.quoteId,
    quoteNumber: optStr(o.quoteNumber),
    status: (typeof o.status === "string" ? o.status : "draft") as QuoteStatus,
    recipientType: o.recipientType === "lead" ? "lead" : "customer",
    customerId:
      o.customerId === null || o.customerId === undefined ? null : Number(o.customerId),
    leadId: o.leadId === null || o.leadId === undefined ? null : Number(o.leadId),
    recipientName: typeof o.recipientName === "string" ? o.recipientName : "",
    quoteDate: typeof o.quoteDate === "string" ? o.quoteDate : "",
    validUntil: optStr(o.validUntil),
    totalQuantity: num(o.totalQuantity),
    subtotal: num(o.subtotal),
    discountTotal: num(o.discountTotal),
    netTotal: num(o.netTotal),
    currency: typeof o.currency === "string" ? o.currency : "CRC",
    paymentTerms: typeof o.paymentTerms === "string" ? o.paymentTerms : "",
    termsAndConditions:
      typeof o.termsAndConditions === "string" ? o.termsAndConditions : "",
    notes: typeof o.notes === "string" ? o.notes : "",
    createdByAi: o.createdByAi === true,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
  };
}

function parseQuoteWithItems(raw: unknown): QuoteWithItems | null {
  const base = parseQuote(raw);
  if (!base) return null;
  const o = raw as Record<string, unknown>;
  const items = Array.isArray(o.items)
    ? o.items.map(parseItem).filter((i): i is QuoteItemRow => i != null)
    : [];
  return { ...base, items };
}

export async function fetchQuotesViaProxy(status?: QuoteStatus): Promise<QuoteRow[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`/api/backend/dashboard/quotes${qs}`, {
    cache: "no-store",
    credentials: "include",
  });
  const body = (await res.json().catch(() => ({}))) as { quotes?: unknown[] };
  if (!res.ok || !Array.isArray(body.quotes)) return [];
  return body.quotes.map(parseQuote).filter((q): q is QuoteRow => q != null);
}

export async function fetchQuoteViaProxy(quoteId: string): Promise<QuoteWithItems | null> {
  const res = await fetch(`/api/backend/dashboard/quotes/${quoteId}`, {
    cache: "no-store",
    credentials: "include",
  });
  const body = (await res.json().catch(() => ({}))) as { quote?: unknown };
  if (!res.ok) return null;
  return parseQuoteWithItems(body.quote);
}

export async function createQuoteViaProxy(
  payload: CreateQuotePayload,
): Promise<QuoteWithItems> {
  const res = await fetch(`/api/backend/dashboard/quotes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(body, "No se pudo crear la cotización."));
  const parsed = parseQuoteWithItems((body as { quote?: unknown }).quote);
  if (!parsed) throw new Error("Respuesta inválida al crear la cotización.");
  return parsed;
}

export async function updateQuoteViaProxy(
  quoteId: string,
  payload: Partial<CreateQuotePayload>,
): Promise<QuoteWithItems> {
  const res = await fetch(`/api/backend/dashboard/quotes/${quoteId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(apiErrorMessage(body, "No se pudo guardar la cotización."));
  const parsed = parseQuoteWithItems((body as { quote?: unknown }).quote);
  if (!parsed) throw new Error("Respuesta inválida al guardar la cotización.");
  return parsed;
}

export async function transitionQuoteViaProxy(
  quoteId: string,
  status: QuoteStatus,
  notes?: string,
): Promise<QuoteWithItems> {
  const res = await fetch(`/api/backend/dashboard/quotes/${quoteId}/status`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, notes }),
  });
  const body = (await res.json().catch(() => ({}))) as { quote?: unknown; error?: string };
  if (!res.ok) throw new Error(body.error ?? "No se pudo actualizar el estado.");
  const parsed = parseQuoteWithItems(body.quote);
  if (!parsed) throw new Error("Respuesta inválida.");
  return parsed;
}

export async function deleteQuoteViaProxy(quoteId: string): Promise<void> {
  const res = await fetch(`/api/backend/dashboard/quotes/${quoteId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "No se pudo eliminar la cotización.");
  }
}

export type LeadRow = Readonly<{
  leadId: number;
  name: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
}>;

export async function fetchLeadsViaProxy(): Promise<LeadRow[]> {
  const res = await fetch(`/api/backend/dashboard/leads`, {
    cache: "no-store",
    credentials: "include",
  });
  const body = (await res.json().catch(() => ({}))) as { leads?: unknown[] };
  if (!res.ok || !Array.isArray(body.leads)) return [];
  return body.leads
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      if (typeof o.leadId !== "number" && !Number.isFinite(Number(o.leadId))) return null;
      return {
        leadId: Number(o.leadId),
        name: typeof o.name === "string" ? o.name : "",
        legalName: optStr(o.legalName),
        email: optStr(o.email),
        phone: optStr(o.phone),
        city: optStr(o.city),
      } satisfies LeadRow;
    })
    .filter((l): l is LeadRow => l != null);
}

export async function createLeadViaProxy(input: {
  name: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  source?: string | null;
}): Promise<number> {
  const res = await fetch(`/api/backend/dashboard/leads`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as { leadId?: number; error?: string; message?: string };
  if (!res.ok || typeof body.leadId !== "number") {
    throw new Error(apiErrorMessage(body, "No se pudo crear el prospecto."));
  }
  return body.leadId;
}

export function formatMoney(value: number | string, currency = "CRC"): string {
  const n = typeof value === "number" ? value : Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const symbol = currency === "USD" ? "$" : "\u20a1";
  return `${symbol}${safe.toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function fetchQuotesServer(
  apiUrl: string,
  idToken?: string | null,
  accessToken?: string | null,
): Promise<QuoteRow[]> {
  const base = apiUrl.replace(/\/+$/, "");
  if (!base) return [];
  const bearers = [idToken, accessToken].filter(
    (t): t is string => typeof t === "string" && t.length > 0,
  );
  const url = joinApiGatewayPath(base, "dashboard/quotes");
  for (const bearer of bearers) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${bearer}` },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const body = (await res.json()) as { quotes?: unknown[] };
      if (!Array.isArray(body.quotes)) return [];
      return body.quotes.map(parseQuote).filter((q): q is QuoteRow => q != null);
    } catch {
      /* next bearer */
    }
  }
  return [];
}
