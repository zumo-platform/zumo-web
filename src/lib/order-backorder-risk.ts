import type { DashboardProductRow } from "@/lib/dashboard-products";
import type { EditableOrderLine } from "@/lib/editable-order-lines";

export function lineHasBackorderRisk(args: {
  quantity: number;
  availableStock: number | null;
  qtyBackordered?: number;
}): boolean {
  if ((args.qtyBackordered ?? 0) > 0) return true;
  if (args.availableStock === null) return false;
  return args.quantity > args.availableStock;
}

export function productAvailableStock(product: DashboardProductRow | undefined): number | null {
  if (!product?.trackStock) return null;
  return product.available;
}

function catalogByProductId(
  catalog: ReadonlyMap<number, DashboardProductRow> | readonly DashboardProductRow[],
): Map<number, DashboardProductRow> {
  if ("get" in catalog) {
    return new Map(catalog.entries());
  }
  return new Map(catalog.map((product) => [product.productId, product]));
}

export function orderHasBackorderRiskFromEditableLines(
  lines: readonly Pick<EditableOrderLine, "quantity" | "availableStock">[],
): boolean {
  return lines.some((line) =>
    lineHasBackorderRisk({
      quantity: line.quantity,
      availableStock: line.availableStock,
    }),
  );
}

export function orderHasBackorderRiskFromDetailLines(
  lines: readonly {
    quantity: number;
    qtyBackordered?: number;
    productId: number | null;
  }[],
  catalog: ReadonlyMap<number, DashboardProductRow> | readonly DashboardProductRow[],
): boolean {
  const byId = catalogByProductId(catalog);

  return lines.some((line) => {
    const product = line.productId != null ? byId.get(line.productId) : undefined;
    return lineHasBackorderRisk({
      quantity: line.quantity,
      availableStock: productAvailableStock(product),
      qtyBackordered: line.qtyBackordered,
    });
  });
}

export function lineAvailableStockFromCatalog(
  productId: number | null,
  catalog: ReadonlyMap<number, DashboardProductRow> | readonly DashboardProductRow[],
): number | null {
  if (productId == null) return null;
  return productAvailableStock(catalogByProductId(catalog).get(productId));
}
