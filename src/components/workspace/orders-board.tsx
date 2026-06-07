"use client";

import { memo, useCallback, useMemo, useState } from "react";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Loader2, MessageCircle, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { OrderBackorderIndicators } from "@/components/workspace/order-backorder-indicators";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrderDetailSheet } from "@/components/workspace/order-detail-sheet";
import {
  markDashboardOrderSeenViaProxy,
  updateDashboardOrderStatusViaProxy,
  type DashboardOrderListRow,
  type DashboardOrderPatch,
  type DashboardOrderStatusChangeHandler,
} from "@/lib/dashboard-orders";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import {
  findFlowItem,
  flowToBoardColumns,
  statusBadgeVariant,
  statusLabel as orderStatusLabel,
  type EffectiveStatusItem,
} from "@/lib/order-status-flow";
import { cn } from "@/lib/utils";
import {
  useSupplierTimeFormatters,
  useWorkspacePreferences,
} from "@/lib/workspace-preferences-context";

const MIN_COLUMN_WIDTH = 260;

function canDragFrom(statusKey: string): boolean {
  return statusKey !== "cancelled";
}

function canDropTo(fromKey: string, toKey: string): boolean {
  if (fromKey === toKey) return false;
  if (fromKey === "cancelled") return false;
  if (fromKey === "delivered") return toKey === "cancelled";
  return true;
}

function markDraftSeenIfNeeded(
  order: DashboardOrderListRow,
  onOrderSeen?: (orderId: string) => void,
): void {
  if (order.status !== "draft" || order.seenAt) return;
  onOrderSeen?.(order.orderId);
  void markDashboardOrderSeenViaProxy(order.orderId).catch(() => {
    /* best-effort */
  });
}

type BoardCardProps = Readonly<{
  order: DashboardOrderListRow;
  customerName: string;
  flow: EffectiveStatusItem[];
  moving: boolean;
  onOpenDetail: (orderId: string) => void;
}>;

const BoardCard = memo(function BoardCard({
  order,
  customerName,
  flow,
  moving,
  onOpenDetail,
}: BoardCardProps) {
  const { formatInstantDate, formatStoredDateOnly } = useSupplierTimeFormatters();
  const statusKey = order.effectiveStatusKey ?? order.status;
  const draggable = canDragFrom(statusKey) && !moving;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.orderId,
    data: { orderId: order.orderId, statusKey },
    disabled: !draggable,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const flowItem = findFlowItem(flow, statusKey);
  const coveragePct =
    order.matchCoverage != null ? Math.round(order.matchCoverage * 100) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm transition-shadow",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        moving && "opacity-70",
      )}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      onClick={() => onOpenDetail(order.orderId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail(order.orderId);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-muted-foreground text-xs">
            {formatOrderDisplayCode(order.orderId, order.displayCode)}
          </p>
          {order.seenAt == null && order.status === "draft" ? (
            <Badge className="mt-1" variant="secondary">
              Nuevo
            </Badge>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {moving ? <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" /> : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Más acciones"
                className="size-7"
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onOpenDetail(order.orderId)}>
                Ver detalle
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/orders/${encodeURIComponent(order.orderId)}`}>Abrir página</Link>
              </DropdownMenuItem>
              {order.conversationId ? (
                <DropdownMenuItem asChild>
                  <Link href="/whatsapp">
                    <MessageCircle aria-hidden className="mr-2 size-4" />
                    Ir al chat
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled>Ir al chat</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="mt-2 truncate font-semibold text-sm">{customerName}</p>

      <dl className="mt-2 space-y-1 text-muted-foreground text-xs">
        <div className="flex gap-1">
          <dt className="shrink-0">Entrega:</dt>
          <dd>{order.deliveryDate ? formatStoredDateOnly(order.deliveryDate) : "—"}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dt className="shrink-0">Ítems:</dt>
          <dd className="flex items-center gap-1.5">
            <span>{order.lineCount}</span>
            {coveragePct != null ? (
              <span className="text-[11px] text-muted-foreground">{coveragePct}%</span>
            ) : null}
          </dd>
        </div>
      </dl>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {order.createdAt ? `Creado ${formatInstantDate(order.createdAt)}` : "—"}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant={statusBadgeVariant(statusKey)}>
          {orderStatusLabel(flowItem, statusKey)}
        </Badge>
        <OrderBackorderIndicators
          hasBackorderRisk={order.hasBackorderRisk}
          isBackordered={order.isBackordered}
        />
      </div>
    </div>
  );
});

function ColumnOrderList({
  orders,
  customerNameById,
  flow,
  movingOrderId,
  onOpenDetail,
}: Readonly<{
  orders: DashboardOrderListRow[];
  customerNameById: ReadonlyMap<number, string>;
  flow: EffectiveStatusItem[];
  movingOrderId: string | null;
  onOpenDetail: (orderId: string) => void;
}>) {
  if (orders.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-8 text-center text-muted-foreground text-xs">
        Sin pedidos
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
      {orders.map((order) => {
        const customerName =
          customerNameById.get(order.customerId) ?? `Cliente #${order.customerId}`;
        return (
          <BoardCard
            key={order.orderId}
            customerName={customerName}
            flow={flow}
            moving={movingOrderId === order.orderId}
            order={order}
            onOpenDetail={onOpenDetail}
          />
        );
      })}
    </div>
  );
}

