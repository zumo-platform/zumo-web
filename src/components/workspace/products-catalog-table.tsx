"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, MoreHorizontal, Package } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InventoryAdjustDialog } from "@/components/workspace/inventory-adjust-dialog";
import { InventoryTransferDialog } from "@/components/workspace/inventory-transfer-dialog";
import { ProductStockPopover } from "@/components/workspace/product-stock-popover";
import { batchExpiryState, formatDateShort, formatMoneyCRC } from "@/lib/batch-format";
import {
  catalogIncomingQty,
  catalogTotalQty,
  fetchProductBatchesViaProxy,
  formatProductStockLabel,
  prefetchProductBatchesViaProxy,
  type DashboardProductRow,
} from "@/lib/dashboard-products";
import type { ProductBatch } from "@/lib/inventory";
import {
  catalogAvailableQty,
  catalogCommittedQty,
  catalogOnHandQty,
  catalogReservedQty,
  catalogStockStatus,
  formatQty,
  STOCK_STATUS_BADGE_CLASS,
  STOCK_STATUS_LABEL,
  STOCK_STATUS_TONE,
} from "@/lib/inventory-format";
import {
  loadProductCategoryMap,
  readCachedProductCategories,
} from "@/lib/products-catalog-cache";
import { canMutateInventory } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { workspaceTableCardClassName } from "@/lib/workspace-layout";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

const PAGE_SIZES = [20, 50, 100] as const;
type LotCacheValue = ProductBatch[] | "loading" | "error";

const PRICE_FMT = new Intl.NumberFormat("es", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatPriceLabel(price: string | null): string {
  if (price === null || price === "") return "—";
  const num = Number(price);
  if (!Number.isFinite(num)) return "—";
  return PRICE_FMT.format(num);
}

async function patchProductAvailability(productId: number, available: boolean): Promise<boolean> {
  const res = await fetch(`/api/backend/dashboard/products/${productId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ available }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    toast.error(typeof body.error === "string" ? body.error : "No se pudo actualizar el producto.");
    return false;
  }
  return true;
}

async function deleteProductRequest(productId: number): Promise<boolean> {
  const res = await fetch(`/api/backend/dashboard/products/${productId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    toast.error(typeof body.error === "string" ? body.error : "No se pudo eliminar el producto.");
    return false;
  }
  return true;
}

function ProductThumb({ imageUrl }: Readonly<{ imageUrl: string | null }>) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URLs + arbitrary CDN from suppliers
      <img
        alt=""
        className="size-10 shrink-0 rounded-md border border-border/60 object-cover"
        height={40}
        src={imageUrl}
        width={40}
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border/40 bg-muted"
    >
      <Package className="size-5 text-muted-foreground" strokeWidth={1.5} />
    </div>
  );
}

