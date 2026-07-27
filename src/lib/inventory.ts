/** Warehouses list and inventory mutation clients. */

import type { DashboardProductRow } from "@/lib/dashboard-products";

export type DashboardWarehouseRow = Readonly<{
  warehouseId: number;
  name: string;
  code: string | null;
  kind: string;
  purpose: string;
  isSellable: boolean;
  countsForReorder: boolean;
  isDefault: boolean;
  isActive: boolean;
  isCustomerRestricted: boolean;
  restrictionStrict: boolean;
  activeProductCount: number;
  allowedCustomers?: ReadonlyArray<{ customerId: number; name: string }>;
  allowedCustomerIds?: readonly number[];
}>;

export type WarehousePurpose =
  | "none"
  | "quarantine"
  | "damaged"
  | "in_transit"
  | "consignment"
  | "returns";

export type CreateWarehousePayload = Readonly<{
  name: string;
  code?: string | null;
  kind: "physical" | "virtual";
  purpose?: WarehousePurpose;
  isSellable?: boolean;
  countsForReorder?: boolean;
  isDefault?: boolean;
  address?: string | null;
  isCustomerRestricted?: boolean;
  restrictionStrict?: boolean;
  allowedCustomerIds?: readonly number[];
}>;

export type ProductStockByWarehouseRow = Readonly<{
  warehouseId: number;
  warehouseName: string;
  kind: string;
  isSellable: boolean;
  onHand: string;
  reserved: string;
  available: string | null;
}>;

export type ProductMovementRow = Readonly<{
  movementId: string;
  warehouseId: number;
  qty: string;
  reason: string;
  occurredAt: string;
  notes: string | null;
  refType: string | null;
  refId: string | null;
  displayCode: string | null;
  poId: string | null;
  unitCost: number | null;
}>;

export type ProductBatch = Readonly<{
  batchId: string;
  batchNumber: string;
  status: string;
  expiryDate: string | null;
  productionDate: string | null;
  vendorId: number | null;
  vendorName: string | null;
  poId: string | null;
  unitCost: number | null;
  onHand: number;
  reserved: number;
  available: number;
}>;

export type ProductQtySummary = Readonly<{
  onHand: number;
  reserved: number;
  available: number;
  incoming: number;
  total: number;
}>;

type ApiErrorBody = { error?: string; code?: string; message?: string };

function readApiErrorBody(body: ApiErrorBody, status: number): string {
  if (typeof body.message === "string" && body.message.trim().length > 0) {
    return body.message.trim();
  }
  if (typeof body.error === "string" && body.error.trim().length > 0) {
    return body.error.trim();
  }
  return `Error ${status}`;
}

async function readApiError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  return readApiErrorBody(body, res.status);
}

/** Distinguish navigation/unmount abort from client-side timeout abort. */
function rethrowFetchAbort(err: unknown, parentSignal?: AbortSignal): never {
  if (err instanceof DOMException && err.name === "AbortError" && parentSignal?.aborted) {
    throw err;
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    throw new Error("La carga tardó demasiado. Revisá tu conexión e intentá de nuevo.");
  }
  throw err;
}

function parseWarehouse(raw: unknown): DashboardWarehouseRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.warehouseId === "number" ? o.warehouseId : Number(o.warehouseId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) return null;
  const code =
    typeof o.code === "string" && o.code.trim().length > 0 ? o.code.trim() : null;
  const kind = typeof o.kind === "string" ? o.kind : "physical";
  const purpose = typeof o.purpose === "string" ? o.purpose : "none";
  const allowedCustomers = Array.isArray(o.allowedCustomers)
    ? o.allowedCustomers
        .map((raw) => {
          if (!raw || typeof raw !== "object") return null;
          const c = raw as Record<string, unknown>;
          const customerId =
            typeof c.customerId === "number" ? c.customerId : Number(c.customerId);
          const customerName = typeof c.name === "string" ? c.name.trim() : "";
          if (!Number.isFinite(customerId) || customerId <= 0 || !customerName) return null;
          return { customerId, name: customerName };
        })
        .filter((x): x is { customerId: number; name: string } => x != null)
    : undefined;
  return {
    warehouseId: id,
    name,
    code,
    kind,
    purpose,
    isSellable: o.isSellable !== false,
    countsForReorder: o.countsForReorder !== false,
    isDefault: o.isDefault === true,
    isActive: o.isActive !== false,
    isCustomerRestricted: o.isCustomerRestricted === true,
    restrictionStrict: o.restrictionStrict === true,
    activeProductCount:
      typeof o.activeProductCount === "number"
        ? o.activeProductCount
        : Number(o.activeProductCount ?? 0) || 0,
    allowedCustomers,
    allowedCustomerIds: allowedCustomers?.map((c) => c.customerId),
  };
}

