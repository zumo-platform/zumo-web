"use client";

import { useEffect, useMemo, useState } from "react";

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
import { CustomerPriceLookup } from "@/components/workspace/customer-price-lookup";
import {
  fetchCustomerProductPricingViaProxy,
  type CustomerProductPricingRow,
} from "@/lib/customer-product-pricing";
import type { CustomerProductDiscount } from "@/lib/dashboard-customers";
import type { DashboardProductRow } from "@/lib/dashboard-products";
import { formatOrderMoney } from "@/lib/order-product-search";
import { formatDiscountPct } from "@/lib/pricing-copy";
import { formatUnitAbbreviation } from "@/lib/product-unit";
import { cn } from "@/lib/utils";
import { useSupplierTimeFormatters } from "@/lib/workspace-preferences-context";

function isProductAvailable(product: DashboardProductRow | undefined): boolean {
  if (!product) return false;
  return product.deletedAt == null && product.status === "active";
}

export function CustomerProductsTab({
  customerId,
  productIds,
  productFirstOrderedAt,
  productDiscounts,
  catalogById,
  onAddProducts,
  onRemoveProduct,
}: Readonly<{
  customerId: number;
  productIds: readonly number[];
  productFirstOrderedAt: Readonly<Record<number, string>>;
  productDiscounts: Readonly<Record<number, CustomerProductDiscount>>;
  catalogById: ReadonlyMap<number, DashboardProductRow>;
  onAddProducts: () => void;
  onRemoveProduct: (productId: number) => void;
}>) {
  const { formatInstantDate } = useSupplierTimeFormatters();
  const [resolvedById, setResolvedById] = useState<ReadonlyMap<number, CustomerProductPricingRow>>(
    () => new Map(),
  );

  useEffect(() => {
    if (productIds.length === 0) return;
    const ctrl = new AbortController();
    void fetchCustomerProductPricingViaProxy(customerId, {
      productIds,
      signal: ctrl.signal,
    })
      .then((rows) => {
        setResolvedById(new Map(rows.map((row) => [row.productId, row])));
      })
      .catch(() => setResolvedById(new Map()));
    return () => ctrl.abort();
  }, [customerId, productIds]);

  const rows = useMemo(() => {
    return productIds
      .map((id) => ({ productId: id, product: catalogById.get(id) }))
      .sort((a, b) => (a.product?.name ?? "").localeCompare(b.product?.name ?? "", "es"));
  }, [catalogById, productIds]);

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <CustomerPriceLookup customerId={customerId} />
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CustomerPriceLookup customerId={customerId} />
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
              const resolved = resolvedById.get(productId);
              const displayPrice = resolved?.unitPrice ?? null;
              const basePrice = resolved?.basePrice ?? null;
              const showStrike =
                displayPrice != null &&
                basePrice != null &&
                resolved != null &&
                resolved.discountPct > 0 &&
                basePrice !== displayPrice;
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
                    {displayPrice != null ? (
                      <div className="space-y-0.5">
                        <div>{formatOrderMoney(displayPrice)}</div>
                        {showStrike ? (
                          <div className="text-muted-foreground text-xs line-through">
                            {formatOrderMoney(basePrice!)}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      "—"
                    )}
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
