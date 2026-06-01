/** Types + server fetch for GET /dashboard/customers (tabla de clientes). */

import {
  parseBasketTrend,
  parseCustomerLabels,
  parseCustomerStatus,
  parseCustomerTasks,
  parseFrequencyBucket,
  parseNumberArray,
  type BasketTrend,
  type CustomerLabelRow,
  type CustomerStatus,
  type CustomerTaskRow,
  type FrequencyBucket,
} from "@/lib/customer-hub";

/** Prefer id_token; fall back to access_token on 401/403. */
function uniqBearerCandidates(idToken?: string | null, accessToken?: string | null): string[] {
  return [
    ...new Set([idToken, accessToken].filter((t): t is string => typeof t === "string" && t.length > 0)),
  ];
}

export type DashboardCustomerRow = Readonly<{
  customerId: number;
  name: string;
  clientCode: string | null;
  location: string;
  sellerAssigned: string | null;
  contactPhone: string;
  email: string | null;
  latestOrderAt: string | null;
  latestOrderDisplayCode: string | null;
  orderCount: number;
  status: CustomerStatus;
  frequency: FrequencyBucket;
  expectedOrderDate: string | null;
  daysOverdue: number;
  basketTrend: BasketTrend;
  basketChangePct: number | null;
  missingProductIds: readonly number[];
  labels: readonly CustomerLabelRow[];
  openTasks: readonly CustomerTaskRow[];
  openTaskCount: number;
}>;

function parseCustomerRow(raw: unknown): DashboardCustomerRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.customerId === "number" ? o.customerId : Number(o.customerId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const str = (k: string) => (typeof o[k] === "string" ? o[k].trim() : "");
  const maybeNull = (k: string) => {
    const s = str(k);
    return s.length ? s : null;
  };

  let orderCount = 0;
  if (typeof o.orderCount === "number" && Number.isFinite(o.orderCount)) {
    orderCount = Math.max(0, Math.trunc(o.orderCount));
  } else if (typeof o.orderCount === "string" && o.orderCount.trim()) {
    const n = Number(o.orderCount);
    if (Number.isFinite(n)) orderCount = Math.max(0, Math.trunc(n));
  }

  const latestOrderAt =
    o.latestOrderAt === null || o.latestOrderAt === undefined
      ? null
      : typeof o.latestOrderAt === "string" && o.latestOrderAt.trim().length > 0
        ? o.latestOrderAt.trim()
        : null;

  let daysOverdue = 0;
  if (typeof o.daysOverdue === "number" && Number.isFinite(o.daysOverdue)) {
    daysOverdue = Math.max(0, Math.trunc(o.daysOverdue));
  }

  let basketChangePct: number | null = null;
  if (o.basketChangePct === null || o.basketChangePct === undefined) {
    basketChangePct = null;
  } else if (typeof o.basketChangePct === "number" && Number.isFinite(o.basketChangePct)) {
    basketChangePct = o.basketChangePct;
  }

  let openTaskCount = 0;
  if (typeof o.openTaskCount === "number" && Number.isFinite(o.openTaskCount)) {
    openTaskCount = Math.max(0, Math.trunc(o.openTaskCount));
  }

  const expectedOrderDate =
    o.expectedOrderDate === null || o.expectedOrderDate === undefined
      ? null
      : typeof o.expectedOrderDate === "string" && o.expectedOrderDate.trim().length > 0
        ? o.expectedOrderDate.trim()
        : null;

  return {
    customerId: id,
    name: name || "\u2014",
    clientCode: maybeNull("clientCode"),
    location: str("location") || "\u2014",
    sellerAssigned: maybeNull("sellerAssigned"),
    contactPhone: str("contactPhone") || "\u2014",
    email: maybeNull("email"),
    latestOrderAt,
    latestOrderDisplayCode: maybeNull("latestOrderDisplayCode"),
    orderCount,
    status: parseCustomerStatus(o.status),
    frequency: parseFrequencyBucket(o.frequency),
    expectedOrderDate,
    daysOverdue,
    basketTrend: parseBasketTrend(o.basketTrend),
    basketChangePct,
    missingProductIds: parseNumberArray(o.missingProductIds),
    labels: parseCustomerLabels(o.labels),
    openTasks: parseCustomerTasks(o.openTasks),
    openTaskCount,
  };
}

