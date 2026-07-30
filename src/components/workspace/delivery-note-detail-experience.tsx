"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { SkeletonLine } from "@/components/ui/skeleton-blocks";
import { DeliveryNoteLinesTable } from "@/components/workspace/delivery-note-lines-table";
import { OrderDetailSheet } from "@/components/workspace/order-detail-sheet";
import {
  DELIVERY_NOTE_STATUS_LABELS,
  deliveryNoteDisplayCode,
  deliveryNoteInternalId,
  fetchDeliveryNoteDetailViaProxy,
  fetchOrderMetaMap,
  updateDeliveryNoteViaProxy,
  type CreateDeliveryNoteLineInput,
  type DeliveryNoteDetail,
  type DeliveryNoteDetailLine,
} from "@/lib/delivery-notes";
import {
  fetchCustomerFullDetailViaProxy,
} from "@/lib/dashboard-customers";
import {
  fetchDashboardOrderDetailViaProxy,
  parseDashboardOrdersEnvelope,
  type DashboardOrderListRow,
} from "@/lib/dashboard-orders";
import { fetchWarehousesViaProxy, type DashboardWarehouseRow } from "@/lib/inventory";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import { normalizeWazeUrl } from "@/lib/waze-url";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspacePageHeaderClassName,
} from "@/lib/workspace-layout";

type EditLine = Readonly<{
  orderId: string;
  orderItemId: string;
  productName: string;
  unit: string;
  qtyOrdered: number;
  qtyDelivered: number;
}>;

function shortfallQty(line: EditLine): number {
  return Math.max(0, line.qtyOrdered - line.qtyDelivered);
}

function linesFromDetail(lines: readonly DeliveryNoteDetailLine[]): EditLine[] {
  return lines.map((l) => ({
    orderId: l.orderId,
    orderItemId: l.orderItemId,
    productName: l.rawText,
    unit: l.unit,
    qtyOrdered: l.qtyOrdered,
    qtyDelivered: l.qtyDelivered,
  }));
}