export function ProductsCatalogTable({
  data,
  onCatalogChanged,
  prefetchBatchProductIds = [],
}: Readonly<{
  data: DashboardProductRow[];
  onCatalogChanged: () => void;
  prefetchBatchProductIds?: readonly number[];
}>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [categoryById, setCategoryById] = useState<Map<number, string>>(() => {
    const cached = readCachedProductCategories();
    return cached ? new Map(cached) : new Map();
  });
  const [pendingDelete, setPendingDelete] = useState<DashboardProductRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<DashboardProductRow | null>(null);
  const [transferProduct, setTransferProduct] = useState<DashboardProductRow | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lotCache, setLotCache] = useState<Record<number, LotCacheValue>>({});
  const lotCacheRef = useRef<Record<number, LotCacheValue>>({});
  const activeLotRequestsRef = useRef(new Set<number>());
  const { role } = useWorkspacePermissions();
  const canEditInventory = canMutateInventory(role);
  const router = useRouter();

  const productIdsKey = useMemo(() => data.map((p) => p.productId).join(","), [data]);
  const prefetchBatchProductIdsKey = useMemo(
    () => prefetchBatchProductIds.join(","),
    [prefetchBatchProductIds],
  );

  useEffect(() => {
    lotCacheRef.current = lotCache;
  }, [lotCache]);

  useEffect(() => {
    if (!productIdsKey) return;
    if (readCachedProductCategories()) return;
    let cancelled = false;
    void (async () => {
      const map = await loadProductCategoryMap();
      if (!cancelled) setCategoryById(new Map(map));
    })();
    return () => {
      cancelled = true;
    };
  }, [productIdsKey]);

  const categoryLabel = useCallback(
    (categoryId: number | null) => {
      if (categoryId === null) return "Sin categoría";
      return categoryById.get(categoryId) ?? `Categoría #${categoryId}`;
    },
    [categoryById],
  );

  const toggleExpand = useCallback((productId: number, trackStock: boolean) => {
    if (!trackStock) return;
    setExpandedId((cur) => (cur === productId ? null : productId));
  }, []);

  const loadProductLots = useCallback((productId: number) => {
    if (lotCacheRef.current[productId] !== undefined) return;
    if (activeLotRequestsRef.current.has(productId)) {
      setLotCache((cache) => (cache[productId] === undefined ? { ...cache, [productId]: "loading" } : cache));
      return;
    }
    activeLotRequestsRef.current.add(productId);
    setLotCache((cache) => ({ ...cache, [productId]: "loading" }));
    void fetchProductBatchesViaProxy(productId)
      .then((batches) => {
        setLotCache((c) => ({ ...c, [productId]: batches }));
      })
      .catch(() => {
        setLotCache((c) => ({ ...c, [productId]: "error" }));
      })
      .finally(() => {
        activeLotRequestsRef.current.delete(productId);
      });
  }, []);

  useEffect(() => {
    if (expandedId == null) return;
    loadProductLots(expandedId);
  }, [expandedId, loadProductLots]);

  useEffect(() => {
    if (!prefetchBatchProductIdsKey) return;
    const idsToLoad = prefetchBatchProductIdsKey
      .split(",")
      .map((id) => Number(id))
      .filter(
        (id) =>
          Number.isFinite(id) &&
          id > 0 &&
          lotCacheRef.current[id] === undefined &&
          !activeLotRequestsRef.current.has(id),
      );
    if (idsToLoad.length === 0) return;
    idsToLoad.forEach((id) => activeLotRequestsRef.current.add(id));
    prefetchProductBatchesViaProxy(idsToLoad);
    let cancelled = false;
    void Promise.allSettled(idsToLoad.map((id) => fetchProductBatchesViaProxy(id))).then((results) => {
      idsToLoad.forEach((id) => activeLotRequestsRef.current.delete(id));
      if (cancelled) return;
      setLotCache((cache) => {
        const next = { ...cache };
        idsToLoad.forEach((id, index) => {
          const result = results[index];
          if ((next[id] === undefined || next[id] === "loading") && result?.status === "fulfilled") {
            next[id] = result.value;
          } else if (next[id] === "loading" && result?.status === "rejected") {
            next[id] = "error";
          }
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [prefetchBatchProductIdsKey]);

  const columns = useMemo<ColumnDef<DashboardProductRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Seleccionar todos los productos"
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Seleccionar ${row.original.name}`}
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "expander",
        header: () => null,
        cell: ({ row }) => {
          const r = row.original;
          if (!r.trackStock) return null;
          const open = expandedId === r.productId;
          return (
            <Button
              aria-label={open ? "Ocultar lotes" : "Ver lotes"}
              className="size-7"
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(r.productId, r.trackStock);
              }}
            >
              <ChevronRight className={`size-4 transition-transform ${open ? "rotate-90" : ""}`} />
            </Button>
          );
        },
        enableSorting: false,
      },
      {
        id: "photo",
        header: "Foto",
        cell: ({ row }) => <ProductThumb imageUrl={row.original.imageUrl} />,
        enableSorting: false,
      },
      {
        id: "product",
        header: "Producto",
        cell: ({ row }) => {
          const { name, presentation, productId } = row.original;
          return (
            <Link
              className="flex min-w-0 max-w-[min(280px,45vw)] flex-col gap-0.5 hover:underline"
              href={`/products/${productId}`}
            >
              <span className="truncate font-medium text-foreground text-sm leading-tight tracking-tight">
                {name}
              </span>
              {presentation ? (
                <span className="truncate text-muted-foreground text-xs leading-snug">{presentation}</span>
              ) : null}
            </Link>
          );
        },
      },
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <span
            className="block max-w-[min(140px,22vw)] truncate font-mono text-muted-foreground text-sm tabular-nums"
            title={row.original.sku ?? undefined}
          >
            {row.original.sku ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "unit",
        header: "Unidad",
        cell: ({ row }) => (
          <span className="block max-w-[120px] truncate text-sm" title={row.original.unit}>
            {row.original.unit}
          </span>
        ),
      },
      {
        id: "category",
        header: "Categoría",
        cell: ({ row }) => (
          <span
            className="block max-w-[min(200px,28vw)] truncate text-sm"
            title={categoryLabel(row.original.categoryId)}
          >
            {categoryLabel(row.original.categoryId)}
          </span>
        ),
      },
      {
        id: "inventory",
        header: "Disponible",
        cell: ({ row }) => {
          const r = row.original;
          const status = catalogStockStatus(r);
          if (status === "untracked") {
            return (
              <span className="tabular-nums text-sm" title="Sin control de existencias">
                {formatProductStockLabel(r.stockQuantity)}
              </span>
            );
          }
          const available = catalogAvailableQty(r);
          const committed = catalogCommittedQty(r);
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-default flex-col items-start gap-0.5">
                  <span className="inline-flex items-center gap-2">
                    <span className="font-medium text-sm tabular-nums">{formatQty(available)}</span>
                    <Badge
                      className={STOCK_STATUS_BADGE_CLASS[status]}
                      data-tone={STOCK_STATUS_TONE[status]}
                      variant="outline"
                    >
                      {STOCK_STATUS_LABEL[status]}
                    </Badge>
                  </span>
                  {committed != null && committed > 0 ? (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      Comprometido: {formatQty(committed)}
                    </span>
                  ) : null}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Físico {formatQty(catalogOnHandQty(r))} · Reservado{" "}
                {formatQty(catalogReservedQty(r))}
                {committed != null && committed > 0
                  ? ` · Comprometido ${formatQty(committed)}`
                  : ""}
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        id: "incoming",
        header: () => <span className="block text-right">Por llegar</span>,
        cell: ({ row }) => {
          const r = row.original;
          if (!r.trackStock) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="block text-right tabular-nums text-sm">
              {formatQty(catalogIncomingQty(r))}
            </span>
          );
        },
      },
      {
        id: "total",
        header: () => <span className="block text-right">Total</span>,
        cell: ({ row }) => {
          const r = row.original;
          if (!r.trackStock) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="block text-right font-medium tabular-nums text-sm">
              {formatQty(catalogTotalQty(r))}
            </span>
          );
        },
      },
      {
        id: "price",
        header: "Precio",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">{formatPriceLabel(row.original.price)}</span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex items-center gap-1">
              <ProductStockPopover product={p} />
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`Más acciones para ${p.name}`}
                  className="size-8"
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {canEditInventory ? (
                  <>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setAdjustProduct(p);
                      }}
                    >
                      Agregar / ajustar stock
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setTransferProduct(p);
                      }}
                    >
                      Transferir stock
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuItem
                  disabled={p.status === "active"}
                  onSelect={async (e) => {
                    e.preventDefault();
                    const ok = await patchProductAvailability(p.productId, true);
                    if (ok) {
                      toast.success("Producto activo.");
                      onCatalogChanged();
                    }
                  }}
                >
                  Marcar activo
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={p.status === "inactive"}
                  onSelect={async (e) => {
                    e.preventDefault();
                    const ok = await patchProductAvailability(p.productId, false);
                    if (ok) {
                      toast.success("Producto inactivo.");
                      onCatalogChanged();
                    }
                  }}
                >
                  Marcar inactivo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    setPendingDelete(p);
                  }}
                >
                  Eliminar producto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [canEditInventory, categoryLabel, expandedId, onCatalogChanged, toggleExpand],
  );

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(row.productId),
    initialState: { pagination: { pageSize: 20, pageIndex: 0 } },
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalRows = data.length;
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    try {
      const ok = await deleteProductRequest(pendingDelete.productId);
      if (ok) {
        toast.success("Producto eliminado.");
        setPendingDelete(null);
        setRowSelection({});
        onCatalogChanged();
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full">
        <div className={workspaceTableCardClassName}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "sticky top-0 z-20 bg-card shadow-[inset_0_-1px_0_hsl(var(--border))]",
                      header.column.id === "select" && "w-10 px-2",
                      header.column.id === "expander" && "w-10 px-1",
                      header.column.id === "photo" && "w-14",
                      header.column.id === "actions" && "w-10 px-2",
                      header.column.id === "incoming" && "text-right",
                      header.column.id === "total" && "text-right",
                      header.column.id === "name" && "min-w-40",
                      header.column.id === "sku" && "min-w-28",
                      header.column.id === "category" && "min-w-24",
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    className="cursor-pointer"
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    key={row.id}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("button, a, input, [role=checkbox], [data-radix-collection-item]")) {
                        return;
                      }
                      router.push(`/products/${row.original.productId}`);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedId === row.original.productId ? (
                    <TableRow key={`${row.id}-lots`} className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={columns.length} className="p-0">
                        <div className="px-6 py-3">
                          {lotCache[row.original.productId] === "loading" ? (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                              <Loader2 aria-hidden className="size-4 animate-spin" />
                              Cargando lotes…
                            </div>
                          ) : lotCache[row.original.productId] === "error" ? (
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <span className="text-muted-foreground">
                                No se pudieron cargar los lotes. Intentá de nuevo.
                              </span>
                              <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const productId = row.original.productId;
                                  const next = { ...lotCacheRef.current };
                                  delete next[productId];
                                  lotCacheRef.current = next;
                                  setLotCache(next);
                                  loadProductLots(productId);
                                }}
                              >
                                Reintentar
                              </Button>
                            </div>
                          ) : (lotCache[row.original.productId] as ProductBatch[])?.length ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Lote</TableHead>
                                  <TableHead>Vence</TableHead>
                                  <TableHead>Proveedor</TableHead>
                                  <TableHead className="text-right">Existencia</TableHead>
                                  <TableHead className="text-right">Costo unit.</TableHead>
                                  <TableHead>Estado</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(lotCache[row.original.productId] as ProductBatch[]).map((b) => {
                                  const exp = batchExpiryState(b.expiryDate, b.status);
                                  return (
                                    <TableRow key={b.batchId}>
                                      <TableCell className="font-medium">{b.batchNumber}</TableCell>
                                      <TableCell className={exp.className}>
                                        {b.expiryDate ? formatDateShort(b.expiryDate) : "—"}
                                      </TableCell>
                                      <TableCell>{b.vendorName ?? "—"}</TableCell>
                                      <TableCell className="text-right tabular-nums">
                                        {formatQty(b.onHand)}
                                      </TableCell>
                                      <TableCell className="text-right tabular-nums">
                                        {b.unitCost != null ? formatMoneyCRC(b.unitCost) : "—"}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={exp.variant}>{exp.label}</Badge>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-muted-foreground text-sm">
                              Este producto no tiene lotes registrados.
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-24 text-center text-muted-foreground" colSpan={columns.length}>
                  No hay productos para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {selectedCount} de {totalRows} fila{totalRows === 1 ? "" : "s"} seleccionada
            {selectedCount === 1 ? "" : "s"}.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-sm font-medium">Filas por página</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                  table.setPageIndex(0);
                }}
              >
                <SelectTrigger className="h-8 w-18" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="whitespace-nowrap text-sm font-medium">
              Página {pageCount === 0 ? 0 : pageIndex + 1} de {pageCount}
            </p>

            <div className="flex items-center gap-1">
              <Button
                aria-label="Primera página"
                className="size-8"
                disabled={!table.getCanPreviousPage()}
                size="icon-sm"
                type="button"
                variant="outline"
                onClick={() => table.setPageIndex(0)}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                aria-label="Página anterior"
                className="size-8"
                disabled={!table.getCanPreviousPage()}
                size="icon-sm"
                type="button"
                variant="outline"
                onClick={() => table.previousPage()}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                aria-label="Página siguiente"
                className="size-8"
                disabled={!table.getCanNextPage()}
                size="icon-sm"
                type="button"
                variant="outline"
                onClick={() => table.nextPage()}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                aria-label="Última página"
                className="size-8"
                disabled={!table.getCanNextPage()}
                size="icon-sm"
                type="button"
                variant="outline"
                onClick={() => table.setPageIndex(Math.max(pageCount - 1, 0))}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setPendingDelete(null);
        }}
        open={pendingDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? (
                <>
                  Se archivará <span className="font-medium text-foreground">{pendingDelete.name}</span> del
                  catálogo. Podés volver a cargarlo más adelante si lo necesitás.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancelar</AlertDialogCancel>
            <Button disabled={deleteBusy} type="button" variant="destructive" onClick={() => void confirmDelete()}>
              {deleteBusy ? "Eliminando…" : "Eliminar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InventoryAdjustDialog
        open={adjustProduct != null}
        product={adjustProduct}
        onOpenChange={(open) => {
          if (!open) setAdjustProduct(null);
        }}
        onSuccess={onCatalogChanged}
      />

      <InventoryTransferDialog
        open={transferProduct != null}
        product={transferProduct}
        onOpenChange={(open) => {
          if (!open) setTransferProduct(null);
        }}
        onSuccess={onCatalogChanged}
      />
      </div>
    </TooltipProvider>
  );
}
