/** Types + proxy fetch for dashboard delivery notes (notas de entrega). */

import { normalizeOrderSearchText } from "@/lib/dashboard-orders";

export type DeliveryNoteStatus =
  | "borrador"
  | "confirmada"
  | "en_ruta"
  | "entregada"
  | "entregada_parcial"
  | "cancelada";

export const DELIVERY_NOTE_STATUS_LABELS: Record<DeliveryNoteStatus, string> = {
  borrador: "Borrador",
  confirmada: "Confirmada",
  en_ruta: "En ruta",
  entregada: "Entregada",
  entregada_parcial: "Entregada parcial",
  cancelada: "Cancelada",
};

export const DELIVERY_NOTE_NEXT: Record<DeliveryNoteStatus, DeliveryNoteStatus[]> = {
  borrador: ["confirmada", "cancelada"],
  confirmada: ["en_ruta", "cancelada"],
  en_ruta: ["entregada", "entregada_parcial", "cancelada"],
  entregada: [],
  entregada_parcial: [],
  cancelada: [],
};

export type DeliveryNoteListRow = Readonly<{
  deliveryNoteId: string;
  customerId: number;
  warehouseId: number;
  runId: string | null;
  status: DeliveryNoteStatus;
  postedInventory: boolean;
  displayCode: string | null;
  scheduledDate: string | null;
  deliveredAt: string | null;
  notes: string | null;
  createdAt: string | null;
  customerName: string | null;
  customerClientCode: string | null;
  customerWazeAddress?: string | null;
  itemCount: number;
  orderIds: readonly string[];
  orderDisplayCodes: readonly string[];
  productNames: readonly string[];
}>;

export type DeliveryNoteDetailLine = Readonly<{
  deliveryNoteItemId: string;
  orderId: string;
  orderItemId: string;
  productId: number | null;
  rawText: string;
  unit: string;
  qtyOrdered: number;
  qtyDelivered: number;
  unitPrice: number | null;
}>;

export type DeliveryNoteOrderLink = Readonly<{
  orderId: string;
  displayCode: string | null;
  deliveryDate: string | null;
}>;

export type DeliveryNoteDetail = Readonly<{
  note: DeliveryNoteListRow;
  lines: DeliveryNoteDetailLine[];
  orderIds: string[];
  orders: readonly DeliveryNoteOrderLink[];
}>;

export type CreateDeliveryNoteLineInput = Readonly<{
  orderId: string;
  orderItemId: string;
  qtyDelivered: number;
}>;

export type UpdateDeliveryNoteInput = Readonly<{
  warehouseId: number;
  orderIds: readonly string[];
  lines?: readonly CreateDeliveryNoteLineInput[];
  scheduledDate?: string | null;
  notes?: string | null;
}>;

export type CreateDeliveryNoteInput = UpdateDeliveryNoteInput;

export type DeliveryNoteStockPreviewLine = Readonly<{
  productId: number;
  rawText: string;
  unit: string;
  qtyDelivered: number;
  availableBefore: number | null;
  availableAfter: number | null;
  goesNegative: boolean;
}>;

export type DeliveryNoteStockPreview = Readonly<{
  deductionPoint: "order" | "delivery_note";
  lines: DeliveryNoteStockPreviewLine[];
}>;

export const DELIVERY_BOARD_COLUMNS: ReadonlyArray<{
  key: DeliveryNoteStatus;
  label: string;
}> = [
  { key: "borrador", label: "Borrador" },
  { key: "confirmada", label: "Confirmada" },
  { key: "en_ruta", label: "En ruta" },
  { key: "entregada", label: "Entregada" },
];

export const DELIVERY_BOARD_OFFBOARD: DeliveryNoteStatus[] = [
  "entregada_parcial",
  "cancelada",
];

export function allowedDropTargets(from: DeliveryNoteStatus): DeliveryNoteStatus[] {
  return (DELIVERY_NOTE_NEXT[from] ?? []).filter((s) =>
    DELIVERY_BOARD_COLUMNS.some((c) => c.key === s),
  );
}

