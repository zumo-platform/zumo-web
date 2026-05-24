"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatProductStockLabel,
  type DashboardProductRow,
} from "@/lib/dashboard-products";
import { formatUnitAbbreviation } from "@/lib/product-unit";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export function OrderProductCatalogDialog({
  open,
  onOpenChange,
  products,
  orderProductIds,
  onConfirm,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: readonly DashboardProductRow[];
  orderProductIds: ReadonlySet<number>;
  onConfirm: (selected: DashboardProductRow[]) => void;
}>) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPageIndex(0);
    setPageSize(10);
    setSelectedIds(new Set(orderProductIds));
  }, [open, orderProductIds]);

  useEffect(() => {
    setPageIndex(0);
  }, [query, pageSize]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...products];
    return products.filter((p) => {
      const sku = (p.sku ?? "").toLowerCase();
      return p.name.toLowerCase().includes(q) || sku.includes(q);
    });
  }, [products, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);

  const pageRows = useMemo(() => {
    const start = safePageIndex * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePageIndex, pageSize]);

  const newSelectionCount = useMemo(
    () => [...selectedIds].filter((id) => !orderProductIds.has(id)).length,
    [selectedIds, orderProductIds],
  );

  function toggleProduct(productId: number, disabled: boolean) {
    if (disabled) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function handleNext() {
    const toAdd = products.filter(
      (p) => selectedIds.has(p.productId) && !orderProductIds.has(p.productId),
    );
    onConfirm(toAdd);
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        aria-label="Cerrar catálogo"
        className="absolute inset-0 bg-black/50"
        type="button"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative flex h-[min(720px,92vh)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border bg-background shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-dialog-title"
      >
        <div className="shrink-0 border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-base" id="catalog-dialog-title">
                Inventario
              </h2>
              <p className="mt-0.5 text-muted-foreground text-sm">
                Seleccioná ítems del inventario para agregar al pedido.
              </p>
            </div>
            <Button
              aria-label="Cerrar"
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="shrink-0 border-b px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10" />
                <TableHead className="w-[100px]">SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[72px] text-center">Unidad</TableHead>
                <TableHead className="w-[120px]">Presentación</TableHead>
                <TableHead className="w-[100px] text-right">Inventario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((product) => {
                const onOrder = orderProductIds.has(product.productId);
                const checked = selectedIds.has(product.productId);
                return (
                  <TableRow
                    className={cn(onOrder && "bg-muted/30 opacity-60")}
                    key={product.productId}
                  >
                    <TableCell className="align-middle">
                      <Checkbox
                        aria-label={`Seleccionar ${product.name}`}
                        checked={checked}
                        disabled={onOrder}
                        onCheckedChange={() => toggleProduct(product.productId, onOrder)}
                      />
                    </TableCell>
                    <TableCell className="align-middle font-mono text-muted-foreground text-xs">
                      {product.sku ?? "—"}
                    </TableCell>
                    <TableCell className="align-middle">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt=""
                              className="size-9 object-cover"
                              height={36}
                              src={product.imageUrl}
                              width={36}
                            />
                          ) : (
                            <Package className="size-4 text-muted-foreground" strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-sm">{product.name}</p>
                          {onOrder ? (
                            <p className="text-muted-foreground text-xs">Ya en el pedido</p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-middle text-center text-sm">
                      {formatUnitAbbreviation(product.unit)}
                    </TableCell>
                    <TableCell className="align-middle text-muted-foreground text-sm">
                      {product.presentation ?? "—"}
                    </TableCell>
                    <TableCell className="align-middle text-right tabular-nums text-sm">
                      {formatProductStockLabel(product.stockQuantity)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-12 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    No hay productos que coincidan.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
          <p className="text-muted-foreground text-sm">
            {newSelectionCount > 0
              ? `${String(newSelectionCount)} nuevo(s) seleccionado(s)`
              : "Ningún producto nuevo seleccionado"}
            {" · "}
            {filtered.length} producto(s)
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">Filas</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                const n = Number(v);
                if (n === 10 || n === 20 || n === 50) setPageSize(n);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="min-w-[88px] text-center text-muted-foreground text-sm">
              Pág. {safePageIndex + 1} de {pageCount}
            </span>

            <div className="flex items-center gap-0.5">
              <Button
                aria-label="Primera página"
                disabled={safePageIndex <= 0}
                size="icon-sm"
                type="button"
                variant="outline"
                onClick={() => setPageIndex(0)}
              >
                <ChevronsLeft className="size-4" />
              </Button>
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
              <Button
                aria-label="Última página"
                disabled={safePageIndex >= pageCount - 1}
                size="icon-sm"
                type="button"
                variant="outline"
                onClick={() => setPageIndex(pageCount - 1)}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleNext}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