function parseCustomersEnvelope(data: unknown): DashboardCustomerRow[] {
  const o = data as { customers?: unknown[] };
  if (!Array.isArray(o.customers)) return [];
  const rows: DashboardCustomerRow[] = [];
  for (const item of o.customers) {
    const row = parseCustomerRow(item);
    if (row) rows.push(row);
  }
  return rows;
}

export type DashboardCustomerDetail = Readonly<{
  customerId: number;
  name: string;
  legalName: string | null;
  governmentId: string | null;
  assignedSellerId: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  wazeAddress: string | null;
}>;

export type PatchDashboardCustomerInput = Readonly<{
  legalName?: string | null;
  governmentId?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  name?: string;
  email?: string | null;
  clientCode?: string;
  postalCode?: string | null;
  wazeAddress?: string | null;
  deliveryNotes?: string | null;
  notes?: string | null;
  paymentTerms?: string | null;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  cartProductIds?: readonly number[];
  newContacts?: ReadonlyArray<{
    name: string;
    email: string;
    phone: string;
  }>;
}>;

export type DashboardCustomerContact = Readonly<{
  contactId: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  isPrimary: boolean;
}>;

export type DashboardCustomerOrderLine = Readonly<{
  productId: number | null;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  lineSubtotal: number | null;
}>;

export type DashboardCustomerOrder = Readonly<{
  orderId: string;
  displayCode: string | null;
  status: string;
  createdAt: string | null;
  deliveryDate: string | null;
  total: number | null;
  currency: string | null;
  lines: DashboardCustomerOrderLine[];
}>;

export type DashboardCustomerFullDetail = Readonly<{
  customerId: number;
  name: string;
  legalName: string | null;
  governmentId: string | null;
  email: string | null;
  clientCode: string | null;
  assignedSellerId: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  wazeAddress: string | null;
  deliveryNotes: string | null;
  notes: string | null;
  paymentTerms: string | null;
  phone: string | null;
  createdAt: string | null;
  cartProductIds: number[];
  contacts: DashboardCustomerContact[];
  orders: DashboardCustomerOrder[];
  productIds: number[];
  /** ISO timestamp of the customer's earliest order containing each product. */
  productFirstOrderedAt: Readonly<Record<number, string>>;
}>;

export type CustomerDraftState = Readonly<{
  name: string;
  legalName: string;
  governmentId: string;
  email: string;
  clientCode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  wazeAddress: string;
  deliveryNotes: string;
  notes: string;
  paymentTerms: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  productIds: number[];
  pendingContacts: ReadonlyArray<{
    tempId: string;
    name: string;
    email: string;
    phone: string;
  }>;
}>;

function parseCustomerDetail(raw: unknown): DashboardCustomerDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.customerId === "number" ? o.customerId : Number(o.customerId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const strOrNull = (k: string): string | null => {
    const v = o[k];
    if (v === null || v === undefined) return null;
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length ? t : null;
  };

  let assignedSellerId: number | null = null;
  if (o.assignedSellerId !== null && o.assignedSellerId !== undefined && o.assignedSellerId !== "") {
    const sid =
      typeof o.assignedSellerId === "number" ? o.assignedSellerId : Number(o.assignedSellerId);
    if (Number.isFinite(sid) && sid > 0) assignedSellerId = sid;
  }

  const name = typeof o.name === "string" ? o.name.trim() : "";

  return {
    customerId: id,
    name: name || "—",
    legalName: strOrNull("legalName"),
    governmentId: strOrNull("governmentId"),
    assignedSellerId,
    addressLine1: strOrNull("addressLine1"),
    addressLine2: strOrNull("addressLine2"),
    city: strOrNull("city"),
    region: strOrNull("region"),
    postalCode: strOrNull("postalCode"),
    wazeAddress: strOrNull("wazeAddress"),
  };
}

function asNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseCustomerContact(raw: unknown): DashboardCustomerContact | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const contactId = typeof o.contactId === "string" ? o.contactId.trim() : "";
  if (!contactId) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const phone = typeof o.phone === "string" ? o.phone.trim() : "";
  const email =
    o.email === null || o.email === undefined
      ? null
      : typeof o.email === "string" && o.email.trim()
        ? o.email.trim()
        : null;
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : "";
  return {
    contactId,
    name: name || "—",
    phone,
    email,
    createdAt,
    isPrimary: o.isPrimary === true,
  };
}