function parseStatus(raw: unknown): DeliveryNoteStatus {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (
    s === "borrador" ||
    s === "confirmada" ||
    s === "en_ruta" ||
    s === "entregada" ||
    s === "entregada_parcial" ||
    s === "cancelada"
  ) {
    return s;
  }
  return "borrador";
}

function parseStringArray(raw: unknown): readonly string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function parseListRow(raw: unknown): DeliveryNoteListRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const deliveryNoteId =
    typeof o.deliveryNoteId === "string" ? o.deliveryNoteId.trim() : "";
  const customerId =
    typeof o.customerId === "number" && Number.isFinite(o.customerId)
      ? o.customerId
      : Number(o.customerId);
  const warehouseId =
    typeof o.warehouseId === "number" && Number.isFinite(o.warehouseId)
      ? o.warehouseId
      : Number(o.warehouseId);
  if (!deliveryNoteId || !Number.isFinite(customerId) || !Number.isFinite(warehouseId)) {
    return null;
  }
  const itemCountRaw = o.itemCount;
  const itemCount =
    typeof itemCountRaw === "number"
      ? itemCountRaw
      : typeof itemCountRaw === "string"
        ? Number(itemCountRaw)
        : 0;

  return {
    deliveryNoteId,
    customerId,
    warehouseId,
    runId: typeof o.runId === "string" ? o.runId : null,
    status: parseStatus(o.status),
    postedInventory: o.postedInventory === true,
    displayCode:
      typeof o.displayCode === "string" && o.displayCode.trim()
        ? o.displayCode.trim()
        : typeof o.display_code === "string" && o.display_code.trim()
          ? o.display_code.trim()
          : null,
    scheduledDate: typeof o.scheduledDate === "string" ? o.scheduledDate : null,
    deliveredAt: typeof o.deliveredAt === "string" ? o.deliveredAt : null,
    notes: typeof o.notes === "string" ? o.notes : null,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : null,
    customerName: typeof o.customerName === "string" ? o.customerName : null,
    customerClientCode:
      typeof o.customerClientCode === "string" && o.customerClientCode.trim()
        ? o.customerClientCode.trim()
        : typeof o.customer_client_code === "string" && o.customer_client_code.trim()
          ? o.customer_client_code.trim()
          : null,
    customerWazeAddress:
      typeof o.customerWazeAddress === "string" && o.customerWazeAddress.trim()
        ? o.customerWazeAddress.trim()
        : typeof o.customer_waze_address === "string" && o.customer_waze_address.trim()
          ? o.customer_waze_address.trim()
          : null,
    itemCount: Number.isFinite(itemCount) ? itemCount : 0,
    orderIds: parseStringArray(o.orderIds),
    orderDisplayCodes: parseStringArray(o.orderDisplayCodes),
    productNames: parseStringArray(o.productNames),
  };
}

function parseDetailLine(raw: unknown): DeliveryNoteDetailLine | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const deliveryNoteItemId =
    typeof o.deliveryNoteItemId === "string" ? o.deliveryNoteItemId.trim() : "";
  const orderId = typeof o.orderId === "string" ? o.orderId.trim() : "";
  const orderItemId = typeof o.orderItemId === "string" ? o.orderItemId.trim() : "";
  const rawText = typeof o.rawText === "string" ? o.rawText : "—";
  const unit = typeof o.unit === "string" ? o.unit : "—";
  if (!deliveryNoteItemId || !orderId || !orderItemId) return null;
  const qtyOrdered = Number(o.qtyOrdered);
  const qtyDelivered = Number(o.qtyDelivered);
  return {
    deliveryNoteItemId,
    orderId,
    orderItemId,
    productId:
      typeof o.productId === "number" && Number.isFinite(o.productId)
        ? o.productId
        : o.productId != null
          ? Number(o.productId)
          : null,
    rawText,
    unit,
    qtyOrdered: Number.isFinite(qtyOrdered) ? qtyOrdered : 0,
    qtyDelivered: Number.isFinite(qtyDelivered) ? qtyDelivered : 0,
    unitPrice:
      o.unitPrice != null && Number.isFinite(Number(o.unitPrice))
        ? Number(o.unitPrice)
        : null,
  };
}