function BoardColumn({
  column,
  orders,
  customerNameById,
  flow,
  movingOrderId,
  onOpenDetail,
  muted,
}: Readonly<{
  column: EffectiveStatusItem;
  orders: DashboardOrderListRow[];
  customerNameById: ReadonlyMap<number, string>;
  flow: EffectiveStatusItem[];
  movingOrderId: string | null;
  onOpenDetail: (orderId: string) => void;
  muted?: boolean;
}>) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-muted/50",
        muted && "border-dashed bg-muted/35 opacity-95",
        isOver && "ring-2 ring-primary/40",
      )}
      style={{ minWidth: MIN_COLUMN_WIDTH }}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-muted/70 px-3 py-2.5">
        <h3 className="truncate font-medium text-sm">{column.label}</h3>
        <Badge variant="secondary">{orders.length}</Badge>
      </header>
      <div className="flex min-h-0 flex-1 flex-col p-2">
        <ColumnOrderList
          customerNameById={customerNameById}
          flow={flow}
          movingOrderId={movingOrderId}
          orders={orders}
          onOpenDetail={onOpenDetail}
        />
      </div>
    </section>
  );
}

export function OrdersBoard({
  orders,
  flow,
  customerNameById,
  ordersByStatus,
  onOrderStatusChange,
  onOrderSeen,
  onOrderRemoved,
}: Readonly<{
  orders: DashboardOrderListRow[];
  flow: EffectiveStatusItem[];
  customerNameById: ReadonlyMap<number, string>;
  ordersByStatus: ReadonlyMap<string, DashboardOrderListRow[]>;
  onOrderStatusChange?: DashboardOrderStatusChangeHandler;
  onOrderSeen?: (orderId: string) => void;
  onOrderRemoved?: (orderId: string) => void;
}>) {
  useWorkspacePreferences();
  const columns = useMemo(() => flowToBoardColumns(flow), [flow]);
  const [movingOrderId, setMovingOrderId] = useState<string | null>(null);
  const [activeDragOrder, setActiveDragOrder] = useState<DashboardOrderListRow | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const openDetail = useCallback(
    (orderId: string) => {
      const row = orders.find((o) => o.orderId === orderId);
      if (row) markDraftSeenIfNeeded(row, onOrderSeen);
      setDetailOrderId(orderId);
      setDetailOpen(true);
    },
    [orders, onOrderSeen],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const orderId = String(event.active.id);
      setActiveDragOrder(orders.find((o) => o.orderId === orderId) ?? null);
    },
    [orders],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragOrder(null);
      const { active, over } = event;
      if (!over) return;

      const fromKey = active.data.current?.statusKey as string | undefined;
      const toKey = String(over.id);
      const orderId = String(active.id);

      if (!fromKey || !toKey || fromKey === toKey || !canDropTo(fromKey, toKey)) return;

      const previousStatus = fromKey;
      onOrderStatusChange?.(orderId, toKey);
      setMovingOrderId(orderId);

      void updateDashboardOrderStatusViaProxy(orderId, toKey)
        .then((updated) => {
          if (updated) {
            onOrderStatusChange?.(orderId, updated.effectiveStatusKey ?? toKey, {
              displayCode: updated.displayCode,
              seenAt: updated.seenAt,
            });
          }
        })
        .catch((err) => {
          onOrderStatusChange?.(orderId, previousStatus);
          toast.error(err instanceof Error ? err.message : "No se pudo mover el pedido.");
        })
        .finally(() => {
          setMovingOrderId(null);
        });
    },
    [onOrderStatusChange],
  );

  const activeCustomerName =
    activeDragOrder != null
      ? (customerNameById.get(activeDragOrder.customerId) ??
        `Cliente #${activeDragOrder.customerId}`)
      : "";

  return (
    <>
      <DndContext
        collisionDetection={closestCorners}
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <div className="flex h-full min-h-0 flex-1 flex-col">
          <div className="flex h-full min-h-0 w-full flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden pb-2">
          {columns.map((column) => (
            <BoardColumn
              key={column.key}
              column={column}
              customerNameById={customerNameById}
              flow={flow}
              movingOrderId={movingOrderId}
              muted={column.isFloating}
              orders={ordersByStatus.get(column.key) ?? []}
              onOpenDetail={openDetail}
            />
          ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragOrder ? (
            <div className="w-[min(100%,260px)] scale-[1.02] shadow-lg">
              <BoardCard
                customerName={activeCustomerName}
                flow={flow}
                moving={false}
                order={activeDragOrder}
                onOpenDetail={() => undefined}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <OrderDetailSheet
        customerNameFallback={
          detailOrderId
            ? customerNameById.get(
                orders.find((o) => o.orderId === detailOrderId)?.customerId ?? -1,
              )
            : undefined
        }
        open={detailOpen}
        orderId={detailOrderId}
        onOpenChange={setDetailOpen}
        onOrderRemoved={onOrderRemoved}
        onOrderSeen={onOrderSeen}
        onOrderStatusChange={onOrderStatusChange}
      />
    </>
  );
}
