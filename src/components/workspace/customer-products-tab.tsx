"use client";

import { useMemo } from "react";

import { Package, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CustomerProductDiscount } from "@/lib/dashboard-customers";
import type { DashboardProductRow } from "@/lib/dashboard-products";
import { formatUnitAbbreviation } from "@/lib/product-unit";
import { formatDiscountPct } from "@/lib/pricing-copy";
import { formatOrderMoney } from "@/lib/order-product-search";
import { useSupplierTimeFormatters } from "@/lib/workspace-preferences-context";
import { cn } from "@/lib/utils";

function isProductAvailable(product: DashboardProductRow | undefined): boolean {
  if (!product) return false;
  return product.deletedAt == null && product.status === "active";
}

export function CustomerProductsTab({
  productIds,
  productFirstOrderedAt,
  productDiscounts,
  catalogById,
  onAddProducts,
  onRemoveProduct,
}: Readonly<{
  productIds: readonly number[];
  productFirstOrderedAt: Readonly<Record<number, string>>;
  productDiscounts: Readonly<Record<number, CustomerProductDiscount>>;
  catalogById: ReadonlyMap<number, DashboardProductRow>;
  onAddProducts: () => void;
  onRemoveProduct: (productId: number) => void;
}>) {
  const { formatInstantDate } = useSupplierTimeFormatters();
  const rows = useMemo(() => {
    return productIds
      .map((id) => ({ productId: id, product: catalogById.get(id) }))
      .sort((a, b) => (a.product?.name ?? "").localeCompare(b.product?.name ?? "", "es"));
  }, [catalogById, productIds]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <Package aria-hidden className="size-10 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium text-sm">Todavía no hay productos</p>
          <p className="max-w-sm text-muted-foreground text-sm">
            Agregá productos al carrito recurrente de este cliente. Los productos de sus pedidos
            aparecen aquí automáticamente.
          </p>
        </div>
        <Button className="gap-1.5" type="button" onClick={onAddProducts}>
          <Plus className="size-4" />
          Agregar productos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-1.5" size="sm" type="button" onClick={onAddProducts}>
          <Plus className="size-4" />
          Agregar productos
        </Button>
      </div>
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Presentación</TableHead>
              <TableHead>Primer pedido</TableHead>
              <TableHead className="text-right">Descuento</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ productId, product }) => {
              const available = isProductAvailable(product);
              const discount = productDiscounts[productId];
              return (
                <TableRow
                  className={cn(!available && "bg-muted/40 text-muted-foreground")}
                  key={productId}
                >
                  <TableCell className="font-mono text-xs">{product?.sku ?? "—"}</TableCell>
                  <TableCell>{product?.name ?? `Producto #${productId}`}</TableCell>
                  <TableCell>{product ? formatUnitAbbreviation(product.unit) : "—"}</TableCell>
                  <TableCell>{product?.presentation ?? "—"}</TableCell>
                  <TableCell>
                    {productFirstOrderedAt[productId]
                      ? formatInstantDate(productFirstOrderedAt[productId])
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {discount?.discountPct != null ? (
                      <span title={discount.discountListName ?? undefined}>
                        {formatDiscountPct(String(discount.discountPct))}
                      </span>
                    ) : discount?.pendingDiscountPct != null ? (
                      <span
                        className="text-muted-foreground"
                        title={
                          discount.pendingDiscountListName
                            ? `${discount.pendingDiscountListName} (programada)`
                            : "Programada"
                        }
                      >
                        {formatDiscountPct(String(discount.pendingDiscountPct))}
                        <span className="ml-1 text-xs">prog.</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product?.price != null ? formatOrderMoney(Number(product.price)) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      disabled={!available}
                      size="sm"
                      type="button"
                      variant="ghost"
                      onClick={() => onRemoveProduct(productId)}
                    >
                      Quitar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
