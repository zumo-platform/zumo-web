import type { DashboardOrderDetail } from "@/lib/dashboard-orders";
import type { DashboardProductRow } from "@/lib/dashboard-products";
import { parseProductPrice } from "@/lib/order-product-search";
import { productAvailableStock } from "@/lib/order-backorder-risk";

export type EditableOrderLine = Readonly<{
  key: string;
  productId: number | null;
  productName: string;
  sku: string | null;
  unit: string;
  unitPrice: number;
  quantity: number;
  unmatched: boolean;
  availableStock: number | null;
  bandMin: number | null;
  bandMax: number | null;
  resolvedUnitPrice: number | null;
}>;

export function editableLineSubtotal(line: EditableOrderLine): number {
  return line.unitPrice * line.quantity;
}

export function buildEditableOrderLines(
  detail: Pick<DashboardOrderDetail, "lines">,
  catalog: Map<number, DashboardProductRow>,
): EditableOrderLine[] {
  return detail.lines.map((line, index) => {
    const product = line.productId !== null ? catalog.get(line.productId) : undefined;
    const unmatched = line.productId === null;
    const resolved = line.resolvedUnitPrice ?? null;
    const frozen = line.unitPrice ?? null;
    const fallback =
      product !== undefined ? parseProductPrice(product.price) : (frozen ?? 0);
    const unitPrice = frozen ?? resolved ?? fallback;
    return {
      key: unmatched ? `unmatched-${String(index)}` : `product-${String(line.productId)}`,
      productId: line.productId,
      productName: product?.name ?? line.productName,
      sku: product?.sku ?? null,
      unit: product?.unit ?? line.unit,
      unitPrice,
      quantity: line.quantity,
      unmatched,
      availableStock: productAvailableStock(product),
      bandMin: line.bandMin ?? null,
      bandMax: line.bandMax ?? null,
      resolvedUnitPrice: resolved,
    };
  });
}

export function productToEditableLine(product: DashboardProductRow): EditableOrderLine {
  const unitPrice = parseProductPrice(product.price);
  return {
    key: `product-${String(product.productId)}`,
    productId: product.productId,
    productName: product.name,
    sku: product.sku,
    unit: product.unit,
    unitPrice,
    quantity: 1,
    unmatched: false,
    availableStock: productAvailableStock(product),
    bandMin: null,
    bandMax: null,
    resolvedUnitPrice: unitPrice,
  };
}

export function patchPayloadFromLines(
  lines: readonly EditableOrderLine[],
): Array<{ productId: number; quantity: number; unitPrice?: number }> {
  return lines
    .filter((l) => l.productId !== null && !l.unmatched)
    .map((l) => ({
      productId: l.productId as number,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    }));
}

export function isPriceWithinBand(
  unitPrice: number,
  bandMin: number | null,
  bandMax: number | null,
): boolean {
  const p = Math.round((unitPrice + Number.EPSILON) * 100) / 100;
  if (bandMin != null && p < Math.round((bandMin + Number.EPSILON) * 100) / 100) return false;
  if (bandMax != null && p > Math.round((bandMax + Number.EPSILON) * 100) / 100) return false;
  return true;
}

export function hasBandConstraints(bandMin: number | null, bandMax: number | null): boolean {
  return bandMin != null || bandMax != null;
}