export async function fetchWarehousesViaProxy(): Promise<DashboardWarehouseRow[]> {
  const res = await fetch("/api/backend/dashboard/warehouses", {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as {
    warehouses?: unknown[];
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(readApiErrorBody(data, res.status));
  }
  if (!Array.isArray(data.warehouses)) return [];
  const rows: DashboardWarehouseRow[] = [];
  for (const item of data.warehouses) {
    const row = parseWarehouse(item);
    if (row?.isActive) rows.push(row);
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return rows;
}

export async function createWarehouseViaProxy(
  payload: CreateWarehousePayload,
): Promise<{ ok: true; warehouseId: number } | { ok: false; error: string }> {
  const res = await fetch("/api/backend/dashboard/warehouses", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    warehouseId?: unknown;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(data, res.status) };
  }
  const warehouseId =
    typeof data.warehouseId === "number" ? data.warehouseId : Number(data.warehouseId);
  if (!Number.isFinite(warehouseId)) {
    return { ok: false, error: "Respuesta inválida del servidor." };
  }
  return { ok: true, warehouseId };
}

export async function updateWarehouseViaProxy(
  warehouseId: number,
  payload: Partial<CreateWarehousePayload>,
): Promise<{ ok: true; warehouse: DashboardWarehouseRow } | { ok: false; error: string }> {
  const res = await fetch(`/api/backend/dashboard/warehouses/${warehouseId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { warehouse?: unknown; error?: string; message?: string };
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(data, res.status) };
  }
  const warehouse = parseWarehouse(data.warehouse);
  if (!warehouse) {
    return { ok: false, error: "Respuesta inválida del servidor." };
  }
  return { ok: true, warehouse };
}

export async function deleteWarehouseViaProxy(
  warehouseId: number,
): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  const res = await fetch(`/api/backend/dashboard/warehouses/${warehouseId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : `Error ${res.status}`,
      code: typeof body.code === "string" ? body.code : undefined,
    };
  }
  return { ok: true };
}

export async function fetchWarehouseCustomersViaProxy(
  warehouseId: number,
): Promise<ReadonlyArray<{ customerId: number; name: string }>> {
  const res = await fetch(`/api/backend/dashboard/warehouses/${warehouseId}/customers`, {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as { customers?: unknown[]; error?: string };
  if (!res.ok) return [];
  if (!Array.isArray(data.customers)) return [];
  const rows: Array<{ customerId: number; name: string }> = [];
  for (const raw of data.customers) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const customerId = typeof o.customerId === "number" ? o.customerId : Number(o.customerId);
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (Number.isFinite(customerId) && customerId > 0 && name) {
      rows.push({ customerId, name });
    }
  }
  return rows;
}

export async function adjustStockViaProxy(args: {
  productId: number;
  warehouseId: number;
  delta: number;
  notes: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/backend/dashboard/inventory/adjust", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    return { ok: false, error: await readApiError(res) };
  }
  return { ok: true };
}

export async function transferStockViaProxy(args: {
  productId: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  qty: number;
}): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  const res = await fetch("/api/backend/dashboard/inventory/transfer", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : `Error ${res.status}`,
      code: typeof body.code === "string" ? body.code : undefined,
    };
  }
  return { ok: true };
}

function parseStockRow(raw: unknown): ProductStockByWarehouseRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const warehouseId =
    typeof o.warehouseId === "number" ? o.warehouseId : Number(o.warehouseId);
  if (!Number.isFinite(warehouseId)) return null;
  const warehouseName = typeof o.warehouseName === "string" ? o.warehouseName : "";
  return {
    warehouseId,
    warehouseName,
    kind: typeof o.kind === "string" ? o.kind : "physical",
    isSellable: o.isSellable !== false,
    onHand: typeof o.onHand === "string" ? o.onHand : String(o.onHand ?? "0"),
    reserved: typeof o.reserved === "string" ? o.reserved : String(o.reserved ?? "0"),
    available:
      o.available === null || o.available === undefined
        ? null
        : typeof o.available === "string"
          ? o.available
          : String(o.available),
  };
}