function parseCustomerOrderLine(raw: unknown): DashboardCustomerOrderLine | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const productName =
    (typeof o.productName === "string" && o.productName.trim()) ||
    (typeof o.productNameRaw === "string" && o.productNameRaw.trim()) ||
    "—";
  const quantity = asNumOrNull(o.quantity);
  if (quantity === null || quantity <= 0) return null;
  const unit = typeof o.unit === "string" && o.unit.trim() ? o.unit.trim() : "—";
  let productId: number | null = null;
  if (typeof o.productId === "number" && o.productId > 0) productId = o.productId;
  else if (typeof o.productId === "string" && o.productId.trim()) {
    const n = Number(o.productId);
    if (Number.isFinite(n) && n > 0) productId = n;
  }
  return {
    productId,
    productName,
    quantity,
    unit,
    unitPrice: asNumOrNull(o.unitPrice),
    lineSubtotal: asNumOrNull(o.lineSubtotal),
  };
}

function parseCustomerOrder(raw: unknown): DashboardCustomerOrder | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const orderId = typeof o.orderId === "string" ? o.orderId.trim() : "";
  if (!orderId) return null;
  const linesRaw = Array.isArray(o.lines) ? o.lines : [];
  const lines: DashboardCustomerOrderLine[] = [];
  for (const item of linesRaw) {
    const line = parseCustomerOrderLine(item);
    if (line) lines.push(line);
  }
  return {
    orderId,
    displayCode:
      typeof o.displayCode === "string" && o.displayCode.trim()
        ? o.displayCode.trim()
        : typeof o.display_code === "string" && o.display_code.trim()
          ? o.display_code.trim()
          : null,
    status: typeof o.status === "string" ? o.status : "draft",
    createdAt: typeof o.createdAt === "string" ? o.createdAt : null,
    deliveryDate: typeof o.deliveryDate === "string" ? o.deliveryDate : null,
    total: asNumOrNull(o.total),
    currency: typeof o.currency === "string" ? o.currency : null,
    lines,
  };
}

function buildProductFirstOrderedAtFromOrders(
  orders: readonly DashboardCustomerOrder[],
): Record<number, string> {
  const map: Record<number, string> = {};
  const sorted = [...orders].sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : Number.POSITIVE_INFINITY;
    const tb = b.createdAt ? Date.parse(b.createdAt) : Number.POSITIVE_INFINITY;
    return ta - tb;
  });

  for (const order of sorted) {
    if (!order.createdAt) continue;
    for (const line of order.lines) {
      const productId = line.productId;
      if (productId === null || map[productId] !== undefined) continue;
      map[productId] = order.createdAt;
    }
  }

  return map;
}

function parseProductFirstOrderedAt(raw: unknown): Record<number, string> {
  const map: Record<number, string> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return map;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const productId = Number(key);
    if (!Number.isInteger(productId) || productId <= 0) continue;
    if (typeof value !== "string" || !value.trim()) continue;
    map[productId] = value.trim();
  }
  return map;
}

function parseCustomerFullDetail(
  customerRaw: unknown,
  contactsRaw: unknown,
  ordersRaw: unknown,
  productIdsRaw: unknown,
  productFirstOrderedAtRaw?: unknown,
): DashboardCustomerFullDetail | null {
  const base = parseCustomerDetail(customerRaw);
  if (!base) return null;
  const o = (customerRaw && typeof customerRaw === "object" ? customerRaw : {}) as Record<
    string,
    unknown
  >;

  const strOrNull = (k: string): string | null => {
    const v = o[k];
    if (v === null || v === undefined) return null;
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length ? t : null;
  };

  const contacts: DashboardCustomerContact[] = [];
  if (Array.isArray(contactsRaw)) {
    for (const item of contactsRaw) {
      const c = parseCustomerContact(item);
      if (c) contacts.push(c);
    }
  }

  const orders: DashboardCustomerOrder[] = [];
  if (Array.isArray(ordersRaw)) {
    for (const item of ordersRaw) {
      const order = parseCustomerOrder(item);
      if (order) orders.push(order);
    }
  }

  const productIds: number[] = [];
  if (Array.isArray(productIdsRaw)) {
    for (const item of productIdsRaw) {
      const n = typeof item === "number" ? item : Number(item);
      if (Number.isInteger(n) && n > 0) productIds.push(n);
    }
  }

  let cartProductIds: number[] = [];
  const cartRaw = o.cartProductIds ?? o.cart_product_ids;
  if (Array.isArray(cartRaw)) {
    for (const item of cartRaw) {
      const n = typeof item === "number" ? item : Number(item);
      if (Number.isInteger(n) && n > 0) cartProductIds.push(n);
    }
  }

  return {
    ...base,
    email: strOrNull("email"),
    clientCode: strOrNull("clientCode"),
    deliveryNotes: strOrNull("deliveryNotes"),
    notes: strOrNull("notes"),
    paymentTerms: strOrNull("paymentTerms"),
    phone: strOrNull("phone"),
    createdAt: typeof o.createdAt === "string" ? o.createdAt : null,
    cartProductIds,
    contacts,
    orders,
    productIds,
    productFirstOrderedAt: {
      ...buildProductFirstOrderedAtFromOrders(orders),
      ...parseProductFirstOrderedAt(productFirstOrderedAtRaw),
    },
  };
}

