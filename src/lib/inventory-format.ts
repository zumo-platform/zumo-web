import { DASHBOARD_PRODUCT_UNLIMITED_STOCK, type DashboardProductRow } from "@/lib/dashboard-products";

export type StockStatus = "untracked" | "in_stock" | "low" | "out";

export function stockStatus(
  trackStock: boolean,
  available: number | null,
  minimum: number | null,
): StockStatus {
  if (!trackStock || available === null) return "untracked";
  if (available <= 0) return "out";
  if (minimum != null && available <= minimum) return "low";
  return "in_stock";
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  untracked: "No gestionado",
  in_stock: "En stock",
  low: "Stock bajo",
  out: "Sin stock",
};

export const STOCK_STATUS_TONE: Record<StockStatus, "neutral" | "green" | "amber" | "red"> = {
  untracked: "neutral",
  in_stock: "green",
  low: "amber",
  out: "red",
};

export const STOCK_STATUS_BADGE_CLASS: Record<StockStatus, string> = {
  untracked: "text-muted-foreground",
  in_stock: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  low: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  out: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** Resolve sellable qty for the catalog column (ledger first, legacy stockQuantity fallback). */
export function catalogAvailableQty(row: DashboardProductRow): number | null {
  if (!row.trackStock) return null;
  if (row.available !== null && Number.isFinite(row.available)) return row.available;
  if (row.stockQuantity === DASHBOARD_PRODUCT_UNLIMITED_STOCK) return null;
  const legacy = Number(row.stockQuantity);
  return Number.isFinite(legacy) ? legacy : 0;
}

export function catalogOnHandQty(row: DashboardProductRow): number | null {
  if (!row.trackStock) return null;
  if (row.onHand !== null && Number.isFinite(row.onHand)) return row.onHand;
  return catalogAvailableQty(row);
}

export function catalogReservedQty(row: DashboardProductRow): number | null {
  if (!row.trackStock) return null;
  if (row.reserved !== null && Number.isFinite(row.reserved)) return row.reserved;
  return 0;
}

export function catalogStockStatus(row: DashboardProductRow): StockStatus {
  if (!row.trackStock) return "untracked";
  return stockStatus(row.trackStock, catalogAvailableQty(row), row.minimumStock);
}

export function formatQty(n: number | null): string {
  if (n === null) return "—";
  return String(Math.round(n * 10_000) / 10_000);
}

export const MOVEMENT_REASON_LABEL: Record<string, string> = {
  opening_balance: "Saldo inicial",
  sale: "Venta",
  sale_reversal: "Reverso de venta",
  adjustment: "Ajuste",
  transfer_in: "Transferencia (entrada)",
  transfer_out: "Transferencia (salida)",
  count_correction: "Corrección de conteo",
  receipt: "Recepción de compra",
  receipt_reversal: "Reverso de recepción",
};