function parseMovementRow(raw: unknown): ProductMovementRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const movementId = typeof o.movementId === "string" ? o.movementId : "";
  if (!movementId) return null;
  return {
    movementId,
    warehouseId:
      typeof o.warehouseId === "number" ? o.warehouseId : Number(o.warehouseId),
    qty: typeof o.qty === "string" ? o.qty : String(o.qty ?? "0"),
    reason: typeof o.reason === "string" ? o.reason : "",
    occurredAt: typeof o.occurredAt === "string" ? o.occurredAt : "",
    notes: typeof o.notes === "string" ? o.notes : null,
    refType: typeof o.refType === "string" ? o.refType : null,
    refId: typeof o.refId === "string" ? o.refId : null,
    displayCode: typeof o.displayCode === "string" && o.displayCode.trim() ? o.displayCode.trim() : null,
    poId: typeof o.poId === "string" && o.poId.trim() ? o.poId.trim() : null,
    unitCost:
      o.unitCost === null || o.unitCost === undefined
        ? null
        : typeof o.unitCost === "number"
          ? o.unitCost
          : Number(o.unitCost),
  };
}

export function parseProductBatch(raw: unknown): ProductBatch | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const batchId = typeof o.batchId === "string" ? o.batchId : "";
  if (!batchId) return null;
  const onHand = typeof o.onHand === "number" ? o.onHand : Number(o.onHand);
  const reserved = typeof o.reserved === "number" ? o.reserved : Number(o.reserved);
  const available =
    typeof o.available === "number" ? o.available : Number(o.available ?? onHand - reserved);
  return {
    batchId,
    batchNumber: typeof o.batchNumber === "string" ? o.batchNumber : "",
    status: typeof o.status === "string" ? o.status : "active",
    expiryDate: typeof o.expiryDate === "string" ? o.expiryDate : null,
    productionDate: typeof o.productionDate === "string" ? o.productionDate : null,
    vendorId:
      o.vendorId === null || o.vendorId === undefined
        ? null
        : typeof o.vendorId === "number"
          ? o.vendorId
          : Number(o.vendorId),
    vendorName: typeof o.vendorName === "string" ? o.vendorName : null,
    poId: typeof o.poId === "string" ? o.poId : null,
    unitCost:
      o.unitCost === null || o.unitCost === undefined
        ? null
        : typeof o.unitCost === "number"
          ? o.unitCost
          : Number(o.unitCost),
    onHand: Number.isFinite(onHand) ? onHand : 0,
    reserved: Number.isFinite(reserved) ? reserved : 0,
    available: Number.isFinite(available) ? available : 0,
  };
}

function parseQtySummary(raw: unknown): ProductQtySummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const onHand = typeof o.onHand === "number" ? o.onHand : Number(o.onHand);
  const reserved = typeof o.reserved === "number" ? o.reserved : Number(o.reserved);
  const available = typeof o.available === "number" ? o.available : Number(o.available);
  const incoming = typeof o.incoming === "number" ? o.incoming : Number(o.incoming);
  const total = typeof o.total === "number" ? o.total : Number(o.total);
  if (!Number.isFinite(onHand)) return null;
  return {
    onHand,
    reserved: Number.isFinite(reserved) ? reserved : 0,
    available: Number.isFinite(available) ? available : onHand - reserved,
    incoming: Number.isFinite(incoming) ? incoming : 0,
    total: Number.isFinite(total) ? total : onHand + incoming,
  };
}