export function DeliveryNoteDetailExperience({
  deliveryNoteId,
}: Readonly<{ deliveryNoteId: string }>) {
  const [detail, setDetail] = useState<DeliveryNoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<DashboardWarehouseRow[]>([]);
  const [confirmedOrders, setConfirmedOrders] = useState<DashboardOrderListRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingLines, setLoadingLines] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderSheetId, setOrderSheetId] = useState<string | null>(null);
  const [orderDisplayCodes, setOrderDisplayCodes] = useState<Map<string, string | null>>(
    new Map(),
  );
  const [orderDeliveryDates, setOrderDeliveryDates] = useState<Map<string, string | null>>(
    new Map(),
  );
  const [customerWazeUrl, setCustomerWazeUrl] = useState<string | null>(null);
  const [customerClientCode, setCustomerClientCode] = useState<string | null>(null);

  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [editLines, setEditLines] = useState<EditLine[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  const isDraft = detail?.note.status === "borrador";

  const orderDeliveryDateById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const o of detail?.orders ?? []) {
      if (o.deliveryDate) map.set(o.orderId, o.deliveryDate);
    }
    for (const [orderId, date] of orderDeliveryDates) {
      if (date) map.set(orderId, date);
    }
    for (const order of confirmedOrders) {
      if (order.deliveryDate) map.set(order.orderId, order.deliveryDate);
    }
    return map;
  }, [detail?.orders, orderDeliveryDates, confirmedOrders]);

  const orderCodeById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const o of detail?.orders ?? []) map.set(o.orderId, o.displayCode);
    for (const [orderId, code] of orderDisplayCodes) {
      if (code) map.set(orderId, code);
    }
    return map;
  }, [detail?.orders, orderDisplayCodes]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await fetchDeliveryNoteDetailViaProxy(deliveryNoteId);
    if (!data) {
      setError("No se pudo cargar la nota de entrega.");
      setDetail(null);
      setLoading(false);
      return;
    }

    setDetail(data);
    setWarehouseId(data.note.warehouseId);
    setScheduledDate(data.note.scheduledDate ?? "");
    setNotes(data.note.notes ?? "");
    setEditLines(linesFromDetail(data.lines));
    setSelectedOrderIds(new Set(data.orderIds));
    setCustomerClientCode(data.note.customerClientCode);
    setCustomerWazeUrl(normalizeWazeUrl(data.note.customerWazeAddress ?? null));

    const orderIds = [
      ...new Set([
        ...data.orderIds,
        ...data.lines.map((l) => l.orderId),
      ]),
    ];
    const codesFromDetail = new Map<string, string | null>();
    const datesFromDetail = new Map<string, string | null>();
    for (const o of data.orders) {
      codesFromDetail.set(o.orderId, o.displayCode);
      datesFromDetail.set(o.orderId, o.deliveryDate);
    }
    const needsFetch = orderIds.some(
      (id) => !codesFromDetail.get(id)?.trim() || !datesFromDetail.get(id)?.trim(),
    );
    if (needsFetch) {
      const fetched = await fetchOrderMetaMap(orderIds);
      for (const [id, meta] of fetched) {
        if (meta.displayCode) codesFromDetail.set(id, meta.displayCode);
        if (meta.deliveryDate) datesFromDetail.set(id, meta.deliveryDate);
      }
    }
    setOrderDisplayCodes(codesFromDetail);
    setOrderDeliveryDates(datesFromDetail);

    if (!data.note.customerClientCode || !data.note.customerWazeAddress?.trim()) {
      const customer = await fetchCustomerFullDetailViaProxy(data.note.customerId);
      if (customer?.clientCode?.trim() && !data.note.customerClientCode) {
        setCustomerClientCode(customer.clientCode.trim());
      }
      if (!data.note.customerWazeAddress?.trim()) {
        const waze = normalizeWazeUrl(customer?.wazeAddress ?? null);
        if (waze) setCustomerWazeUrl(waze);
      }
    }

    setLoading(false);
  }, [deliveryNoteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!isDraft) return;
    void (async () => {
      const wh = await fetchWarehousesViaProxy();
      setWarehouses((wh ?? []).filter((w) => w.isActive && w.isSellable));
    })();
  }, [isDraft]);

  useEffect(() => {
    if (!isDraft || detail == null) return;
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
          setConfirmedOrders(all.filter((o) => o.customerId === detail.note.customerId));
        }
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDraft, detail]);

  const totalShortfall = useMemo(
    () => editLines.reduce((sum, l) => sum + shortfallQty(l), 0),
    [editLines],
  );

  const tableLines = useMemo(() => {
    if (isDraft) {
      return editLines.map((line) => ({
        key: line.orderItemId,
        productName: line.productName,
        orderId: line.orderId,
        qtyOrdered: line.qtyOrdered,
        qtyDelivered: line.qtyDelivered,
        unit: line.unit,
        shortfall: shortfallQty(line),
      }));
    }
    return (detail?.lines ?? []).map((line) => ({
      key: line.deliveryNoteItemId,
      productName: line.rawText,
      orderId: line.orderId,
      qtyOrdered: line.qtyOrdered,
      qtyDelivered: line.qtyDelivered,
      unit: line.unit,
      shortfall: Math.max(0, line.qtyOrdered - line.qtyDelivered),
    }));
  }, [detail?.lines, editLines, isDraft]);

  async function toggleOrder(orderId: string, checked: boolean) {
    if (checked) {
      setLoadingLines(true);
      try {
        const orderDetail = await fetchDashboardOrderDetailViaProxy(orderId);
        if (!orderDetail) {
          toast.error("No se pudo cargar el pedido.");
          return;
        }
        const newLines: EditLine[] = [];
        for (const line of orderDetail.lines) {
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
        setEditLines((prev) => [...prev.filter((l) => l.orderId !== orderId), ...newLines]);
      } finally {
        setLoadingLines(false);
      }
    } else {
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      setEditLines((prev) => prev.filter((l) => l.orderId !== orderId));
    }
  }

  function updateLineQty(orderItemId: string, qtyDelivered: number) {
    setEditLines((prev) =>
      prev.map((l) =>
        l.orderItemId === orderItemId
          ? { ...l, qtyDelivered: Math.max(0, Math.min(l.qtyOrdered, qtyDelivered)) }
          : l,
      ),
    );
  }

  function removeLine(orderItemId: string) {
    const line = editLines.find((l) => l.orderItemId === orderItemId);
    setEditLines((prev) => prev.filter((l) => l.orderItemId !== orderItemId));
    if (line) {
      const remaining = editLines.filter(
        (l) => l.orderItemId !== orderItemId && l.orderId === line.orderId,
      );
      if (remaining.length === 0) {
        setSelectedOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(line.orderId);
          return next;
        });
      }
    }
  }

  async function handleSave() {
    if (warehouseId == null) {
      toast.error("Seleccioná una bodega de salida.");
      return;
    }
    const orderIds = [...selectedOrderIds];
    if (orderIds.length === 0 || editLines.length === 0) {
      toast.error("La nota debe tener al menos un pedido con líneas.");
      return;
    }
    const lines: CreateDeliveryNoteLineInput[] = editLines.map((l) => ({
      orderId: l.orderId,
      orderItemId: l.orderItemId,
      qtyDelivered: l.qtyDelivered,
    }));

    setSaving(true);
    try {
      const res = await updateDeliveryNoteViaProxy(deliveryNoteId, {
        warehouseId,
        orderIds,
        lines,
        scheduledDate: scheduledDate.trim() || null,
        notes: notes.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Nota de entrega guardada.");
      await reload();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
        <div className={cn("border-b", workspacePageHeaderClassName)}>
          <SkeletonLine className="mb-4 h-8 w-48" />
          <SkeletonLine className="h-4 w-72" />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-background p-8">
        <p className="text-muted-foreground text-sm">{error ?? "Nota no encontrada."}</p>
        <Button asChild type="button" variant="outline">
          <Link href="/orders/delivery-notes">Volver al tablero</Link>
        </Button>
      </div>
    );
  }

  const { note } = detail;
  const noteCode = deliveryNoteDisplayCode(note);
  const internalId = deliveryNoteInternalId(note);
  const hasAssignedCode = Boolean(note.displayCode?.trim());

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <header className={cn("shrink-0 border-b bg-background", workspacePageHeaderClassName)}>
        <Button asChild className="mb-3 -ml-2 gap-1.5" size="sm" type="button" variant="ghost">
          <Link href="/orders/delivery-notes">
            <ArrowLeft aria-hidden className="size-4" />
            Volver al tablero
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="font-semibold text-2xl tracking-tight md:text-3xl"
                title={hasAssignedCode ? internalId : undefined}
              >
                {noteCode}
              </h1>
              <Badge variant="secondary">{DELIVERY_NOTE_STATUS_LABELS[note.status]}</Badge>
              {note.postedInventory ? (
                <Badge className="text-[10px]" variant="outline">
                  Stock posteado
                </Badge>
              ) : null}
            </div>

            <dl className="grid max-w-3xl gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  Cliente
                </dt>
                <dd className="font-medium">{note.customerName ?? `Cliente #${String(note.customerId)}`}</dd>
              </div>
              {customerClientCode ? (
                <div>
                  <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    Código cliente
                  </dt>
                  <dd className="font-mono">{customerClientCode}</dd>
                </div>
              ) : null}
              {note.scheduledDate ? (
                <div>
                  <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    Fecha programada
                  </dt>
                  <dd>{note.scheduledDate}</dd>
                </div>
              ) : null}
              {detail.orderIds.length > 0 ? (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    Pedidos
                  </dt>
                  <dd className="flex flex-wrap gap-2">
                    {detail.orderIds.map((orderId) => (
                      <button
                        key={orderId}
                        className="font-mono text-primary text-sm hover:underline"
                        type="button"
                        onClick={() => setOrderSheetId(orderId)}
                      >
                        {formatOrderDisplayCode(orderId, orderCodeById.get(orderId) ?? null)}
                      </button>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          {isDraft ? (
            <Button disabled={saving || editLines.length === 0} type="button" onClick={() => void handleSave()}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          ) : null}
        </div>
      </header>

      <div className={cn(workspaceContentOuterClassName, "py-6")}>
        <div className={cn(workspaceContentInnerClassName, "gap-6")}>
          {isDraft ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="detail-warehouse">Bodega de salida</Label>
                  <Select
                    value={warehouseId != null ? String(warehouseId) : ""}
                    onValueChange={(v) => setWarehouseId(Number(v))}
                  >
                    <SelectTrigger id="detail-warehouse">
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
                  <Label htmlFor="detail-date">Fecha programada</Label>
                  <Input
                    id="detail-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <Label htmlFor="detail-notes">Notas</Label>
                  <Textarea
                    id="detail-notes"
                    placeholder="Instrucciones de entrega (opcional)"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid min-h-[420px] gap-0 overflow-hidden rounded-xl border md:grid-cols-2">
                <div className="flex min-h-0 flex-col border-b md:border-r md:border-b-0">
                  <div className="border-b px-4 py-3">
                    <p className="font-medium text-sm">Pedidos confirmados</p>
                    <p className="text-muted-foreground text-xs">
                      Agregá o quitá pedidos del mismo cliente.
                    </p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                    {loadingOrders ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="size-4 animate-spin" />
                        Cargando pedidos…
                      </div>
                    ) : confirmedOrders.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No hay más pedidos confirmados para este cliente.
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
                                  {order.deliveryDate ? `Entrega ${order.deliveryDate} · ` : ""}
                                  {order.lineCount}{" "}
                                  {order.lineCount === 1 ? "línea" : "líneas"}
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
                    <p className="font-medium text-sm">Líneas a entregar</p>
                    <p className="text-muted-foreground text-xs">
                      {editLines.length} {editLines.length === 1 ? "línea" : "líneas"}
                      {totalShortfall > 0
                        ? ` · ${String(totalShortfall)} un. como faltante`
                        : ""}
                    </p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {editLines.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Seleccioná pedidos para cargar líneas.
                      </p>
                    ) : (
                      <DeliveryNoteLinesTable
                        editable
                        lines={tableLines}
                        orderCodeById={orderCodeById}
                        orderDeliveryDateById={orderDeliveryDateById}
                        wazeUrl={customerWazeUrl}
                        onOrderClick={setOrderSheetId}
                        onQtyChange={(key, qty) => updateLineQty(key, qty)}
                        onRemoveLine={removeLine}
                      />
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {note.notes?.trim() ? (
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">{note.notes}</div>
              ) : null}
              <DeliveryNoteLinesTable
                lines={tableLines}
                orderCodeById={orderCodeById}
                orderDeliveryDateById={orderDeliveryDateById}
                wazeUrl={customerWazeUrl}
                onOrderClick={setOrderSheetId}
              />
            </div>
          )}
        </div>
      </div>

      <OrderDetailSheet
        customerNameFallback={note.customerName ?? undefined}
        open={orderSheetId !== null}
        orderId={orderSheetId}
        onOpenChange={(open) => {
          if (!open) setOrderSheetId(null);
        }}
      />
    </div>
  );
}
