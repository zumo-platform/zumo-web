"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckCircle2, Eye, Loader2, MessageCircle, MoreHorizontal, Monitor } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MatchCoverageIndicator } from "@/components/workspace/match-coverage-indicator";
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
import {
  useSupplierTimeFormatters,
  useWorkspacePreferences,
} from "@/lib/workspace-preferences-context";

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
  const { formatInstantDate, formatInstantTime, formatStoredDateOnly } =
    useSupplierTimeFormatters();
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
        await confirmDashboardOrderViaProxy(orderId);
        toast.success("Pedido confirmado");
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
        header: "Fecha",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {formatInstantDate(row.original.createdAt)}
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
        id: "orderCreation",
        header: "Hora",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {formatInstantTime(row.original.createdAt)}
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
              <Badge
                className={cn(retired && "opacity-60")}
                variant={statusBadgeVariant(effectiveKey)}
              >
                {label}
                {retired ? " (retirado)" : ""}
              </Badge>
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
                  variant="outline"
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
          const hasWa = Boolean(row.original.conversationId);
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
      formatInstantDate,
      formatInstantTime,
      formatStoredDateOnly,
      handleConfirmFromTable,
      handleConvertFromTable,
      openDetail,
      timeZone,
      flow,
    ],
  );

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.orderId,
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const rows = table.getRowModel().rows;
  const useVirtual = rows.length >= 50;
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 52;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    enabled: useVirtual,
  });

  const virtualRows = useVirtual ? rowVirtualizer.getVirtualItems() : null;
  const paddingTop = virtualRows && virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const paddingBottom =
    virtualRows && virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1]!.end
      : 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
      {selectedCount > 0 ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm"
          role="status"
        >
          <span className="text-foreground">
            {selectedCount === 1 ? "1 pedido seleccionado" : `${selectedCount} pedidos seleccionados`}
          </span>
          <Button disabled size="sm" type="button" variant="secondary">
            Edición masiva (próximamente)
          </Button>
        </div>
      ) : null}

      <div
        ref={tableContainerRef}
        className={cn("rounded-lg border bg-card shadow-sm", useVirtual && "max-h-[min(70vh,720px)] overflow-auto")}
      >
        <Table>
          <TableHeader className={useVirtual ? "sticky top-0 z-10 bg-card" : undefined}>
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
              useVirtual && virtualRows ? (
                <>
                  {paddingTop > 0 ? (
                    <TableRow aria-hidden>
                      <TableCell colSpan={columns.length} style={{ height: paddingTop, padding: 0 }} />
                    </TableRow>
                  ) : null}
                  {virtualRows.map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    if (!row) return null;
                    return (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        data-state={row.getIsSelected() ? "selected" : undefined}
                        style={{ height: ROW_HEIGHT }}
                        onClick={() => openDetail(row.original.orderId)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                  {paddingBottom > 0 ? (
                    <TableRow aria-hidden>
                      <TableCell colSpan={columns.length} style={{ height: paddingBottom, padding: 0 }} />
                    </TableRow>
                  ) : null}
                </>
              ) : (
                rows.map((row) => (
                  <TableRow
                    className="cursor-pointer"
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    key={row.id}
                    onClick={() => openDetail(row.original.orderId)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              )
            ) : showInlineEmpty ? (
              <TableRow>
                <TableCell className="h-28 text-center text-muted-foreground text-sm" colSpan={columns.length}>
                  Todavía no hay pedidos en esta lista.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
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