export async function getProductStockViaProxy(productId: number): Promise<{
  byWarehouse: ProductStockByWarehouseRow[];
  movements: ProductMovementRow[];
  batches: ProductBatch[];
  qtySummary: ProductQtySummary | null;
}> {
  const res = await fetch(`/api/backend/dashboard/inventory/product/${productId}`, {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as {
    byWarehouse?: unknown[];
    movements?: unknown[];
    batches?: unknown[];
    qtySummary?: unknown;
  };
  if (!res.ok) {
    return { byWarehouse: [], movements: [], batches: [], qtySummary: null };
  }

  const byWarehouse: ProductStockByWarehouseRow[] = [];
  if (Array.isArray(data.byWarehouse)) {
    for (const item of data.byWarehouse) {
      const row = parseStockRow(item);
      if (row) byWarehouse.push(row);
    }
  }

  const movements: ProductMovementRow[] = [];
  if (Array.isArray(data.movements)) {
    for (const item of data.movements) {
      const row = parseMovementRow(item);
      if (row) movements.push(row);
    }
  }

  const batches: ProductBatch[] = [];
  if (Array.isArray(data.batches)) {
    for (const item of data.batches) {
      const row = parseProductBatch(item);
      if (row) batches.push(row);
    }
  }

  const qtySummary = parseQtySummary(data.qtySummary);

  return { byWarehouse, movements, batches, qtySummary };
}

export const WAREHOUSE_KIND_LABEL: Record<string, string> = {
  physical: "Física",
  virtual: "Virtual",
};

export const WAREHOUSE_PURPOSE_LABEL: Record<string, string> = {
  none: "—",
  quarantine: "Cuarentena",
  damaged: "Dañado",
  in_transit: "En tránsito",
  consignment: "Consignación",
  returns: "Devoluciones",
};

export const WAREHOUSE_PURPOSE_OPTIONS: ReadonlyArray<{ value: WarehousePurpose; label: string }> =
  [
    { value: "quarantine", label: "Cuarentena" },
    { value: "damaged", label: "Dañado" },
    { value: "in_transit", label: "En tránsito" },
    { value: "consignment", label: "Consignación" },
    { value: "returns", label: "Devoluciones" },
  ];

export type InventoryProductOption = Pick<DashboardProductRow, "productId" | "name" | "sku">;

export type ShortfallPolicy = "block" | "partial_drop" | "partial_owe";

export type BackorderWorklistRow = Readonly<{
  reservationId: string;
  productId: number;
  productName: string;
  customerId: number;
  customerName: string;
  orderId: string;
  orderDisplayCode: string | null;
  qtyBackordered: number;
  qtyReserved: number;
  daysWaiting: number;
  availableNow: number;
  warehouseId: number;
}>;

export const SHORTFALL_POLICY_OPTIONS: ReadonlyArray<{
  value: ShortfallPolicy;
  label: string;
}> = [
  { value: "block", label: "Bloquear confirmación si falta stock" },
  { value: "partial_drop", label: "Enviar parcial y descartar el resto" },
  { value: "partial_owe", label: "Enviar parcial y dejar pendiente" },
];

function parseBackorderRow(raw: unknown): BackorderWorklistRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const reservationId = typeof o.reservationId === "string" ? o.reservationId.trim() : "";
  if (!reservationId) return null;
  const productId = typeof o.productId === "number" ? o.productId : Number(o.productId);
  if (!Number.isFinite(productId)) return null;
  return {
    reservationId,
    productId,
    productName: typeof o.productName === "string" ? o.productName : "—",
    customerId: typeof o.customerId === "number" ? o.customerId : Number(o.customerId),
    customerName: typeof o.customerName === "string" ? o.customerName : "—",
    orderId: typeof o.orderId === "string" ? o.orderId : "",
    orderDisplayCode:
      typeof o.orderDisplayCode === "string" && o.orderDisplayCode.trim().length > 0
        ? o.orderDisplayCode.trim()
        : null,
    qtyBackordered: Number(o.qtyBackordered ?? 0),
    qtyReserved: Number(o.qtyReserved ?? 0),
    daysWaiting: Number(o.daysWaiting ?? 0),
    availableNow: Number(o.availableNow ?? 0),
    warehouseId: Number(o.warehouseId ?? 0),
  };
}

export async function fetchBackordersViaProxy(): Promise<BackorderWorklistRow[]> {
  const res = await fetch("/api/backend/dashboard/inventory/backorders", {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as { backorders?: unknown[]; error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
  }
  if (!Array.isArray(data.backorders)) return [];
  const rows: BackorderWorklistRow[] = [];
  for (const item of data.backorders) {
    const row = parseBackorderRow(item);
    if (row) rows.push(row);
  }
  return rows;
}

export type AgingBatchRow = Readonly<{
  productId: number;
  productName: string;
  sku: string | null;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  daysUntilExpiry: number;
  onHand: number;
  reserved: number;
  available: number;
  unitCost: number | null;
  valueAtRisk: number | null;
  vendorId: number | null;
  vendorName: string | null;
}>;

function parseAgingRow(raw: unknown): AgingBatchRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.batchId !== "string" || typeof r.productId !== "number") return null;
  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const numOrNull = (v: unknown): number | null =>
    v == null ? null : typeof v === "number" && Number.isFinite(v) ? v : null;
  return {
    productId: r.productId,
    productName: typeof r.productName === "string" ? r.productName : "—",
    sku: typeof r.sku === "string" ? r.sku : null,
    batchId: r.batchId,
    batchNumber: typeof r.batchNumber === "string" ? r.batchNumber : "—",
    expiryDate: typeof r.expiryDate === "string" ? r.expiryDate : "",
    daysUntilExpiry: num(r.daysUntilExpiry),
    onHand: num(r.onHand),
    reserved: num(r.reserved),
    available: num(r.available),
    unitCost: numOrNull(r.unitCost),
    valueAtRisk: numOrNull(r.valueAtRisk),
    vendorId: typeof r.vendorId === "number" ? r.vendorId : null,
    vendorName: typeof r.vendorName === "string" ? r.vendorName : null,
  };
}

export async function fetchAgingReportViaProxy(
  days = 14,
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<AgingBatchRow[]> {
  const timeoutMs = opts?.timeoutMs ?? 15_000;
  const ctrl = new AbortController();
  if (opts?.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(
      `/api/backend/dashboard/inventory/batches/aging?days=${encodeURIComponent(String(days))}`,
      { cache: "no-store", credentials: "include", signal: ctrl.signal },
    );
    const data = (await res.json().catch(() => ({}))) as { batches?: unknown[]; error?: string };
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
    }
    if (!Array.isArray(data.batches)) return [];
    const rows: AgingBatchRow[] = [];
    for (const item of data.batches) {
      const row = parseAgingRow(item);
      if (row) rows.push(row);
    }
    return rows;
  } catch (err) {
    rethrowFetchAbort(err, opts?.signal);
  } finally {
    clearTimeout(timer);
  }
}

export type ReorderSuggestionRow = Readonly<{
  productId: number;
  productName: string;
  sku: string | null;
  minimum: number;
  available: number;
  incoming: number;
  deficit: number;
  suggestedQty: number;
  vendorId: number | null;
  vendorName: string | null;
  unitCost: number | null;
  leadTimeDays: number | null;
  projectedCost: number | null;
}>;

function parseReorderRow(raw: unknown): ReorderSuggestionRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.productId !== "number") return null;
  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const numOrNull = (v: unknown): number | null =>
    v == null ? null : typeof v === "number" && Number.isFinite(v) ? v : null;
  return {
    productId: r.productId,
    productName: typeof r.productName === "string" ? r.productName : "—",
    sku: typeof r.sku === "string" ? r.sku : null,
    minimum: num(r.minimum),
    available: num(r.available),
    incoming: num(r.incoming),
    deficit: num(r.deficit),
    suggestedQty: num(r.suggestedQty),
    vendorId: typeof r.vendorId === "number" ? r.vendorId : null,
    vendorName: typeof r.vendorName === "string" ? r.vendorName : null,
    unitCost: numOrNull(r.unitCost),
    leadTimeDays: numOrNull(r.leadTimeDays),
    projectedCost: numOrNull(r.projectedCost),
  };
}

