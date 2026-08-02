"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, MessageCircle, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { OrderBackorderIndicators } from "@/components/workspace/order-backorder-indicators";
import { MatchCoverageIndicator } from "@/components/workspace/match-coverage-indicator";
import { OrderStockReservationIndicator } from "@/components/workspace/order-stock-reservation-indicator";
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
  buildInitialColumnOrder,
  moveOrderToColumnBottom,
  persistColumnOrder,
  readPersistedColumnOrder,
  reconcileColumnOrder,
  reorderWithinColumn,
  resolveDropColumnKey,
  sortOrdersByColumnOrder,
} from "@/lib/orders-board-order";
import {
  flowToBoardColumns,
  isOrderStatusTransitionAllowed,
  resolveOrderFlowStatusKey,
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

type BoardCardContentProps = Readonly<{
  order: DashboardOrderListRow;
  customerName: string;
  flow: EffectiveStatusItem[];
  moving: boolean;
  onOpenDetail: (orderId: string) => void;
  onMoveToStatus: (orderId: string, fromKey: string, toKey: string) => void;
}>;

const BoardCardContent = memo(function BoardCardContent({
  order,
  customerName,
  flow,
  moving,
  onOpenDetail,
  onMoveToStatus,
}: BoardCardContentProps) {
  const { formatInstantDate, formatStoredDateOnly } = useSupplierTimeFormatters();
  const statusKey = resolveOrderFlowStatusKey(order);

  const moveTargets = useMemo(() => {
    return flowToBoardColumns(flow).filter(
      (column) =>
        column.key !== statusKey &&
        isOrderStatusTransitionAllowed(flow, statusKey, column.key).ok,
    );
  }, [flow, statusKey]);

  return (
    <>
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
              {moveTargets.length > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Mover a</DropdownMenuLabel>
                  {moveTargets.map((column) => (
                    <DropdownMenuItem
                      key={column.key}
                      onSelect={() => onMoveToStatus(order.orderId, statusKey, column.key)}
                    >
                      {column.label}
                    </DropdownMenuItem>
                  ))}
                </>
              ) : null}
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
            {order.matchCoverage != null ? (
              <MatchCoverageIndicator
                isTouchless={order.isTouchless}
                lineCount={order.lineCount}
                matchCoverage={order.matchCoverage}
              />
            ) : (
              <span>{order.lineCount}</span>
            )}
          </dd>
        </div>
      </dl>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {order.createdAt ? `Creado ${formatInstantDate(order.createdAt)}` : "—"}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <OrderBackorderIndicators
          hasBackorderRisk={order.hasBackorderRisk}
          isBackordered={order.isBackordered}
        />
        <OrderStockReservationIndicator
          hasHeldStockReservation={order.hasHeldStockReservation}
          heldReservedUnits={order.heldReservedUnits}
        />
      </div>
    </>
  );
});

const SortableBoardCard = memo(function SortableBoardCard({
  order,
  columnKey,
  customerName,
  flow,
  moving,
  onOpenDetail,
  onMoveToStatus,
}: Readonly<{
  order: DashboardOrderListRow;
  columnKey: string;
  customerName: string;
  flow: EffectiveStatusItem[];
  moving: boolean;
  onOpenDetail: (orderId: string) => void;
  onMoveToStatus: (orderId: string, fromKey: string, toKey: string) => void;
}>) {
  const statusKey = resolveOrderFlowStatusKey(order);
  const draggable = canDragFrom(statusKey) && !moving;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: order.orderId,
    data: { orderId: order.orderId, statusKey: columnKey },
    disabled: !draggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
      <BoardCardContent
        customerName={customerName}
        flow={flow}
        moving={moving}
        order={order}
        onMoveToStatus={onMoveToStatus}
        onOpenDetail={onOpenDetail}
      />
    </div>
  );
});

function ColumnOrderList({
  columnKey,
  orders,
  customerNameById,
  flow,
  movingOrderId,
  onOpenDetail,
  onMoveToStatus,
}: Readonly<{
  columnKey: string;
  orders: DashboardOrderListRow[];
  customerNameById: ReadonlyMap<number, string>;
  flow: EffectiveStatusItem[];
  movingOrderId: string | null;
  onOpenDetail: (orderId: string) => void;
  onMoveToStatus: (orderId: string, fromKey: string, toKey: string) => void;
}>) {
  const orderIds = useMemo(() => orders.map((o) => o.orderId), [orders]);

  if (orders.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-8 text-center text-muted-foreground text-xs">
        Sin pedidos
      </div>
    );
  }

  return (
    <SortableContext items={orderIds} strategy={verticalListSortingStrategy}>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
        {orders.map((order) => {
          const customerName =
            customerNameById.get(order.customerId) ?? `Cliente #${order.customerId}`;
          return (
            <SortableBoardCard
              key={order.orderId}
              columnKey={columnKey}
              customerName={customerName}
              flow={flow}
              moving={movingOrderId === order.orderId}
              order={order}
              onMoveToStatus={onMoveToStatus}
              onOpenDetail={onOpenDetail}
            />
          );
        })}
      </div>
    </SortableContext>
  );
}

