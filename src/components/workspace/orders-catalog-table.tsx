"use client";

import { useCallback, useMemo, useState } from "react";

import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Monitor,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { OrderBackorderIndicators } from "@/components/workspace/order-backorder-indicators";
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
import { MatchCoverageIndicator, TouchlessBolt } from "@/components/workspace/match-coverage-indicator";
import { OrderDetailSheet } from "@/components/workspace/order-detail-sheet";
import {
  confirmDashboardOrderViaProxy,
  convertDashboardOrderViaProxy,
  markDashboardOrderSeenViaProxy,
  type DashboardOrderPatch,
  type DashboardOrderListRow,
} from "@/lib/dashboard-orders";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import {
  findFlowItem,
  statusBadgeVariant,
  statusLabel as orderStatusLabel,
  type EffectiveStatusItem,
} from "@/lib/order-status-flow";
import { isValidDeliveryDateInput } from "@/lib/supplier-timezone";
import { cn } from "@/lib/utils";
import { workspaceTableCardClassName } from "@/lib/workspace-layout";
import {
  useSupplierTimeFormatters,
  useWorkspacePreferences,
} from "@/lib/workspace-preferences-context";

const PAGE_SIZES = [20, 50, 100] as const;

function orderHasValidDeliveryDate(
  deliveryDate: string | null,
  timeZone: string,
): boolean {
  return isValidDeliveryDateInput(deliveryDate, timeZone);
}

function markDraftSeenIfNeeded(
  order: DashboardOrderListRow,
  onOrderSeen?: (orderId: string) => void,
): void {
  if (order.status !== "draft" || order.seenAt) return;
  onOrderSeen?.(order.orderId);
  void markDashboardOrderSeenViaProxy(order.orderId).catch(() => {
    /* best-effort — optimistic update already applied */
  });
}