export function customerDetailToDraft(detail: DashboardCustomerFullDetail): CustomerDraftState {
  const primary =
    detail.contacts.find((c) => c.isPrimary) ?? detail.contacts[0] ?? null;
  return {
    name: detail.name === "—" ? "" : detail.name,
    legalName: detail.legalName ?? "",
    governmentId: detail.governmentId ?? "",
    email: detail.email ?? "",
    clientCode: detail.clientCode ?? "",
    addressLine1: detail.addressLine1 ?? "",
    addressLine2: detail.addressLine2 ?? "",
    city: detail.city ?? "",
    region: detail.region ?? "",
    postalCode: detail.postalCode ?? "",
    wazeAddress: detail.wazeAddress ?? "",
    deliveryNotes: detail.deliveryNotes ?? "",
    notes: detail.notes ?? "",
    paymentTerms: detail.paymentTerms ?? "",
    primaryContactName: primary?.name && primary.name !== "—" ? primary.name : "",
    primaryContactEmail: primary?.email ?? "",
    primaryContactPhone: primary?.phone ?? detail.phone ?? "",
    productIds: [...detail.productIds],
    pendingContacts: [],
  };
}

export function draftToSavePayload(draft: CustomerDraftState): PatchDashboardCustomerInput {
  return {
    name: draft.name.trim(),
    legalName: draft.legalName.trim() || null,
    governmentId: draft.governmentId.trim() || null,
    email: draft.email.trim() || null,
    clientCode: draft.clientCode.trim(),
    addressLine1: draft.addressLine1.trim() || null,
    addressLine2: draft.addressLine2.trim() || null,
    city: draft.city.trim() || null,
    region: draft.region.trim() || null,
    postalCode: draft.postalCode.trim() || null,
    wazeAddress: draft.wazeAddress.trim() || null,
    deliveryNotes: draft.deliveryNotes.trim() || null,
    notes: draft.notes.trim() || null,
    paymentTerms: draft.paymentTerms.trim() || null,
    primaryContactName: draft.primaryContactName.trim(),
    primaryContactEmail: draft.primaryContactEmail.trim(),
    primaryContactPhone: draft.primaryContactPhone.trim(),
    cartProductIds: draft.productIds,
    newContacts:
      draft.pendingContacts.length > 0
        ? draft.pendingContacts.map((c) => ({
            name: c.name.trim(),
            email: c.email.trim(),
            phone: c.phone.trim(),
          }))
        : undefined,
  };
}

export function formatCustomerAddress(customer: DashboardCustomerDetail | null): string {
  if (!customer) return "—";
  const parts = [
    customer.addressLine1,
    customer.addressLine2,
    customer.city,
    customer.region,
    customer.postalCode,
  ].filter((p): p is string => Boolean(p && p.trim()));
  if (parts.length > 0) return parts.join(", ");
  return customer.wazeAddress?.trim() || "—";
}

