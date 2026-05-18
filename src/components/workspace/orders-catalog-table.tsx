"use client";

import { useCallback, useMemo, useState } from "react";

import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CheckCircle2, Loader2, MessageCircle, MoreHorizontal, Monitor } from "lucide-react";
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
import { OrderDetailSheet } from "@/components/workspace/order-detail-sheet";
import {
  confirmDashboardOrderViaProxy,
  type DashboardOrderListRow,
} from "@/lib/dashboard-orders";
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
    default:
      return "default";
  }
}

function shortenOrderId(orderId: string): string {
  if (orderId.length <= 14) return orderId;
  return `${orderId.slice(0, 10)}…${orderId.slice(-4)}`;
}

export function OrdersCatalogTable({
  data,
  customerNameById,
  showInlineEmpty = true,
  onOrderStatusChange,
}: Readonly<{
  data: DashboardOrderListRow[];
  customerNameById: ReadonlyMap<number, string>;
  /** When false, parent renders the empty state (no duplicate row in table). */
  showInlineEmpty?: boolean;
  onOrderStatusChange?: (orderId: string, status: string) => void;
}>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  const openDetail = useCallback((orderId: string) => {
    setDetailOrderId(orderId);
    setDetailOpen(true);
  }, []);

  const handleConfirmFromTable = useCallback(
    async (orderId: string) => {
      setConfirmingOrderId(orderId);
      try {
        await confirmDashboardOrderViaProxy(orderId);
        toast.success("Pedido confirmado");
        onOrderStatusChange?.(orderId, "in_progress");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo confirmar el pedido.");
      } finally {
        setConfirmingOrderId(null);
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
          const id = row.original.orderId;
          return (
            <span className="block max-w-[min(200px,32vw)] truncate font-mono text-sm" title={id}>
              {shortenOrderId(id)}
            </span>
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
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">{row.original.lineCount.toLocaleString("es")}</span>
        ),
      },
      {
        id: "status",
        header: "Estado",
        cell: ({ row }) => {
          const o = row.original;
          const isPending = o.status === "pending";
          const isConfirming = confirmingOrderId === o.orderId;

          return (
            <div className="flex min-w-[9.5rem] flex-col items-start gap-1.5">
              <Badge variant={statusBadgeVariant(o.status)}>{statusLabel(o.status)}</Badge>
              {isPending ? (
                <Button
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={isConfirming}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => void handleConfirmFromTable(o.orderId)}
                >
                  {isConfirming ? (
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
                {o.conversationId ? (
                  <DropdownMenuItem asChild>
                    <Link href="/inbox">Abrir en inbox</Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>Abrir en inbox</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [customerNameById, confirmingOrderId, handleConfirmFromTable, openDetail],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table useReactTable
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