export function OrdersCatalogTable({
  data,
  customerNameById,
  flow = [],
  showInlineEmpty = true,
  onOrderStatusChange,
  onOrderSeen,
  onOrderRemoved,
}: Readonly<{
  data: DashboardOrderListRow[];
  customerNameById: ReadonlyMap<number, string>;
  flow?: EffectiveStatusItem[];
  /** When false, parent renders the empty state (no duplicate row in table). */
  showInlineEmpty?: boolean;
  onOrderStatusChange?: (orderId: string, status: string, patch?: DashboardOrderPatch) => void;
  onOrderSeen?: (orderId: string) => void;
  onOrderRemoved?: (orderId: string) => void;
}>) {
  const { timeZone, autoCommitEnabled } = useWorkspacePreferences();
  const { formatInstantCreatedAt, formatStoredDateOnly } = useSupplierTimeFormatters();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  const openDetail = useCallback(
    (orderId: string) => {
      const row = data.find((o) => o.orderId === orderId);
      if (row) markDraftSeenIfNeeded(row, onOrderSeen);
      setDetailOrderId(orderId);
      setDetailOpen(true);
    },
    [data, onOrderSeen],
  );

  const handleConfirmFromTable = useCallback(
    async (orderId: string) => {
      setActionOrderId(orderId);
      try {
        const result = await confirmDashboardOrderViaProxy(orderId);
        if (result.isBackordered) {
          toast.success(
            "Pedido confirmado. Algunos productos quedaron en Pendiente (backorder).",
          );
        } else {
          toast.success("Pedido confirmado");
        }
        onOrderStatusChange?.(orderId, "confirmed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo confirmar el pedido.");
      } finally {
        setActionOrderId(null);
      }
    },
    [onOrderStatusChange],
  );

  const handleConvertFromTable = useCallback(
    async (orderId: string) => {
      setActionOrderId(orderId);
      try {
        const updated = await convertDashboardOrderViaProxy(orderId);
        toast.success("Borrador convertido en pedido");
        onOrderStatusChange?.(orderId, "pending", {
          displayCode: updated?.displayCode ?? null,
          expiresAt: null,
          isExpired: false,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo convertir el borrador.");
      } finally {
        setActionOrderId(null);
      }
    },
    [onOrderStatusChange],
  );

  const columns = useMemo<ColumnDef<DashboardOrderListRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Seleccionar todos los pedidos"
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
            aria-label={`Seleccionar pedido ${row.original.orderId}`}
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(event) => event.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "orderId",
        header: "Código",
        cell: ({ row }) => {
          const o = row.original;
          const code = formatOrderDisplayCode(o.orderId, o.displayCode);
          const unreadDraft = o.status === "draft" && !o.seenAt;
          return (
            <div className="flex max-w-[min(200px,32vw)] items-center gap-1.5">
              <span
                className={cn(
                  "truncate font-mono text-sm",
                  unreadDraft && "font-semibold text-foreground",
                )}
                title={o.displayCode ?? o.orderId}
              >
                {code}
              </span>
              {o.status === "draft" && o.seenAt ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex shrink-0">
                      <Eye aria-hidden className="size-4 text-muted-foreground" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Borrador abierto por un vendedor. Ya no aparece en negrita como pendiente de
                    revisión.
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "customerName",
        header: "Cliente",
        cell: ({ row }) => {
          const name =
            customerNameById.get(row.original.customerId) ?? `Cliente #${row.original.customerId}`;
          return (
            <span className="block max-w-[min(220px,36vw)] truncate text-sm" title={name}>
              {name}
            </span>
          );
        },
      },
      {
        id: "orderCreated",
        header: "Creado",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {formatInstantCreatedAt(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "deliveryDate",
        header: "Entrega",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {formatStoredDateOnly(row.original.deliveryDate)}
          </span>
        ),
      },
      {
        id: "lineCount",
        header: "Ítems",
        cell: ({ row }) => {
          const o = row.original;
          return (
            <MatchCoverageIndicator
              autoCommitEnabled={autoCommitEnabled}
              isTouchless={o.isTouchless}
              lineCount={o.lineCount}
              matchCoverage={o.matchCoverage}
            />
          );
        },
      },
      {
        id: "status",
        header: "Estado",
        cell: ({ row }) => {
          const o = row.original;
          const effectiveKey = o.effectiveStatusKey ?? o.status;
          const flowItem = findFlowItem(flow, effectiveKey);
          const isPending = effectiveKey === "pending";
          const isConfirmed = effectiveKey === "confirmed";
          const isDraft = effectiveKey === "draft";
          const isActing = actionOrderId === o.orderId;
          const hasDeliveryDate = orderHasValidDeliveryDate(o.deliveryDate, timeZone);
          const lifecycleTitle = hasDeliveryDate
            ? undefined
            : "Seleccioná una fecha de entrega válida antes de continuar.";
          const label = orderStatusLabel(flowItem, effectiveKey);
          const retired = flowItem?.retired === true;

          return (
            <div className="flex min-w-[9.5rem] flex-col items-start gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <OrderBackorderIndicators
                  hasBackorderRisk={o.hasBackorderRisk}
                  isBackordered={o.isBackordered}
                />
                {!isPending ? (
                  <>
                    {isConfirmed ? (
                      <span className={cn("text-foreground text-sm", retired && "opacity-60")}>
                        {label}
                        {retired ? " (retirado)" : ""}
                      </span>
                    ) : (
                      <Badge
                        className={cn(retired && "opacity-60")}
                        variant={statusBadgeVariant(effectiveKey)}
                      >
                        {label}
                        {retired ? " (retirado)" : ""}
                      </Badge>
                    )}
                  </>
                ) : null}
              </div>
              {isDraft ? (
                <Button
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={isActing || !hasDeliveryDate}
                  size="sm"
                  title={lifecycleTitle}
                  type="button"
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleConvertFromTable(o.orderId);
                  }}
                >
                  {isActing ? (
                    <Loader2 aria-hidden className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 aria-hidden className="size-3.5" />
                  )}
                  Convertir
                </Button>
              ) : null}
              {isPending ? (
                <Button
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={isActing || !hasDeliveryDate}
                  size="sm"
                  title={lifecycleTitle}
                  type="button"
                  variant="default"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleConfirmFromTable(o.orderId);
                  }}
                >
                  {isActing ? (
                    <Loader2 aria-hidden className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 aria-hidden className="size-3.5" />
                  )}
                  Confirmar
                </Button>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "channel",
        header: "Canal",
        cell: ({ row }) => {
          const o = row.original;
          const hasWa = Boolean(o.conversationId);
          const showTouchlessBolt = autoCommitEnabled && o.isTouchless;
          return (
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              {hasWa ? (
                <>
                  <MessageCircle aria-hidden className="size-3.5 shrink-0" />
                  <span>WhatsApp</span>
                </>
              ) : (
                <>
                  <Monitor aria-hidden className="size-3.5 shrink-0" />
                  <span>Panel</span>
                </>
              )}
              {showTouchlessBolt ? (
                <span className="ml-0.5 inline-flex" title="Confirmado automáticamente (touchless)">
                  <TouchlessBolt />
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "actions",
        enableHiding: false,
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          const o = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`Más acciones para ${o.orderId}`}
                  className="size-8"
                  onClick={(event) => event.stopPropagation()}
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
                <DropdownMenuItem onSelect={() => openDetail(o.orderId)}>
                  Ver detalle
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/orders/${encodeURIComponent(o.orderId)}`}>Abrir página</Link>
                </DropdownMenuItem>
                {o.conversationId ? (
                  <DropdownMenuItem asChild>
                    <Link href="/whatsapp">Abrir en WhatsApp</Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>Abrir en WhatsApp</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [
      autoCommitEnabled,
      customerNameById,
      actionOrderId,
      formatInstantCreatedAt,
      formatStoredDateOnly,
      handleConfirmFromTable,
      handleConvertFromTable,
      openDetail,
      timeZone,
      flow,
    ],
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
    getRowId: (row) => row.orderId,
    initialState: { pagination: { pageSize: 20, pageIndex: 0 } },
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalRows = data.length;
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const rows = table.getRowModel().rows;

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
                        header.column.id === "select" && "w-10 px-2",
                        header.column.id === "status" && "min-w-[9.5rem]",
                        header.column.id === "channel" && "w-[7.5rem]",
                        header.column.id === "actions" && "w-10 px-2",
                        header.column.id === "customerName" && "min-w-[8rem]",
                        header.column.id === "orderId" && "min-w-[7rem]",
                        (header.column.id === "lineCount" || header.column.id === "orderCreation") &&
                          "min-w-[5rem]",
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
              {rows.length ? (
                rows.map((row) => (
                  <TableRow
                    className="cursor-pointer"
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    key={row.id}
                    onClick={() => openDetail(row.original.orderId)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : showInlineEmpty ? (
                <TableRow>
                  <TableCell className="h-28 text-center text-muted-foreground text-sm" colSpan={columns.length}>
                    Todavía no hay pedidos en esta lista.
                  </TableCell>
                </TableRow>
              ) : null}
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

      <OrderDetailSheet
        customerNameFallback={
          detailOrderId
            ? customerNameById.get(
                data.find((o) => o.orderId === detailOrderId)?.customerId ?? -1,
              )
            : undefined
        }
        navigationOrderIds={data.map((o) => o.orderId)}
        onNavigateOrder={(id) => {
          openDetail(id);
        }}
        onOpenChange={setDetailOpen}
        onOrderRemoved={onOrderRemoved}
        onOrderSeen={onOrderSeen}
        onOrderStatusChange={onOrderStatusChange}
        open={detailOpen}
        orderId={detailOrderId}
        syncedStatus={
          detailOrderId ? (data.find((o) => o.orderId === detailOrderId)?.status ?? null) : null
        }
      />
      </div>
    </TooltipProvider>
  );
}