export async function fetchReorderSuggestionsViaProxy(opts?: {
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<ReorderSuggestionRow[]> {
  const timeoutMs = opts?.timeoutMs ?? 30_000;
  const ctrl = new AbortController();
  if (opts?.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("/api/backend/dashboard/inventory/reorder-suggestions", {
      cache: "no-store",
      credentials: "include",
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => ({}))) as {
      suggestions?: unknown[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
    }
    if (!Array.isArray(data.suggestions)) return [];
    const rows: ReorderSuggestionRow[] = [];
    for (const item of data.suggestions) {
      const row = parseReorderRow(item);
      if (row) rows.push(row);
    }
    return rows;
  } catch (err) {
    rethrowFetchAbort(err, opts?.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function fulfilBackorderViaProxy(args: {
  reservationId: string;
  qty: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/backend/dashboard/inventory/backorders/fulfil", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(body, res.status) };
  }
  return { ok: true };
}

export async function fetchShortfallPolicyViaProxy(): Promise<ShortfallPolicy> {
  const res = await fetch("/api/backend/dashboard/settings/shortfall-policy", {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as { policy?: string; error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
  }
  const policy = data.policy;
  if (policy === "block" || policy === "partial_drop" || policy === "partial_owe") {
    return policy;
  }
  return "partial_owe";
}

export async function updateShortfallPolicyViaProxy(
  policy: ShortfallPolicy,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/backend/dashboard/settings/shortfall-policy", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ policy }),
  });
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(body, res.status) };
  }
  return { ok: true };
}

// ── Inventory deduction point (pedido vs nota de entrega) ────────────────────

export type InventoryDeductionPoint = "order" | "delivery_note";

export const DEDUCTION_POINT_OPTIONS: ReadonlyArray<{
  value: InventoryDeductionPoint;
  label: string;
}> = [
  { value: "order", label: "Con el pedido (al marcar entregado)" },
  { value: "delivery_note", label: "Con la nota de entrega (al despachar)" },
];

export type MidFlightBlockingOrder = Readonly<{
  orderId: string;
  displayCode: string | null;
  effectiveStatusKey: string;
  customerName: string;
}>;

export type MidFlightBlockingNote = Readonly<{
  deliveryNoteId: string;
  displayCode: string | null;
  status: string;
}>;

export type DeductionPointBlocking = Readonly<{
  orders: number;
  notes: number;
  blockingOrders: MidFlightBlockingOrder[];
  blockingNotes: MidFlightBlockingNote[];
}>;

export type DeductionPointState = Readonly<{
  point: InventoryDeductionPoint;
  canSwitch: boolean;
  blocking: DeductionPointBlocking;
}>;

export async function fetchDeductionPointViaProxy(): Promise<DeductionPointState> {
  const res = await fetch("/api/backend/dashboard/settings/inventory-deduction-point", {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as {
    point?: string;
    canSwitch?: boolean;
    blocking?: {
      orders?: number;
      notes?: number;
      blockingOrders?: unknown;
      blockingNotes?: unknown;
    };
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(readApiErrorBody(data, res.status));
  }
  const point: InventoryDeductionPoint =
    data.point === "delivery_note" ? "delivery_note" : "order";
  return {
    point,
    canSwitch: data.canSwitch !== false,
    blocking: parseDeductionPointBlocking(data.blocking),
  };
}

function parseBlockingOrder(raw: unknown): MidFlightBlockingOrder | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const orderId = typeof row.orderId === "string" ? row.orderId.trim() : "";
  if (!orderId) return null;
  return {
    orderId,
    displayCode: typeof row.displayCode === "string" ? row.displayCode : null,
    effectiveStatusKey:
      typeof row.effectiveStatusKey === "string" ? row.effectiveStatusKey : "confirmed",
    customerName:
      typeof row.customerName === "string" && row.customerName.trim().length > 0
        ? row.customerName.trim()
        : "Sin nombre",
  };
}

function parseBlockingNote(raw: unknown): MidFlightBlockingNote | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const deliveryNoteId =
    typeof row.deliveryNoteId === "string" ? row.deliveryNoteId.trim() : "";
  if (!deliveryNoteId) return null;
  return {
    deliveryNoteId,
    displayCode: typeof row.displayCode === "string" ? row.displayCode : null,
    status: typeof row.status === "string" ? row.status : "borrador",
  };
}

function parseDeductionPointBlocking(raw: unknown): DeductionPointBlocking {
  const blocking =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const blockingOrders = Array.isArray(blocking.blockingOrders)
    ? blocking.blockingOrders
        .map(parseBlockingOrder)
        .filter((row): row is MidFlightBlockingOrder => row != null)
    : [];
  const blockingNotes = Array.isArray(blocking.blockingNotes)
    ? blocking.blockingNotes
        .map(parseBlockingNote)
        .filter((row): row is MidFlightBlockingNote => row != null)
    : [];
  return {
    orders: Number(blocking.orders ?? blockingOrders.length),
    notes: Number(blocking.notes ?? blockingNotes.length),
    blockingOrders,
    blockingNotes,
  };
}

export async function updateDeductionPointViaProxy(
  point: InventoryDeductionPoint,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/backend/dashboard/settings/inventory-deduction-point", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ point }),
  });
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(body, res.status) };
  }
  return { ok: true };
}

