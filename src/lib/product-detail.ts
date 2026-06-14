/** Types + fetch for consolidated GET /dashboard/products/{productId}. */

import type { ProductMovementRow, ProductStockByWarehouseRow, ProductBatch, ProductQtySummary } from "@/lib/inventory";

export type DashboardProductDetailProduct = Readonly<{
  productId: number;
  supplierId: number;
  platformProductCode: string;
  sku: string | null;
  name: string;
  unit: string;
  presentation: string | null;
  brand: string | null;
  categoryId: number | null;
  inBundles: boolean;
  itemsPerBundle: string | null;
  stockQuantity: string;
  manageMinimumStock: boolean;
  minimumStockQuantity: string | null;
  price: string | null;
  cost: string | null;
  imageUrl: string | null;
  status: string;
  deletedAt: string | null;
  notes: string | null;
  trackStock: boolean;
  trackBatches: boolean;
  expiryWarningDays: number | null;
}>;

export type ProductOrderRow = Readonly<{
  orderId: string;
  displayCode: string | null;
  customerId: number;
  customerName: string;
  status: string;
  effectiveStatusKey: string | null;
  createdAt: string;
  confirmedAt: string | null;
  deliveryDate: string | null;
  lineQuantity: string;
  lineBackordered: string;
  unitPrice: string | null;
  lineTotal: string | null;
}>;

export type ProductBackorderSummary = Readonly<{
  totalBackordered: number;
  orderCount: number;
}>;

export type DashboardProductDetail = Readonly<{
  product: DashboardProductDetailProduct;
  stock: Readonly<{
    physical: number;
    reserved: number;
    sellableAvailable: number;
    committed: number;
    onPurchaseOrder: number;
    byWarehouse: ProductStockByWarehouseRow[];
  }>;
  movements: ProductMovementRow[];
  batches: ProductBatch[];
  qtySummary: ProductQtySummary | null;
  orders: ProductOrderRow[];
  backorderSummary: ProductBackorderSummary;
}>;

function parseProductDetailProduct(raw: unknown): DashboardProductDetailProduct | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const productId = typeof o.productId === "number" ? o.productId : Number(o.productId);
  if (!Number.isFinite(productId) || productId <= 0) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) return null;

  return {
    productId,
    supplierId: typeof o.supplierId === "number" ? o.supplierId : Number(o.supplierId),
    platformProductCode:
      typeof o.platformProductCode === "string" ? o.platformProductCode : "",
    sku: typeof o.sku === "string" ? o.sku : null,
    name,
    unit: typeof o.unit === "string" ? o.unit : "",
    presentation: typeof o.presentation === "string" ? o.presentation : null,
    brand: typeof o.brand === "string" ? o.brand : null,
    categoryId:
      o.categoryId === null || o.categoryId === undefined
        ? null
        : typeof o.categoryId === "number"
          ? o.categoryId
          : Number(o.categoryId),
    inBundles: o.inBundles === true,
    itemsPerBundle:
      typeof o.itemsPerBundle === "string"
        ? o.itemsPerBundle
        : o.itemsPerBundle != null
          ? String(o.itemsPerBundle)
          : null,
    stockQuantity:
      typeof o.stockQuantity === "string" ? o.stockQuantity : String(o.stockQuantity ?? "0"),
    manageMinimumStock: o.manageMinimumStock === true,
    minimumStockQuantity:
      typeof o.minimumStockQuantity === "string"
        ? o.minimumStockQuantity
        : o.minimumStockQuantity != null
          ? String(o.minimumStockQuantity)
          : null,
    price: typeof o.price === "string" ? o.price : o.price != null ? String(o.price) : null,
    cost: typeof o.cost === "string" ? o.cost : o.cost != null ? String(o.cost) : null,
    imageUrl: typeof o.imageUrl === "string" ? o.imageUrl : null,
    status: typeof o.status === "string" ? o.status : "active",
    deletedAt: typeof o.deletedAt === "string" ? o.deletedAt : null,
    notes: typeof o.notes === "string" ? o.notes : null,
    trackStock: o.trackStock === true,
    trackBatches: o.trackBatches === true,
    expiryWarningDays:
      typeof o.expiryWarningDays === "number" && Number.isFinite(o.expiryWarningDays)
        ? o.expiryWarningDays
        : null,
  };
}

function parseOrderRow(raw: unknown): ProductOrderRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const orderId = typeof o.orderId === "string" ? o.orderId : "";
  if (!orderId) return null;
  return {
    orderId,
    displayCode: typeof o.displayCode === "string" ? o.displayCode : null,
    customerId: typeof o.customerId === "number" ? o.customerId : Number(o.customerId),
    customerName: typeof o.customerName === "string" ? o.customerName : "",
    status: typeof o.status === "string" ? o.status : "",
    effectiveStatusKey:
      typeof o.effectiveStatusKey === "string" ? o.effectiveStatusKey : null,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
    confirmedAt: typeof o.confirmedAt === "string" ? o.confirmedAt : null,
    deliveryDate: typeof o.deliveryDate === "string" ? o.deliveryDate : null,
    lineQuantity: typeof o.lineQuantity === "string" ? o.lineQuantity : String(o.lineQuantity ?? "0"),
    lineBackordered:
      typeof o.lineBackordered === "string" ? o.lineBackordered : String(o.lineBackordered ?? "0"),
    unitPrice: typeof o.unitPrice === "string" ? o.unitPrice : o.unitPrice != null ? String(o.unitPrice) : null,
    lineTotal: typeof o.lineTotal === "string" ? o.lineTotal : o.lineTotal != null ? String(o.lineTotal) : null,
  };
}

