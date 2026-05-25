"use client";

import { useEffect, useMemo, useState } from "react";

import { ChevronLeft, ChevronRight, Package, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatUnitAbbreviation } from "@/lib/product-unit";
import { formatOrderMoney } from "@/lib/order-product-search";
import type { DashboardProductRow } from "@/lib/dashboard-products";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

function isProductSelectable(product: DashboardProductRow): boolean {
  return product.deletedAt == null && product.status === "active";
}

export function CustomerProductPickerSheet({
  open,
  onOpenChange,
  customerName,
  products,
  existingProductIds,
  onConfirm,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  products: readonly DashboardProductRow[];
  existingProductIds: ReadonlySet<number>;
  onConfirm: (selected: DashboardProductRow[]) => void;
}>) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPageIndex(0);
    setSelectedIds(new Set());
  }, [open]);

  useEffect(() => {
    setPageIndex(0);
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...products];
    return products.filter((p) => {
      const sku = (p.sku ?? "").toLowerCase();
      return p.name.toLowerCase().includes(q) || sku.includes(q);
    });
  }, [products, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageRows = useMemo(() => {
    const start = safePageIndex * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePageIndex]);

  const newSelectionCount = useMemo(
    () => [...selectedIds].filter((id) => !existingProductIds.has(id)).length,
    [selectedIds, existingProductIds],
  );

  function toggleProduct(product: DashboardProductRow) {
    if (!isProductSelectable(product) || existingProductIds.has(product.productId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(product.productId)) next.delete(product.productId);
      else next.add(product.productId);
      return next;
    });
  }

  function handleAdd() {
    const toAdd = products.filter(
      (p) => selectedIds.has(p.productId) && !existingProductIds.has(p.productId),
    );
    if (toAdd.length === 0) return;
    onConfirm(toAdd);
    onOpenChange(false);
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <SheetTitle className="text-left text-base">
            Agregue productos al carrito del cliente
          </SheetTitle>
          <SheetDescription className="text-left">
            Los productos agregados aparecen en la lista de compras recurrente de {customerName}.
          </SheetDescription>
        </SheetHeader>

        <div className="shrink-0 border-b px-6 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Escribe el nombre o código del producto"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="shrink-0 border-b px-6 py-2">
          <p className="text-muted-foreground text-xs">
            {query.trim()
              ? `${filtered.length} resultado${filtered.length === 1 ? "" : "s"}`
              : `Tus ${products.length} productos`}
          </p>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <ul className="divide-y">
            {pageRows.map((product) => {
              const selectable = isProductSelectable(product);
              const alreadyAdded = existingProductIds.has(product.productId);
              const checked = selectedIds.has(product.productId) || alreadyAdded;
              const priceLabel =
                product.price != null ? formatOrderMoney(Number(product.price)) : "—";

              return (
                <li
                  className={cn(
                    "flex items-start gap-3 px-6 py-3",
                    (!selectable || alreadyAdded) && "bg-muted/40 text-muted-foreground",
                  )}
                  key={product.productId}
                >
                  <Checkbox
                    aria-label={`Seleccionar ${product.name}`}
                    checked={checked}
                    className="mt-0.5"
                    disabled={!selectable || alreadyAdded}
                    onCheckedChange={() => toggleProduct(product)}
                  />
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="size-10 object-cover" src={product.imageUrl} />
                      ) : (
                        <Package className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">{product.name}</p>
                      <p className="text-xs">
                        {priceLabel}{" "}
                        <span className="text-muted-foreground">
                          {formatUnitAbbreviation(product.unit)}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Presentación: {product.presentation ?? "—"}
                      </p>
                      {!selectable ? (
                        <p className="text-muted-foreground text-xs">No disponible</p>
                      ) : null}
                      {alreadyAdded ? (
                        <p className="text-muted-foreground text-xs">Ya en la lista</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
            {pageRows.length === 0 ? (
              <li className="px-6 py-12 text-center text-muted-foreground text-sm">
                No hay productos que coincidan.
              </li>
            ) : null}
          </ul>
        </ScrollArea>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t px-6 py-2">
          <p className="text-muted-foreground text-xs">
            Mostrando hasta {PAGE_SIZE} resultados
          </p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {pageCount} página{pageCount === 1 ? "" : "s"}
            </span>
            <Button
              aria-label="Página anterior"
              disabled={safePageIndex <= 0}
              size="icon-sm"
              type="button"
              variant="outline"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="tabular-nums text-muted-foreground text-xs">
              {safePageIndex + 1}
            </span>
            <Button
              aria-label="Página siguiente"
              disabled={safePageIndex >= pageCount - 1}
              size="icon-sm"
              type="button"
              variant="outline"
              onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-row items-center justify-between border-t px-6 py-4 sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {newSelectionCount === 0
              ? "Ningún producto seleccionado"
              : `${newSelectionCount} producto${newSelectionCount === 1 ? "" : "s"} agregado${newSelectionCount === 1 ? "" : "s"}`}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button disabled={newSelectionCount === 0} type="button" onClick={handleAdd}>
              Agregar
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