// ── Vendors (Proveedores) ───────────────────────────────────────────────────

export type DashboardVendorRow = Readonly<{
  vendorId: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  defaultCurrency: string | null;
  leadTimeDays: number | null;
  notes: string | null;
  isActive: boolean;
}>;

export type CreateVendorPayload = Readonly<{
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  defaultCurrency?: string | null;
  leadTimeDays?: number | null;
  notes?: string | null;
  isActive?: boolean;
}>;

function parseVendor(raw: unknown): DashboardVendorRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.vendorId === "number" ? o.vendorId : Number(o.vendorId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) return null;
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  const lead =
    o.leadTimeDays === null || o.leadTimeDays === undefined
      ? null
      : Number.isFinite(Number(o.leadTimeDays))
        ? Number(o.leadTimeDays)
        : null;
  return {
    vendorId: id,
    name,
    contactName: str(o.contactName),
    email: str(o.email),
    phone: str(o.phone),
    defaultCurrency: str(o.defaultCurrency),
    leadTimeDays: lead,
    notes: str(o.notes),
    isActive: o.isActive !== false,
  };
}

export async function fetchVendorsViaProxy(): Promise<DashboardVendorRow[]> {
  const res = await fetch("/api/backend/dashboard/vendors", {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as {
    vendors?: unknown[];
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(readApiErrorBody(data, res.status));
  }
  if (!Array.isArray(data.vendors)) return [];
  const rows: DashboardVendorRow[] = [];
  for (const item of data.vendors) {
    const row = parseVendor(item);
    if (row) rows.push(row);
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return rows;
}

export async function createVendorViaProxy(
  payload: CreateVendorPayload,
): Promise<{ ok: true; vendorId: number } | { ok: false; error: string }> {
  const res = await fetch("/api/backend/dashboard/vendors", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    vendorId?: unknown;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(data, res.status) };
  }
  const vendorId = typeof data.vendorId === "number" ? data.vendorId : Number(data.vendorId);
  if (!Number.isFinite(vendorId)) {
    return { ok: false, error: "Respuesta inválida del servidor." };
  }
  return { ok: true, vendorId };
}

export async function updateVendorViaProxy(
  vendorId: number,
  payload: Partial<CreateVendorPayload>,
): Promise<{ ok: true; vendor: DashboardVendorRow } | { ok: false; error: string }> {
  const res = await fetch(`/api/backend/dashboard/vendors/${vendorId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    vendor?: unknown;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(data, res.status) };
  }
  const vendor = parseVendor(data.vendor);
  if (!vendor) {
    return { ok: false, error: "Respuesta inválida del servidor." };
  }
  return { ok: true, vendor };
}

export async function deleteVendorViaProxy(
  vendorId: number,
): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  const res = await fetch(`/api/backend/dashboard/vendors/${vendorId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : `Error ${res.status}`,
      code: typeof body.code === "string" ? body.code : undefined,
    };
  }
  return { ok: true };
}
