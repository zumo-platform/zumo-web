"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fetchCustomersViaProxy, type DashboardCustomerRow } from "@/lib/dashboard-customers";
import {
  fetchDashboardOrderDetailViaProxy,
  parseDashboardOrdersEnvelope,
  type DashboardOrderListRow,
} from "@/lib/dashboard-orders";
import {
  createDeliveryNoteViaProxy,
  type CreateDeliveryNoteLineInput,
} from "@/lib/delivery-notes";
import { fetchWarehousesViaProxy, type DashboardWarehouseRow } from "@/lib/inventory";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import { cn } from "@/lib/utils";

type DockLine = Readonly<{
  orderId: string;
  orderItemId: string;
  productName: string;
  unit: string;
  qtyOrdered: number;
  qtyDelivered: number;
}>;

function shortfallQty(line: DockLine): number {
  return Math.max(0, line.qtyOrdered - line.qtyDelivered);
}

export function DeliveryNoteLoadingDock({
  open,
  onOpenChange,
  onCreated,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}>) {
  const [customers, setCustomers] = useState<DashboardCustomerRow[]>([]);
  const [warehouses, setWarehouses] = useState<DashboardWarehouseRow[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [confirmedOrders, setConfirmedOrders] = useState<DashboardOrderListRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [dockLines, setDockLines] = useState<DockLine[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [loadingLines, setLoadingLines] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [cust, wh] = await Promise.all([
        fetchCustomersViaProxy(),
        fetchWarehousesViaProxy(),
      ]);
      setCustomers(cust ?? []);
      const sellable = (wh ?? []).filter((w) => w.isActive && w.isSellable);
      setWarehouses(sellable);
      if (sellable[0] && warehouseId === null) {
        setWarehouseId(sellable[0].warehouseId);
      }
    })();
  }, [open, warehouseId]);

  useEffect(() => {
    if (!open || customerId == null) {
      setConfirmedOrders([]);
      return;
    }
    let cancelled = false;
    setLoadingOrders(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/backend/dashboard/orders?status=${encodeURIComponent("confirmed")}`,
          { credentials: "include", cache: "no-store" },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setConfirmedOrders([]);
          return;
        }
        const all = parseDashboardOrdersEnvelope(body);
        if (!cancelled) {
          setConfirmedOrders(all.filter((o) => o.customerId === customerId));
        }
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  const totalShortfall = useMemo(
    () => dockLines.reduce((sum, l) => sum + shortfallQty(l), 0),
    [dockLines],
  );

  const resetForm = useCallback(() => {
    setCustomerId(null);
    setSelectedOrderIds(new Set());
    setDockLines([]);
    setScheduledDate("");
  }, []);

  async function toggleOrder(orderId: string, checked: boolean) {
    if (checked) {
      setLoadingLines(true);
      try {
        const detail = await fetchDashboardOrderDetailViaProxy(orderId);
        if (!detail) {
          toast.error("No se pudo cargar el pedido.");
          return;
        }
        const newLines: DockLine[] = [];
        for (const line of detail.lines) {
          if (!line.orderItemId) continue;
          newLines.push({
            orderId,
            orderItemId: line.orderItemId,
            productName: line.productName,
            unit: line.unit,
            qtyOrdered: line.quantity,
            qtyDelivered: line.quantity,
          });
        }
        if (newLines.length === 0) {
          toast.error("El pedido no tiene líneas válidas.");
          return;
        }
        setSelectedOrderIds((prev) => new Set(prev).add(orderId));
        setDockLines((prev) => [...prev.filter((l) => l.orderId !== orderId), ...newLines]);
      } finally {
        setLoadingLines(false);
      }
    } else {
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      setDockLines((prev) => prev.filter((l) => l.orderId !== orderId));
    }
  }

  function updateLineQty(orderItemId: string, qtyDelivered: number) {
    setDockLines((prev) =>
      prev.map((l) =>
        l.orderItemId === orderItemId
          ? { ...l, qtyDelivered: Math.max(0, Math.min(l.qtyOrdered, qtyDelivered)) }
          : l,
      ),
    );
  }

  function removeLine(orderItemId: string) {
    setDockLines((prev) => prev.filter((l) => l.orderItemId !== orderItemId));
  }

  async function handleCreate() {
    if (warehouseId == null) {
      toast.error("Seleccioná una bodega de salida.");
      return;
    }
    const orderIds = [...selectedOrderIds];
    if (orderIds.length === 0 || dockLines.length === 0) {
      toast.error("Agregá al menos un pedido con líneas.");
      return;
    }
    const lines: CreateDeliveryNoteLineInput[] = dockLines.map((l) => ({
      orderId: l.orderId,
      orderItemId: l.orderItemId,
      qtyDelivered: l.qtyDelivered,
    }));

    setSaving(true);
    try {
      const res = await createDeliveryNoteViaProxy({
        warehouseId,
        orderIds,
        lines,
        scheduledDate: scheduledDate.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Nota de entrega creada.");
      resetForm();
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl" side="right">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Nueva nota de entrega</SheetTitle>
          <SheetDescription>
            Seleccioná un cliente y los pedidos confirmados. Ajustá las cantidades a entregar.
          </SheetDescription>
        </SheetHeader>

        <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-2">
          <div className="flex min-h-0 flex-col border-b md:border-r md:border-b-0">
            <div className="space-y-3 border-b px-4 py-3">
              <Label htmlFor="dock-customer">Cliente</Label>
              <Select
                value={customerId != null ? String(customerId) : ""}
                onValueChange={(v) => {
                  const id = Number(v);
                  setCustomerId(Number.isFinite(id) ? id : null);
                  setSelectedOrderIds(new Set());
                  setDockLines([]);
                }}
              >
                <SelectTrigger id="dock-customer">
                  <SelectValue placeholder="Seleccioná un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.customerId} value={String(c.customerId)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <p className="mb-2 font-medium text-sm">Pedidos confirmados</p>
              {customerId == null ? (
                <p className="text-muted-foreground text-sm">Elegí un cliente primero.</p>
              ) : loadingOrders ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Cargando pedidos…
                </div>
              ) : confirmedOrders.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No hay pedidos confirmados para este cliente.
                </p>
              ) : (
                <ul className="space-y-2">
                  {confirmedOrders.map((order) => {
                    const checked = selectedOrderIds.has(order.orderId);
                    return (
                      <li
                        key={order.orderId}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3",
                          checked && "border-primary/40 bg-primary/5",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={loadingLines}
                          onCheckedChange={(v) => void toggleOrder(order.orderId, v === true)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm">
                            {formatOrderDisplayCode(order.orderId, order.displayCode)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {order.lineCount}{" "}
                            {order.lineCount === 1 ? "línea" : "líneas"}
                            {order.deliveryDate ? ` · Entrega ${order.deliveryDate}` : ""}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="border-b px-4 py-3">
              <p className="font-medium text-sm">Nota en preparación</p>
              <p className="text-muted-foreground text-xs">
                {dockLines.length}{" "}
                {dockLines.length === 1 ? "línea" : "líneas"}
                {totalShortfall > 0
                  ? ` · ${String(totalShortfall)} un. como faltante`
                  : ""}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {dockLines.length === 0 ? (
                <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
                  Marcá pedidos confirmados para cargar sus líneas aquí.
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  <ul className="space-y-2">
                    {dockLines.map((line) => {
                      const short = shortfallQty(line);
                      return (
                        <motion.li
                          key={line.orderItemId}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "rounded-lg border p-3",
                            short > 0 && "border-amber-500/50 bg-amber-500/5",
                          )}
                          exit={{ opacity: 0, height: 0 }}
                          initial={{ opacity: 0, y: 8 }}
                          layout
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm">{line.productName}</p>
                              <p className="text-muted-foreground text-xs">
                                Pedido · {line.qtyOrdered} {line.unit} pedidos
                              </p>
                            </div>
                            <Button
                              aria-label="Quitar línea"
                              className="size-8 shrink-0"
                              size="icon"
                              type="button"
                              variant="ghost"
                              onClick={() => removeLine(line.orderItemId)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Label className="sr-only" htmlFor={`qty-${line.orderItemId}`}>
                              Entregar
                            </Label>
                            <Button
                              aria-label="Reducir cantidad"
                              className="size-8"
                              size="icon"
                              type="button"
                              variant="outline"
                              onClick={() =>
                                updateLineQty(line.orderItemId, line.qtyDelivered - 1)
                              }
                            >
                              <Minus className="size-3.5" />
                            </Button>
                            <Input
                              className="h-8 w-20 text-center tabular-nums"
                              id={`qty-${line.orderItemId}`}
                              min={0}
                              max={line.qtyOrdered}
                              step={0.01}
                              type="number"
                              value={line.qtyDelivered}
                              onChange={(e) =>
                                updateLineQty(line.orderItemId, Number(e.target.value))
                              }
                            />
                            <Button
                              aria-label="Aumentar cantidad"
                              className="size-8"
                              size="icon"
                              type="button"
                              variant="outline"
                              onClick={() =>
                                updateLineQty(line.orderItemId, line.qtyDelivered + 1)
                              }
                            >
                              <Plus className="size-3.5" />
                            </Button>
                            <span className="text-muted-foreground text-xs">{line.unit}</span>
                          </div>
                          {short > 0 ? (
                            <p className="mt-2 text-amber-700 text-xs dark:text-amber-400">
                              {short} {line.unit} queda{short === 1 ? "" : "n"} como faltante
                            </p>
                          ) : null}
                        </motion.li>
                      );
                    })}
                  </ul>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-end">
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dock-warehouse">Bodega de salida</Label>
              <Select
                value={warehouseId != null ? String(warehouseId) : ""}
                onValueChange={(v) => setWarehouseId(Number(v))}
              >
                <SelectTrigger id="dock-warehouse">
                  <SelectValue placeholder="Bodega" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.warehouseId} value={String(w.warehouseId)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dock-date">Fecha programada (opcional)</Label>
              <Input
                id="dock-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="w-full sm:w-auto"
            disabled={saving || dockLines.length === 0}
            type="button"
            onClick={() => void handleCreate()}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creando…
              </>
            ) : (
              "Crear nota"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
