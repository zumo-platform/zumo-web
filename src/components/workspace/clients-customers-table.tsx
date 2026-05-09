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
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
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

const PAGE_SIZES = [10, 30, 50, 100] as const;

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
        cell: ({ row }) => <CellText title={row.original.name}>{row.original.name}</CellText>,
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
              <DropdownMenuItem
                onSelect={() =>
                  toast.message("Ver detalle del cliente", {
                    description: `Próximamente (ID ${row.original.customerId}).`,
                  })
                }
              >
                Ver detalle
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  toast.message("Editar cliente", {
                    description: "Próximamente.",
                  })
                }
              >
                Editar
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
    [],
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
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {selectedCount > 0 ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm"
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

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={header.column.id === "actions" ? "w-10 px-2" : undefined}>
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
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span className="whitespace-nowrap">Filas por página</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              table.setPageSize(Number(v));
              table.setPageIndex(0);
            }}
          >
            <SelectTrigger className="h-8 w-[4.5rem]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-center text-muted-foreground text-sm sm:text-right">
          {total === 0 ? "Sin registros" : `Mostrando ${from}–${to} de ${total}`}
        </p>

        <div className="flex items-center justify-center gap-2 sm:justify-end">
          <Button
            disabled={!table.getCanPreviousPage()}
            size="sm"
            type="button"
            variant="outline"
            aria-label="Página anterior"
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="tabular-nums text-muted-foreground text-sm">
            {pageCount === 0 ? "0 / 0" : `${pageIndex + 1} / ${pageCount}`}
          </span>
          <Button
            disabled={!table.getCanNextPage()}
            size="sm"
            type="button"
            variant="outline"
            aria-label="Página siguiente"
            onClick={() => table.nextPage()}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
