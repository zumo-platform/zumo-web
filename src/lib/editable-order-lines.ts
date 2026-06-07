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
    return {
      key: unmatched ? `unmatched-${String(index)}` : `product-${String(line.productId)}`,
      productId: line.productId,
      productName: product?.name ?? line.productName,
      sku: product?.sku ?? null,
      unit: product?.unit ?? line.unit,
      unitPrice:
        product !== undefined ? parseProductPrice(product.price) : (line.unitPrice ?? 0),
      quantity: line.quantity,
      unmatched,
      availableStock: productAvailableStock(product),
    };
  });
}

export function productToEditableLine(product: DashboardProductRow): EditableOrderLine {
  return {
    key: `product-${String(product.productId)}`,
    productId: product.productId,
    productName: product.name,
    sku: product.sku,
    unit: product.unit,
    unitPrice: parseProductPrice(product.price),
    quantity: 1,
    unmatched: false,
    availableStock: productAvailableStock(product),
  };
}

export function patchPayloadFromLines(
  lines: readonly EditableOrderLine[],
): Array<{ productId: number; quantity: number }> {
  return lines
    .filter((l) => l.productId !== null && !l.unmatched)
    .map((l) => ({ productId: l.productId as number, quantity: l.quantity }));
}
