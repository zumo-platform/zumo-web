"use client";

import { useCallback, useMemo, useState } from "react";

import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
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
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("es", { dateStyle: "medium" });
const timeFormatter = new Intl.DateTimeFormat("es", { timeStyle: "short" });

function formatOrderDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return "—";
  }
}

function formatOrderTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return timeFormatter.format(new Date(iso));
  } catch {
    return "—";
  }
}

function formatDeliveryDate(raw: string | null): string {
  if (!raw || !raw.trim()) return "—";
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return raw.trim();
  try {
    return dateFormatter.format(new Date(t));
  } catch {
    return raw.trim();
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Borrador";
    case "pending":
      return "Pendiente";
    case "confirmed":
      return "Confirmado";
    case "in_progress":
      return "En preparación";
    case "in_route":
      return "En camino";
    case "delivered":
      return "Entregado";
    case "cancelled":
      return "Cancelado";
    default:
      return status.replaceAll("_", " ");
  }
}

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "delivered":
      return "secondary";
    case "cancelled":
      return "destructive";
    case "pending":
    case "draft":
      return "outline";
    case "confirmed":
      return "default";
    default:
      return "default";
  }
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
  showInlineEmpty = true,
  onOrderStatusChange,
  onOrderSeen,
  onOrderRemoved,
}: Readonly<{
  data: DashboardOrderListRow[];
  customerNameById: ReadonlyMap<number, string>;
  /** When false, parent renders the empty state (no duplicate row in table). */
  showInlineEmpty?: boolean;
  onOrderStatusChange?: (orderId: string, status: string, patch?: DashboardOrderPatch) => void;
  onOrderSeen?: (orderId: string) => void;
  onOrderRemoved?: (orderId: string) => void;
}>) {
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
                <Eye aria-label="Borrador visto" className="size-4 shrink-0 text-muted-foreground" />
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
          <span className="whitespace-nowrap text-sm">{formatOrderDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: "deliveryDate",
        header: "Entrega",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">{formatDeliveryDate(row.original.deliveryDate)}</span>
        ),
      },
      {
        id: "orderCreation",
        header: "Hora",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">{formatOrderTime(row.original.createdAt)}</span>
        ),
      },
      {
        id: "lineCount",
        header: "Ítems",
        cell: ({ row }) => {
          const o = row.original;
          return (
            <MatchCoverageIndicator
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
          const isPending = o.status === "pending";
          const isDraft = o.status === "draft";
          const isActing = actionOrderId === o.orderId;

          return (
            <div className="flex min-w-[9.5rem] flex-col items-start gap-1.5">
              <Badge variant={statusBadgeVariant(o.status)}>{statusLabel(o.status)}</Badge>
              {isDraft ? (
                <Button
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={isActing}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => void handleConvertFromTable(o.orderId)}
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
                  disabled={isActing}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => void handleConfirmFromTable(o.orderId)}
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
      customerNameById,
      actionOrderId,
      handleConfirmFromTable,
      handleConvertFromTable,
      openDetail,
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

  return (
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow data-state={row.getIsSelected() ? "selected" : undefined} key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
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
      </div>

      <OrderDetailSheet
        customerNameFallback={
          detailOrderId
            ? customerNameById.get(
                data.find((o) => o.orderId === detailOrderId)?.customerId ?? -1,
              )
            : undefined
        }
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
  );
}