export async function fetchDeliveryNotesViaProxy(): Promise<DeliveryNoteListRow[]> {
  const res = await fetch("/api/backend/dashboard/delivery-notes", {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return [];
  const notesRaw = Array.isArray(data.notes) ? data.notes : [];
  return notesRaw
    .map(parseListRow)
    .filter((n): n is DeliveryNoteListRow => n != null);
}

export async function fetchDeliveryNoteDetailViaProxy(
  id: string,
): Promise<DeliveryNoteDetail | null> {
  const res = await fetch(
    `/api/backend/dashboard/delivery-notes/${encodeURIComponent(id)}`,
    { cache: "no-store", credentials: "include" },
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return null;

  const noteRaw =
    data.note && typeof data.note === "object" ? data.note : data;
  const note = parseListRow(noteRaw);
  if (!note) return null;

  const linesRaw = Array.isArray(data.lines) ? data.lines : [];
  const lines = linesRaw
    .map(parseDetailLine)
    .filter((l): l is DeliveryNoteDetailLine => l != null);

  const orderIdsRaw = Array.isArray(data.orderIds) ? data.orderIds : [];
  const orderIds = orderIdsRaw.filter((x): x is string => typeof x === "string");

  const ordersRaw = Array.isArray(data.orders) ? data.orders : [];
  const orders = ordersRaw
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const o = raw as Record<string, unknown>;
      const orderId = typeof o.orderId === "string" ? o.orderId.trim() : "";
      if (!orderId) return null;
      const deliveryDateRaw =
        typeof o.deliveryDate === "string"
          ? o.deliveryDate.trim()
          : typeof o.delivery_date === "string"
            ? o.delivery_date.trim()
            : "";
      return {
        orderId,
        displayCode: typeof o.displayCode === "string" ? o.displayCode : null,
        deliveryDate: deliveryDateRaw.length > 0 ? deliveryDateRaw : null,
      };
    })
    .filter((x): x is DeliveryNoteOrderLink => x != null);

  return { note, lines, orderIds, orders };
}

export type OrderMeta = Readonly<{
  displayCode: string | null;
  deliveryDate: string | null;
}>;

/** Resolve order display codes and delivery dates for delivery note lines. */
export async function fetchOrderMetaMap(
  orderIds: readonly string[],
): Promise<Map<string, OrderMeta>> {
  const map = new Map<string, OrderMeta>();
  const unique = [...new Set(orderIds.filter((id) => id.trim().length > 0))];
  await Promise.all(
    unique.map(async (orderId) => {
      try {
        const res = await fetch(
          `/api/backend/dashboard/orders/${encodeURIComponent(orderId)}`,
          { credentials: "include", cache: "no-store" },
        );
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          map.set(orderId, { displayCode: null, deliveryDate: null });
          return;
        }
        const order =
          body.order && typeof body.order === "object"
            ? (body.order as Record<string, unknown>)
            : body;
        const code =
          typeof order.displayCode === "string" && order.displayCode.trim()
            ? order.displayCode.trim()
            : null;
        const deliveryDate =
          typeof order.deliveryDate === "string" && order.deliveryDate.trim()
            ? order.deliveryDate.trim()
            : null;
        map.set(orderId, { displayCode: code, deliveryDate });
      } catch {
        map.set(orderId, { displayCode: null, deliveryDate: null });
      }
    }),
  );
  return map;
}

/** @deprecated Prefer fetchOrderMetaMap */
export async function fetchOrderDisplayCodesMap(
  orderIds: readonly string[],
): Promise<Map<string, string | null>> {
  const meta = await fetchOrderMetaMap(orderIds);
  return new Map([...meta.entries()].map(([id, m]) => [id, m.displayCode]));
}

