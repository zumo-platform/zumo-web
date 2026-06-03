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
}>;

export type ProductStockByWarehouseRow = Readonly<{
  warehouseId: number;
  warehouseName: string;
  kind: string;
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
  };
}

export async function getProductStockViaProxy(productId: number): Promise<{
  byWarehouse: ProductStockByWarehouseRow[];
  movements: ProductMovementRow[];
}> {
  const res = await fetch(`/api/backend/dashboard/inventory/product/${productId}`, {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as {
    byWarehouse?: unknown[];
    movements?: unknown[];
  };
  if (!res.ok) {
    return { byWarehouse: [], movements: [] };
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

  return { byWarehouse, movements };
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