/** Browser / Route Handler: GET `/api/backend/dashboard/customers/{customerId}`. */
export async function fetchCustomerDetailViaProxy(
  customerId: number,
): Promise<DashboardCustomerDetail | null> {
  const res = await fetch(`/api/backend/dashboard/customers/${encodeURIComponent(String(customerId))}`, {
    credentials: "include",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return null;
  const raw =
    body.customer && typeof body.customer === "object" ? body.customer : body;
  return parseCustomerDetail(raw);
}

/** Browser / Route Handler: PATCH `/api/backend/dashboard/customers/{customerId}`. */
export async function patchDashboardCustomerViaProxy(
  customerId: number,
  patch: PatchDashboardCustomerInput,
): Promise<DashboardCustomerDetail | null> {
  const res = await fetch(`/api/backend/dashboard/customers/${encodeURIComponent(String(customerId))}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (typeof body.error === "string" && body.error.trim()
        ? body.error.trim()
        : null) ??
      (typeof body.message === "string" && body.message.trim()
        ? body.message.trim()
        : null) ??
      (res.status === 404
        ? "El endpoint de actualización de clientes no está disponible. Desplegá el backend más reciente."
        : "No se pudo actualizar el cliente.");
    throw new Error(msg);
  }
  const raw =
    body.customer && typeof body.customer === "object" ? body.customer : body;
  return parseCustomerDetail(raw);
}

/** Browser: GET full customer detail bundle. */
export async function fetchCustomerFullDetailViaProxy(
  customerId: number,
): Promise<DashboardCustomerFullDetail | null> {
  const res = await fetch(`/api/backend/dashboard/customers/${encodeURIComponent(String(customerId))}`, {
    credentials: "include",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return null;
  const customerRaw =
    body.customer && typeof body.customer === "object" ? body.customer : body;
  return parseCustomerFullDetail(
    customerRaw,
    body.contacts,
    body.orders,
    body.productIds,
    body.productFirstOrderedAt,
  );
}

/** Browser: save full customer draft (PATCH). */
export async function saveDashboardCustomerViaProxy(
  customerId: number,
  patch: PatchDashboardCustomerInput,
): Promise<DashboardCustomerFullDetail | null> {
  const res = await fetch(`/api/backend/dashboard/customers/${encodeURIComponent(String(customerId))}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (typeof body.error === "string" && body.error.trim() ? body.error.trim() : null) ??
      (typeof body.message === "string" && body.message.trim() ? body.message.trim() : null) ??
      "No se pudo guardar el cliente.";
    throw new Error(msg);
  }
  return fetchCustomerFullDetailViaProxy(customerId);
}

/** Client-side sellers list via Route Handler. */
export async function fetchSellersViaProxy(): Promise<
  ReadonlyArray<{ sellerId: number; name: string; active: boolean }>
> {
  const res = await fetch("/api/backend/dashboard/sellers", {
    credentials: "include",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return [];
  const raw = body.sellers;
  if (!Array.isArray(raw)) return [];
  const rows: Array<{ sellerId: number; name: string; active: boolean }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const sellerId = typeof o.sellerId === "number" ? o.sellerId : Number(o.sellerId);
    if (!Number.isFinite(sellerId) || sellerId <= 0) continue;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    rows.push({ sellerId, name: name || "—", active: o.active !== false });
  }
  return rows;
}

/** Client / Route Handler: GET `/api/backend/dashboard/customers`. */
export async function fetchCustomersViaProxy(): Promise<DashboardCustomerRow[] | null> {
  try {
    const res = await fetch("/api/backend/dashboard/customers", {
      credentials: "include",
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return parseDashboardCustomersEnvelope(body);
  } catch {
    return null;
  }
}

/** Client / Route Handler responses (JSON body shaped like `{ customers?: … }`). */
export function parseDashboardCustomersEnvelope(data: unknown): DashboardCustomerRow[] {
  return parseCustomersEnvelope(data);
}

function dashboardCustomersPayloadFromResponseText(text: string, httpOk: boolean): DashboardCustomerRow[] | null {
  if (!httpOk) return null;
  try {
    const data = text.trim() === "" ? {} : (JSON.parse(text) as unknown);
    return parseCustomersEnvelope(data);
  } catch {
    return null;
  }
}

/**
 * Returns `null` if the request failed. Empty array = supplier has no customers yet.
 * Tries Cognito **`id_token` first**, then **`access_token`** on 401/403.
 */
export async function fetchCustomersDashboard(
  apiUrl: string,
  idToken?: string | null,
  accessToken?: string | null,
): Promise<DashboardCustomerRow[] | null> {
  const trimmed = apiUrl.replace(/\/$/, "");
  if (!trimmed) return null;

  const bearerCandidates = uniqBearerCandidates(idToken, accessToken);
  if (bearerCandidates.length === 0) return null;

  const url = `${trimmed}/dashboard/customers`;

  try {
    for (let i = 0; i < bearerCandidates.length; i++) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${bearerCandidates[i]}` },
        cache: "no-store",
      });

      const text = await res.text();

      if (res.ok) {
        return dashboardCustomersPayloadFromResponseText(text, true);
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
