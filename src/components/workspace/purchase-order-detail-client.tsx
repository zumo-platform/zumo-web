"use client";

import { useCallback, useEffect, useState } from "react";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonLine } from "@/components/ui/skeleton-blocks";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PurchaseOrderReceiveDialog } from "@/components/workspace/purchase-order-receive-dialog";
import {
  cancelPurchaseOrderViaProxy,
  fetchPurchaseOrderViaProxy,
  sendPurchaseOrderViaProxy,
  type PurchaseOrderDetail,
  type PurchaseOrderStatus,
} from "@/lib/purchase-orders";
import { canMutateInventory } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspacePageHeaderClassName,
  workspaceTableCardClassName,
} from "@/lib/workspace-layout";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

function poStatusLabel(status: PurchaseOrderStatus): string {
  switch (status) {
    case "draft":
      return "Borrador";
    case "sent":
      return "Enviada";
    case "partially_received":
      return "Parcial";
    case "received":
      return "Recibida";
    case "complete":
      return "Completa";
    case "cancelled":
      return "Cancelada";
    default:
      return status;
  }
}

function poStatusVariant(
  status: PurchaseOrderStatus,
): "outline" | "secondary" | "default" | "destructive" {
  switch (status) {
    case "draft":
      return "outline";
    case "sent":
    case "received":
    case "complete":
      return "secondary";
    case "partially_received":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function PoStatusSteps({ status }: Readonly<{ status: PurchaseOrderStatus }>) {
  if (status === "cancelled") {
    return <Badge variant="destructive">Cancelada</Badge>;
  }
  const steps = [
    { key: "draft", label: "Borrador" },
    { key: "sent", label: "Enviada" },
    { key: "received", label: "Recibida" },
  ] as const;
  const activeIndex =
    status === "draft"
      ? 0
      : status === "sent"
        ? 1
        : status === "partially_received"
          ? 1
          : 2;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {steps.map((s, i) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span
            className={
              i <= activeIndex ? "font-medium text-foreground" : "text-muted-foreground"
            }
          >
            {s.label}
            {status === "partially_received" && s.key === "sent" ? " (parcial)" : ""}
          </span>
          {i < steps.length - 1 ? (
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function formatMoney(value: number | null, currency: string | null): string {
  if (value === null) return "—";
  try {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: currency ?? "CRC",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toLocaleString("es");
  }
}

export function PurchaseOrderDetailClient({ poId }: Readonly<{ poId: string }>) {
  const { role } = useWorkspacePermissions();
  const canEdit = canMutateInventory(role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivePrefillFull, setReceivePrefillFull] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchPurchaseOrderViaProxy(poId);
      if (!detail) {
        setOrder(null);
        return;
      }
      setOrder(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la orden de compra.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canSend = order != null && order.status === "draft";
  const canReceive =
    order != null &&
    (order.status === "sent" || order.status === "partially_received");
  const canCancel =
    order != null && (order.status === "draft" || order.status === "sent");

  async function confirmSend() {
    if (!order) return;
    setSendBusy(true);
    try {
      const res = await sendPurchaseOrderViaProxy(order.poId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Orden enviada al proveedor.");
      setSendOpen(false);
      await load();
    } finally {
      setSendBusy(false);
    }
  }

  async function confirmCancel() {
    if (!order) return;
    setCancelBusy(true);
    try {
      const result = await cancelPurchaseOrderViaProxy(order.poId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Orden de compra cancelada.");
      setCancelOpen(false);
      await load();
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <div className={cn("border-b", workspacePageHeaderClassName)}>
        <div
          className={cn(
            "flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
            workspaceContentInnerClassName,
          )}
        >
          <div className="min-w-0 space-y-2">
            <Button asChild className="mb-1 -ml-2 gap-1.5" size="sm" type="button" variant="ghost">
              <Link href="/compras?tab=ordenes">
                <ArrowLeft aria-hidden className="size-4" />
                Volver a órdenes
              </Link>
            </Button>
            {loading ? (
              <div aria-label="Cargando orden de compra" className="space-y-2" role="status">
                <span className="sr-only">Cargando…</span>
                <SkeletonLine className="h-6 w-48" />
                <SkeletonLine className="h-5 w-32" />
              </div>
            ) : error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : !order ? (
              <p className="text-muted-foreground text-sm">Orden de compra no encontrada.</p>
            ) : (
              <>
                <h1 className="font-semibold text-xl tracking-tight">
                  Orden{" "}
                  <span className="font-mono">{order.displayCode}</span>
                </h1>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={poStatusVariant(order.status)}>
                      {poStatusLabel(order.status)}
                    </Badge>
                    {order.status === "partially_received" || order.status === "received" ? (
                      <span className="text-muted-foreground text-sm">
                        {order.receivedPct}% recibido
                      </span>
                    ) : null}
                  </div>
                  <PoStatusSteps status={order.status} />
                </div>
              </>
            )}
          </div>
          {canEdit && order ? (
            <div className="flex flex-wrap gap-2">
              {canSend ? (
                <Button size="sm" type="button" onClick={() => setSendOpen(true)}>
                  Enviar orden
                </Button>
              ) : null}

              {canReceive ? (
                <>
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => {
                      setReceivePrefillFull(false);
                      setReceiveOpen(true);
                    }}
                  >
                    Recibir
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setReceivePrefillFull(true);
                      setReceiveOpen(true);
                    }}
                  >
                    Recibir orden completa
                  </Button>
                </>
              ) : null}

              {canCancel ? (
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setCancelOpen(true)}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className={workspaceContentOuterClassName}>
        <div className={cn("space-y-6", workspaceContentInnerClassName)}>
          {loading ? (
            <div className="space-y-3">
              <SkeletonLine className="h-24 w-full" />
              <SkeletonLine className="h-48 w-full" />
            </div>
          ) : null}

          {!loading && order ? (
            <>
              <div className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Proveedor</p>
                  <p className="font-medium">{order.vendorName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Bodega</p>
                  <p className="font-medium">{order.warehouseName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    Llegada estimada
                  </p>
                  <p>{formatDate(order.expectedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Creada</p>
                  <p>{formatDate(order.createdAt)}</p>
                </div>
                {order.notes ? (
                  <div className="sm:col-span-2">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Notas</p>
                    <p className="text-sm">{order.notes}</p>
                  </div>
                ) : null}
                <div className="sm:col-span-2 flex flex-wrap gap-6 border-t pt-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Subtotal: </span>
                    <span className="font-medium tabular-nums">
                      {formatMoney(order.subtotal, order.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Costos extra: </span>
                    <span className="font-medium tabular-nums">
                      {formatMoney(order.extraCosts, order.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-semibold tabular-nums">
                      {formatMoney(order.total, order.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={workspaceTableCardClassName}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Ordenado</TableHead>
                      <TableHead className="text-right">Recibido</TableHead>
                      <TableHead className="text-right">Pendiente</TableHead>
                      <TableHead className="text-right">Costo unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Vence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.length === 0 ? (
                      <TableRow>
                        <TableCell className="text-muted-foreground" colSpan={9}>
                          Esta orden no tiene líneas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      order.items.map((item) => (
                        <TableRow key={item.poItemId}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.sku ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.qtyOrdered.toLocaleString("es")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.qtyReceived.toLocaleString("es")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.qtyOutstanding.toLocaleString("es")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(item.unitCost, order.currency)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(item.lineSubtotal, order.currency)}
                          </TableCell>
                          <TableCell>{item.batchNumber ?? "—"}</TableCell>
                          <TableCell>{formatDate(item.expiryDate)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {order ? (
        <PurchaseOrderReceiveDialog
          items={order.items}
          open={receiveOpen}
          poId={order.poId}
          vendorName={order.vendorName}
          prefillFull={receivePrefillFull}
          onOpenChange={(open) => {
            setReceiveOpen(open);
            if (!open) setReceivePrefillFull(false);
          }}
          onReceived={() => void load()}
        />
      ) : null}

      <AlertDialog open={sendOpen} onOpenChange={(o) => !sendBusy && setSendOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar esta orden al proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Marca la orden como enviada. Después podrás registrar la mercadería recibida. Una vez
              enviada, ya no podrás editar las líneas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendBusy}>Volver</AlertDialogCancel>
            <Button disabled={sendBusy} type="button" onClick={() => void confirmSend()}>
              {sendBusy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              Enviar orden
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar orden de compra?</AlertDialogTitle>
            <AlertDialogDescription>
              La orden {order?.displayCode} quedará cancelada. No podrás recibir mercadería contra
              ella.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelBusy}>Volver</AlertDialogCancel>
            <Button
              disabled={cancelBusy}
              type="button"
              variant="destructive"
              onClick={() => void confirmCancel()}
            >
              {cancelBusy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              Cancelar orden
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
