"use client";

import { useMemo, useState } from "react";

import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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
import type { DashboardCustomerRow } from "@/lib/dashboard-customers";
import { cn } from "@/lib/utils";
import { workspaceTableCardClassName } from "@/lib/workspace-layout";
import { useSupplierTimeFormatters } from "@/lib/workspace-preferences-context";

const PAGE_SIZES = [10, 30, 50, 100] as const;

function formatLatestOrderLabel(
  displayCode: string | null,
  createdAt: string | null,
  formatInstantDateTime: (iso: string | null | undefined) => string,
): string {
  const when = formatInstantDateTime(createdAt);
  if (when === "—") return "—";
  if (displayCode) return `${displayCode} · ${when}`;
  return when;
}

function CellText({
  className,
  children,
  title,
}: Readonly<{ className?: string; children: string; title?: string }>) {
  return (
    <span className={cn("block truncate", className)} title={title ?? children}>
      {children}
    </span>
  );
}

export function ClientsCustomersTable({ data }: Readonly<{ data: DashboardCustomerRow[] }>) {
  const { formatInstantDateTime } = useSupplierTimeFormatters();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columns = useMemo<ColumnDef<DashboardCustomerRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Seleccionar todas las filas visibles"
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
        accessorKey: "name",
        header: "Nombre cliente",
        cell: ({ row }) => (
          <Link
            className="block truncate font-medium hover:underline"
            href={`/clients/${row.original.customerId}`}
            title={row.original.name}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "clientCode",
        header: "Código",
        cell: ({ row }) => (
          <CellText className="tabular-nums">{row.original.clientCode ?? "—"}</CellText>
        ),
      },
      {
        accessorKey: "location",
        header: "Ubicación",
        cell: ({ row }) => (
          <CellText className="max-w-[min(280px,40vw)]" title={row.original.location}>
            {row.original.location}
          </CellText>
        ),
      },
      {
        accessorKey: "sellerAssigned",
        header: "Vendedor asignado",
        cell: ({ row }) => (
          <CellText title={row.original.sellerAssigned ?? "Sin asignar"}>
            {row.original.sellerAssigned ?? "Sin asignar"}
          </CellText>
        ),
      },
      {
        id: "latestOrder",
        header: "Último pedido",
        cell: ({ row }) => {
          const label = formatLatestOrderLabel(
            row.original.latestOrderDisplayCode,
            row.original.latestOrderAt,
            formatInstantDateTime,
          );
          return (
            <CellText className="whitespace-nowrap tabular-nums" title={label}>
              {label}
            </CellText>
          );
        },
      },
      {
        accessorKey: "orderCount",
        header: "Total pedidos",
        cell: ({ row }) => (
          <CellText className="tabular-nums">{String(row.original.orderCount)}</CellText>
        ),
      },
      {
        accessorKey: "contactPhone",
        header: "Teléfono contacto",
        cell: ({ row }) => (
          <CellText className="tabular-nums">{row.original.contactPhone}</CellText>
        ),
      },
      {
        accessorKey: "email",
        header: "Correo",
        cell: ({ row }) => (
          <CellText className="max-w-[min(220px,32vw)]" title={row.original.email ?? ""}>
            {row.original.email ?? "—"}
          </CellText>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={`Más opciones para ${row.original.name}`}
                className="size-8"
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/clients/${row.original.customerId}`}>Ver detalle</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/clients/${row.original.customerId}`}>Editar</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() =>
                  toast.message("Eliminar cliente", {
                    description: "Próximamente.",
                  })
                }
              >
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [formatInstantDateTime],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table useReactTable
  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(row.customerId),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const total = data.length;

  return (
    <div className="w-full">
      {selectedCount > 0 ? (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm"
          role="status"
        >
          <span className="text-foreground">
            {selectedCount === 1 ? "1 cliente seleccionado" : `${selectedCount} clientes seleccionados`}
          </span>
          <Button disabled size="sm" type="button" variant="secondary">
            Acciones masivas (próximamente)
          </Button>
        </div>
      ) : null}

      <div className={workspaceTableCardClassName}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.id === "select" && "w-10 px-2",
                      header.column.id === "actions" && "w-10 px-2",
                      header.column.id === "name" && "min-w-[10rem]",
                      header.column.id === "location" && "min-w-[8rem]",
                      header.column.id === "email" && "min-w-[8rem]",
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
                  No hay clientes para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {selectedCount} de {total} fila{total === 1 ? "" : "s"} seleccionada
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
                <SelectTrigger className="h-8 w-[4.5rem]" size="sm">
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
    </div>
  );
}
