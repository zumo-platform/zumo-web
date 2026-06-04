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
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FREQUENCY_LABEL,
  STATUS_FILTER_OPTIONS,
  STATUS_LABEL,
  TREND_LABEL,
  formatExpectedOrder,
  pastelColorForLabel,
  statusBadgeClassName,
  trendGlyph,
  type CustomerStatus,
} from "@/lib/customer-hub";
import {
  addCustomerLabelViaProxy,
  createCustomerTaskViaProxy,
  removeCustomerLabelViaProxy,
} from "@/lib/customer-hub-api";
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

export function ClientsCustomersTable({
  data,
  onMutated,
}: Readonly<{
  data: DashboardCustomerRow[];
  onMutated?: () => void;
}>) {
  const { formatInstantDateTime } = useSupplierTimeFormatters();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">("all");
  const [hubDialog, setHubDialog] = useState<
    | { kind: "label" | "task"; customerId: number; customerName: string }
    | null
  >(null);
  const [hubDraft, setHubDraft] = useState("");
  const [hubSaving, setHubSaving] = useState(false);
  const [deletingLabelId, setDeletingLabelId] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (statusFilter === "all") return data;
    return data.filter((row) => row.status === statusFilter);
  }, [data, statusFilter]);

  const allKnownLabels = useMemo(() => {
    const byLabel = new Map<string, { label: string; color: string }>();
    for (const row of data) {
      for (const l of row.labels) {
        const key = l.label.trim().toLowerCase();
        if (!key) continue;
        const color = l.color?.trim() || pastelColorForLabel(l.label);
        if (!byLabel.has(key)) byLabel.set(key, { label: l.label.trim(), color });
      }
    }
    return [...byLabel.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [data]);

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
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant={statusBadgeClassName(row.original.status)}>
            {STATUS_LABEL[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: "expectedOrderDate",
        header: "Pr\u00f3ximo pedido",
        cell: ({ row }) => {
          const label = formatExpectedOrder(
            row.original.expectedOrderDate,
            row.original.daysOverdue,
          );
          return (
            <CellText className="whitespace-nowrap tabular-nums" title={label}>
              {label}
            </CellText>
          );
        },
      },
      {
        accessorKey: "basketTrend",
        header: "Tendencia",
        cell: ({ row }) => {
          const { glyph, className } = trendGlyph(row.original.basketTrend);
          const label = TREND_LABEL[row.original.basketTrend];
          return (
            <span className="inline-flex max-w-[min(220px,32vw)] items-center gap-1">
              <span aria-hidden className={className}>
                {glyph}
              </span>
              <span className="truncate text-xs text-muted-foreground" title={label}>
                {label}
              </span>
            </span>
          );
        },
      },
      {
        accessorKey: "frequency",
        header: "Frecuencia",
        cell: ({ row }) => (
          <CellText>{FREQUENCY_LABEL[row.original.frequency]}</CellText>
        ),
      },
      {
        accessorKey: "labels",
        header: "Etiquetas",
        cell: ({ row }) => {
          const labels = row.original.labels;
          const openAddLabel = () => {
            setHubDraft("");
            setHubDialog({
              kind: "label",
              customerId: row.original.customerId,
              customerName: row.original.name,
            });
          };

          if (labels.length === 0) {
            return (
              <button
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                type="button"
                onClick={openAddLabel}
              >
                + Agregar
              </button>
            );
          }

          return (
            <div className="flex max-w-[min(220px,32vw)] flex-wrap items-center gap-2">
              {labels.map((label) => (
                <Badge
                  key={label.labelId}
                  className="gap-1 rounded-full border border-transparent px-3 py-1 text-foreground"
                  style={{ backgroundColor: label.color?.trim() || pastelColorForLabel(label.label) }}
                  variant="secondary"
                >
                  <span className="truncate">{label.label}</span>
                  <button
                    aria-label={`Eliminar etiqueta ${label.label}`}
                    className="ml-1 inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground disabled:opacity-50"
                    disabled={deletingLabelId === label.labelId}
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeletingLabelId(label.labelId);
                      try {
                        const ok = await removeCustomerLabelViaProxy(
                          row.original.customerId,
                          label.labelId,
                        );
                        if (!ok) throw new Error("No se pudo eliminar la etiqueta.");
                        toast.success("Etiqueta eliminada.");
                        onMutated?.();
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "No se pudo eliminar la etiqueta.",
                        );
                      } finally {
                        setDeletingLabelId(null);
                      }
                    }}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              <button
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                type="button"
                onClick={openAddLabel}
              >
                + Agregar
              </button>
            </div>
          );
        },
      },
      {
        accessorKey: "openTaskCount",
        header: "Tareas",
        cell: ({ row }) => {
          const task = row.original.openTasks[0];
          if (!task) return <CellText>{"\u2014"}</CellText>;
          return (
            <div className="max-w-[min(220px,32vw)] text-xs">
              <div className="truncate font-medium" title={task.title}>
                {task.title}
              </div>
              {row.original.openTaskCount > 1 ? (
                <div className="text-muted-foreground">
                  +{row.original.openTaskCount - 1} m\u00e1s
                </div>
              ) : null}
            </div>
          );
        },
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
                onSelect={() => {
                  setHubDraft("");
                  setHubDialog({
                    kind: "label",
                    customerId: row.original.customerId,
                    customerName: row.original.name,
                  });
                }}
              >
                Agregar etiqueta
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setHubDraft("");
                  setHubDialog({
                    kind: "task",
                    customerId: row.original.customerId,
                    customerName: row.original.name,
                  });
                }}
              >
                Agregar tarea
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
    [deletingLabelId, formatInstantDateTime, onMutated],
  );

   
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
    getRowId: (row) => String(row.customerId),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const total = filteredData.length;

  async function submitHubDialog() {
    if (!hubDialog) return;
    const trimmed = hubDraft.trim();
    if (!trimmed) return;
    setHubSaving(true);
    try {
      if (hubDialog.kind === "label") {
        const row = data.find((r) => r.customerId === hubDialog.customerId);
        const exists = row?.labels.some((l) => l.label.trim().toLowerCase() === trimmed.toLowerCase());
        if (exists) {
          toast.message("Etiqueta ya asignada.");
          return;
        }
        const color = pastelColorForLabel(trimmed);
        await addCustomerLabelViaProxy(hubDialog.customerId, trimmed, color);
      } else {
        const taskId = await createCustomerTaskViaProxy(hubDialog.customerId, { title: trimmed });
        if (!taskId) throw new Error("No se pudo guardar la tarea.");
      }
      toast.success(hubDialog.kind === "label" ? "Etiqueta agregada." : "Tarea creada.");
      setHubDialog(null);
      setHubDraft("");
      onMutated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setHubSaving(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            size="sm"
            type="button"
            variant={statusFilter === option.value ? "default" : "outline"}
            onClick={() => setStatusFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

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

      <Dialog
        open={hubDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setHubDialog(null);
            setHubDraft("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hubDialog?.kind === "label" ? "Agregar etiqueta" : "Agregar tarea"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="hub-dialog-input">
              {hubDialog?.kind === "label" ? "Etiqueta" : "Título de la tarea"}
            </Label>
            <Input
              id="hub-dialog-input"
              placeholder={
                hubDialog?.kind === "label"
                  ? "Ej. Ruta norte"
                  : "Ej. Llamar para confirmar pedido"
              }
              value={hubDraft}
              onChange={(e) => setHubDraft(e.target.value)}
            />
            {hubDialog?.kind === "label" ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {(() => {
                  const customerRow = data.find((r) => r.customerId === hubDialog.customerId);
                  const assigned = new Set(
                    (customerRow?.labels ?? []).map((l) => l.label.trim().toLowerCase()),
                  );
                  return allKnownLabels.slice(0, 12).map((tag) => {
                    const disabled = assigned.has(tag.label.trim().toLowerCase());
                    return (
                      <button
                        key={tag.label}
                        className="rounded-full border border-transparent px-3 py-1 text-sm text-foreground disabled:opacity-40"
                        disabled={disabled}
                        style={{ backgroundColor: tag.color }}
                        type="button"
                        onClick={() => {
                          setHubDraft(tag.label);
                        }}
                      >
                        {tag.label}
                      </button>
                    );
                  });
                })()}
              </div>
            ) : null}
            {hubDialog ? (
              <p className="text-muted-foreground text-xs">Cliente: {hubDialog.customerName}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              disabled={hubSaving}
              type="button"
              variant="outline"
              onClick={() => setHubDialog(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={hubSaving || !hubDraft.trim()}
              type="button"
              onClick={() => void submitHubDialog()}
            >
              {hubSaving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
