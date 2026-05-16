"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal, Package } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DASHBOARD_PRODUCT_UNLIMITED_STOCK, type DashboardProductRow } from "@/lib/dashboard-products";
import { cn } from "@/lib/utils";

function formatInventoryLabel(stockQuantity: string): string {
  if (stockQuantity === DASHBOARD_PRODUCT_UNLIMITED_STOCK) {
    return "Ilimitado";
  }
  try {
    return BigInt(stockQuantity).toLocaleString("es");
  } catch {
    const n = Number(stockQuantity);
    if (!Number.isFinite(n)) return stockQuantity;
    return Math.trunc(n).toLocaleString("es");
  }
}

function formatPriceLabel(price: string | null): string {
  if (price === null || price === "") return "—";
  const num = Number(price);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("es", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

async function fetchCategoryNameMap(): Promise<Map<number, string>> {
  const res = await fetch("/api/backend/dashboard/product-categories", {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const map = new Map<number, string>();
  if (!res.ok) return map;
  const raw = data.categories;
  if (!Array.isArray(raw)) return map;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.categoryId === "number" ? o.categoryId : Number(o.categoryId);
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (Number.isFinite(id) && id >= 1 && name.length) map.set(id, name);
  }
  return map;
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
}: Readonly<{
  data: DashboardProductRow[];
  onCatalogChanged: () => void;
}>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [categoryById, setCategoryById] = useState<Map<number, string>>(() => new Map());
  const [pendingDelete, setPendingDelete] = useState<DashboardProductRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const productIdsKey = useMemo(() => data.map((p) => p.productId).join(","), [data]);

  useEffect(() => {
    if (!productIdsKey) return;
    let cancelled = false;
    void (async () => {
      const map = await fetchCategoryNameMap();
      if (!cancelled) setCategoryById(map);
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
        id: "photo",
        header: "Foto",
        cell: ({ row }) => <ProductThumb imageUrl={row.original.imageUrl} />,
        enableSorting: false,
      },
      {
        id: "product",
        header: "Producto",
        cell: ({ row }) => {
          const { name, presentation } = row.original;
          return (
            <div className="flex min-w-0 max-w-[min(280px,45vw)] flex-col gap-0.5">
              <span className="truncate font-medium text-foreground text-sm leading-tight tracking-tight">
                {name}
              </span>
              {presentation ? (
                <span className="truncate text-muted-foreground text-xs leading-snug">{presentation}</span>
              ) : null}
            </div>
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
        header: "Inventario",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">{formatInventoryLabel(row.original.stockQuantity)}</span>
        ),
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
          );
        },
      },
    ],
    [categoryLabel, onCatalogChanged],
  );

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.productId),
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {selectedCount > 0 ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm"
          role="status"
        >
          <span className="text-foreground">
            {selectedCount === 1 ? "1 producto seleccionado" : `${selectedCount} productos seleccionados`}
          </span>
          <Button disabled size="sm" type="button" variant="secondary">
            Acciones masivas (próximamente)
          </Button>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.id === "select" && "w-10 px-2",
                      header.column.id === "photo" && "w-14",
                      header.column.id === "actions" && "w-10 px-2",
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
                <TableRow data-state={row.getIsSelected() ? "selected" : undefined} key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
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
    </div>
  );
}