export async function createDeliveryNoteViaProxy(
  input: CreateDeliveryNoteInput,
): Promise<{ ok: true; deliveryNoteId: string } | { ok: false; error: string }> {
  const res = await fetch("/api/backend/dashboard/delivery-notes", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      warehouseId: input.warehouseId,
      orderIds: [...input.orderIds],
      lines: input.lines ? [...input.lines] : undefined,
      scheduledDate: input.scheduledDate ?? null,
      notes: input.notes ?? null,
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : "No se pudo crear la nota de entrega.";
    return { ok: false, error: msg };
  }
  const deliveryNoteId =
    typeof data.deliveryNoteId === "string" ? data.deliveryNoteId.trim() : "";
  if (!deliveryNoteId) {
    return { ok: false, error: "Respuesta inválida del servidor." };
  }
  return { ok: true, deliveryNoteId };
}

export async function updateDeliveryNoteViaProxy(
  id: string,
  input: UpdateDeliveryNoteInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(
    `/api/backend/dashboard/delivery-notes/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warehouseId: input.warehouseId,
        orderIds: [...input.orderIds],
        lines: input.lines ? [...input.lines] : undefined,
        scheduledDate: input.scheduledDate ?? null,
        notes: input.notes ?? null,
      }),
      cache: "no-store",
    },
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : "No se pudo guardar la nota de entrega.";
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function transitionDeliveryNoteViaProxy(
  id: string,
  toStatus: DeliveryNoteStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(
    `/api/backend/dashboard/delivery-notes/${encodeURIComponent(id)}/transition`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus }),
      cache: "no-store",
    },
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : "No se pudo cambiar el estado de la nota.";
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function fetchDeliveryNoteStockPreviewViaProxy(
  id: string,
): Promise<DeliveryNoteStockPreview | null> {
  const res = await fetch(
    `/api/backend/dashboard/delivery-notes/${encodeURIComponent(id)}/preview-stock`,
    { cache: "no-store", credentials: "include" },
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return null;
  const linesRaw = Array.isArray(data.lines) ? data.lines : [];
  const n = (v: unknown): number | null => {
    if (v == null) return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  };
  return {
    deductionPoint: data.deductionPoint === "delivery_note" ? "delivery_note" : "order",
    lines: linesRaw.map((l) => {
      const r = (l ?? {}) as Record<string, unknown>;
      return {
        productId: Number(r.productId) || -1,
        rawText: typeof r.rawText === "string" ? r.rawText : "—",
        unit: typeof r.unit === "string" ? r.unit : "—",
        qtyDelivered: Number(r.qtyDelivered) || 0,
        availableBefore: n(r.availableBefore),
        availableAfter: n(r.availableAfter),
        goesNegative: r.goesNegative === true,
      };
    }),
  };
}

export function deliveryNoteDisplayCode(
  note: Pick<DeliveryNoteListRow, "deliveryNoteId" | "displayCode">,
): string {
  const code = note.displayCode?.trim();
  if (code) return code;
  return "Sin código asignado";
}

/** Internal database id (dnt_…); shown when no human display code exists yet. */
export function deliveryNoteInternalId(
  note: Pick<DeliveryNoteListRow, "deliveryNoteId">,
): string {
  return note.deliveryNoteId;
}

export function deliveryNoteMatchesDateFilter(
  note: Pick<DeliveryNoteListRow, "scheduledDate">,
  dateFilter: string,
): boolean {
  if (!dateFilter.trim()) return true;
  return note.scheduledDate === dateFilter;
}

export function deliveryNoteMatchesSearch(
  note: DeliveryNoteListRow,
  query: string,
): boolean {
  const q = normalizeOrderSearchText(query);
  if (!q) return true;

  const noteCode = normalizeOrderSearchText(
    `${note.displayCode ?? ""} ${note.deliveryNoteId}`,
  );
  const customer = normalizeOrderSearchText(note.customerName ?? "");
  if (noteCode.includes(q) || customer.includes(q)) return true;

  for (const orderId of note.orderIds) {
    if (normalizeOrderSearchText(orderId).includes(q)) return true;
  }
  for (const orderCode of note.orderDisplayCodes) {
    if (normalizeOrderSearchText(orderCode).includes(q)) return true;
  }
  for (const product of note.productNames) {
    if (normalizeOrderSearchText(product).includes(q)) return true;
  }
  return false;
}