function BoardColumn({
  column,
  orders,
  customerNameById,
  flow,
  movingOrderId,
  onOpenDetail,
  onMoveToStatus,
  muted,
}: Readonly<{
  column: EffectiveStatusItem;
  orders: DashboardOrderListRow[];
  customerNameById: ReadonlyMap<number, string>;
  flow: EffectiveStatusItem[];
  movingOrderId: string | null;
  onOpenDetail: (orderId: string) => void;
  onMoveToStatus: (orderId: string, fromKey: string, toKey: string) => void;
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
          columnKey={column.key}
          customerNameById={customerNameById}
          flow={flow}
          movingOrderId={movingOrderId}
          orders={orders}
          onMoveToStatus={onMoveToStatus}
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
  visibleColumnKeys,
  onOrderStatusChange,
  onOrderSeen,
  onOrderRemoved,
}: Readonly<{
  orders: DashboardOrderListRow[];
  flow: EffectiveStatusItem[];
  customerNameById: ReadonlyMap<number, string>;
  ordersByStatus: ReadonlyMap<string, DashboardOrderListRow[]>;
  visibleColumnKeys?: readonly string[];
  onOrderStatusChange?: DashboardOrderStatusChangeHandler;
  onOrderSeen?: (orderId: string) => void;
  onOrderRemoved?: (orderId: string) => void;
}>) {
  useWorkspacePreferences();
  const columns = useMemo(() => {
    const all = flowToBoardColumns(flow);
    if (!visibleColumnKeys || visibleColumnKeys.length === 0) return all;
    const allowed = new Set(visibleColumnKeys);
    return all.filter((column) => allowed.has(column.key));
  }, [flow, visibleColumnKeys]);

  const columnKeys = useMemo(() => columns.map((column) => column.key), [columns]);
  const columnKeySet = useMemo(() => new Set(columnKeys), [columnKeys]);

  const [columnOrder, setColumnOrder] = useState<Record<string, string[]>>(() =>
    buildInitialColumnOrder(columnKeys, ordersByStatus, readPersistedColumnOrder()),
  );

  const orderIdsByColumn = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const key of columnKeys) {
      map.set(key, (ordersByStatus.get(key) ?? []).map((o) => o.orderId));
    }
    return map;
  }, [columnKeys, ordersByStatus]);

  useEffect(() => {
    setColumnOrder((prev) => {
      const next = reconcileColumnOrder(prev, columnKeys, orderIdsByColumn);
      persistColumnOrder(next);
      return next;
    });
  }, [columnKeys, orderIdsByColumn]);

  const orderedOrdersByStatus = useMemo(() => {
    const map = new Map<string, DashboardOrderListRow[]>();
    for (const key of columnKeys) {
      const columnOrders = ordersByStatus.get(key) ?? [];
      const ids = columnOrder[key] ?? columnOrders.map((o) => o.orderId);
      map.set(key, sortOrdersByColumnOrder(columnOrders, ids));
    }
    return map;
  }, [columnKeys, columnOrder, ordersByStatus]);

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

  const applyStatusTransition = useCallback(
    (orderId: string, fromKey: string, toKey: string) => {
      const check = isOrderStatusTransitionAllowed(flow, fromKey, toKey);
      if (!check.ok) {
        toast.error(check.reason ?? "Transición no permitida.");
        return;
      }

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
          onOrderStatusChange?.(orderId, fromKey);
          setColumnOrder((prev) => {
            const next = moveOrderToColumnBottom(prev, orderId, toKey, fromKey);
            persistColumnOrder(next);
            return next;
          });
          toast.error(err instanceof Error ? err.message : "No se pudo mover el pedido.");
        })
        .finally(() => {
          setMovingOrderId(null);
        });
    },
    [flow, onOrderStatusChange],
  );

  const moveToStatus = useCallback(
    (orderId: string, fromKey: string, toKey: string) => {
      if (fromKey === toKey) return;

      setColumnOrder((prev) => {
        const next = moveOrderToColumnBottom(prev, orderId, fromKey, toKey);
        persistColumnOrder(next);
        return next;
      });
      applyStatusTransition(orderId, fromKey, toKey);
    },
    [applyStatusTransition],
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
      const orderId = String(active.id);
      const overId = String(over.id);
      const toKey = resolveDropColumnKey(
        overId,
        over.data.current?.statusKey as string | undefined,
        columnKeySet,
        columnOrder,
      );

      if (!fromKey || !toKey) return;

      if (fromKey === toKey) {
        if (columnKeySet.has(overId) || overId === orderId) return;

        setColumnOrder((prev) => {
          const next = reorderWithinColumn(prev, fromKey, orderId, overId);
          if (!next) return prev;
          persistColumnOrder(next);
          return next;
        });
        return;
      }

      moveToStatus(orderId, fromKey, toKey);
    },
    [columnKeySet, columnOrder, moveToStatus],
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
                orders={orderedOrdersByStatus.get(column.key) ?? []}
                onMoveToStatus={moveToStatus}
                onOpenDetail={openDetail}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragOrder ? (
            <div className="w-[min(100%,260px)] scale-[1.02] rounded-lg border bg-card p-3 shadow-lg">
              <BoardCardContent
                customerName={activeCustomerName}
                flow={flow}
                moving={false}
                order={activeDragOrder}
                onMoveToStatus={() => undefined}
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