function parseStockBlock(raw: unknown): DashboardProductDetail["stock"] | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const physical = typeof o.physical === "number" ? o.physical : Number(o.physical);
  const reserved = typeof o.reserved === "number" ? o.reserved : Number(o.reserved);
  const sellableAvailable =
    typeof o.sellableAvailable === "number" ? o.sellableAvailable : Number(o.sellableAvailable);
  const committed = typeof o.committed === "number" ? o.committed : Number(o.committed ?? 0);
  const onPurchaseOrder =
    typeof o.onPurchaseOrder === "number" ? o.onPurchaseOrder : Number(o.onPurchaseOrder ?? 0);

  const byWarehouse: ProductStockByWarehouseRow[] = [];
  if (Array.isArray(o.byWarehouse)) {
    for (const item of o.byWarehouse) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const warehouseId =
        typeof row.warehouseId === "number" ? row.warehouseId : Number(row.warehouseId);
      if (!Number.isFinite(warehouseId)) continue;
      byWarehouse.push({
        warehouseId,
        warehouseName: typeof row.warehouseName === "string" ? row.warehouseName : "",
        kind: typeof row.kind === "string" ? row.kind : "physical",
        isSellable: row.isSellable !== false,
        onHand: typeof row.onHand === "string" ? row.onHand : String(row.onHand ?? "0"),
        reserved: typeof row.reserved === "string" ? row.reserved : String(row.reserved ?? "0"),
        available:
          row.available === null || row.available === undefined
            ? null
            : typeof row.available === "string"
              ? row.available
              : String(row.available),
      });
    }
  }

  return {
    physical: Number.isFinite(physical) ? physical : 0,
    reserved: Number.isFinite(reserved) ? reserved : 0,
    sellableAvailable: Number.isFinite(sellableAvailable) ? sellableAvailable : 0,
    committed: Number.isFinite(committed) ? committed : 0,
    onPurchaseOrder: Number.isFinite(onPurchaseOrder) ? onPurchaseOrder : 0,
    byWarehouse,
  };
}

function parseMovement(raw: unknown): ProductMovementRow | null {
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
    unitCost:
      o.unitCost === null || o.unitCost === undefined
        ? null
        : typeof o.unitCost === "number"
          ? o.unitCost
          : Number(o.unitCost),
  };
}

function parseBatch(raw: unknown): ProductBatch | null {
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

function parseQtySummaryBlock(raw: unknown): ProductQtySummary | null {
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

export function parseProductDetail(raw: unknown): DashboardProductDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const product = parseProductDetailProduct(o.product);
  const stock = parseStockBlock(o.stock);
  if (!product || !stock) return null;

  const orders: ProductOrderRow[] = [];
  if (Array.isArray(o.orders)) {
    for (const item of o.orders) {
      const row = parseOrderRow(item);
      if (row) orders.push(row);
    }
  }

  const movements: ProductMovementRow[] = [];
  if (Array.isArray(o.movements)) {
    for (const item of o.movements) {
      const row = parseMovement(item);
      if (row) movements.push(row);
    }
  }

  const batches: ProductBatch[] = [];
  if (Array.isArray(o.batches)) {
    for (const item of o.batches) {
      const row = parseBatch(item);
      if (row) batches.push(row);
    }
  }

  const qtySummary = parseQtySummaryBlock(o.qtySummary);

  const boRaw = o.backorderSummary;
  const backorderSummary: ProductBackorderSummary =
    boRaw && typeof boRaw === "object"
      ? {
          totalBackordered: Number((boRaw as Record<string, unknown>).totalBackordered ?? 0),
          orderCount: Number((boRaw as Record<string, unknown>).orderCount ?? 0),
        }
      : { totalBackordered: 0, orderCount: 0 };

  return { product, stock, movements, batches, qtySummary, orders, backorderSummary };
}

export async function fetchProductDetailViaProxy(
  productId: number,
): Promise<DashboardProductDetail | null> {
  const res = await fetch(`/api/backend/dashboard/products/${productId}`, {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = typeof data.error === "string" ? data.error : `HTTP ${res.status}`;
    throw new Error(err);
  }
  const parsed = parseProductDetail(data);
  if (!parsed) {
    throw new Error("Respuesta inválida del servidor al cargar el producto.");
  }
  return parsed;
}

export async function patchProductDetailViaProxy(
  productId: number,
  payload: Record<string, unknown>,
): Promise<{ ok: true; detail: DashboardProductDetail } | { ok: false; error: string }> {
  const res = await fetch(`/api/backend/dashboard/products/${productId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = typeof data.error === "string" ? data.error : `Error ${res.status}`;
    return { ok: false, error: err };
  }
  const refreshed = await fetchProductDetailViaProxy(productId);
  if (!refreshed) {
    return { ok: false, error: "Producto guardado pero no se pudo recargar el detalle." };
  }
  return { ok: true, detail: refreshed };
}
