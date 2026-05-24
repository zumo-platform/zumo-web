"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  AlertCircle,
  Download,
  Loader2,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MatchCoverageIndicator } from "@/components/workspace/match-coverage-indicator";
import { OrderLifecycleActions } from "@/components/workspace/order-lifecycle-actions";
import { markDashboardOrderSeenViaProxy, type DashboardOrderPatch } from "@/lib/dashboard-orders";
import { parseMatchCoverage } from "@/lib/match-coverage";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import { cn } from "@/lib/utils";

export type OrderDetailSheetProps = Readonly<{
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerNameFallback?: string;
  onConfirmed?: (orderId: string) => void;
  onOrderStatusChange?: (orderId: string, status: string, patch?: DashboardOrderPatch) => void;
  onOrderSeen?: (orderId: string) => void;
  onOrderRemoved?: (orderId: string) => void;
  /** Keeps sheet status in sync when the list row updates (e.g. confirm from table). */
  syncedStatus?: string | null;
}>;

type OrderDetailLine = Readonly<{
  productId: number | null;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  lineSubtotal: number | null;
}>;

type OrderDetail = Readonly<{
  orderId: string;
  displayCode: string | null;
  customerId: number;
  status: string;
  createdAt: string | null;
  deliveryDate: string | null;
  confirmedAt: string | null;
  conversationId: string | null;
  currency: string | null;
  subtotal: number | null;
  total: number | null;
  lines: OrderDetailLine[];
  matchCoverage: number | null;
  isTouchless: boolean;
}>;

type CustomerDetail = Readonly<{
  name: string | null;
  legalName: string | null;
  governmentId: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
}>;

type ProductLookup = Readonly<{
  sku: string | null;
  presentation: string | null;
}>;

function asStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parsePositiveCustomerId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
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
    default:
      return "default";
  }
}

function csvField(v: string | number | null): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function formatCreatedDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function formatDateOnly(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function formatDeliveryDateStored(raw: string | null): string {
  const trimmed = raw?.trim();
  if (!trimmed) return "—";
  try {
    return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
      new Date(`${trimmed}T12:00:00`),
    );
  } catch {
    return trimmed;
  }
}

function formatConfirmedAt(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatAddress(customer: CustomerDetail | null): string {
  if (!customer) return "—";
  const parts = [customer.addressLine1, customer.addressLine2, customer.city].filter(
    (p): p is string => Boolean(p && p.trim()),
  );
  return parts.length > 0 ? parts.join(", ") : "—";
}

function lineUnitPriceTotal(line: OrderDetailLine): number | null {
  if (line.unitPrice === null) return null;
  return line.quantity * line.unitPrice;
}

function lineSubtotalValue(line: OrderDetailLine): number | null {
  if (line.lineSubtotal !== null) return line.lineSubtotal;
  return lineUnitPriceTotal(line);
}

function parseOrderDetail(raw: unknown, fallbackOrderId: string): OrderDetail | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!root) return null;

  const o =
    root.order && typeof root.order === "object" && !Array.isArray(root.order)
      ? (root.order as Record<string, unknown>)
      : root;

  const orderId = asStringOrNull(o.orderId) ?? fallbackOrderId;
  const customerId = parsePositiveCustomerId(o.customerId);
  if (!customerId) return null;

  const status = asStringOrNull(o.status) ?? "draft";
  const linesRaw = Array.isArray(o.lines) ? o.lines : [];
  const lines: OrderDetailLine[] = [];

  for (const item of linesRaw) {
    if (!item || typeof item !== "object") continue;
    const line = item as Record<string, unknown>;
    const productName = asStringOrNull(line.productName) ?? asStringOrNull(line.productNameRaw) ?? "—";
    const quantity = asNumberOrNull(line.quantity);
    if (quantity === null || quantity <= 0) continue;
    const unit = asStringOrNull(line.unit) ?? "—";
    lines.push({
      productId: parsePositiveCustomerId(line.productId),
      productName,
      quantity,
      unit,
      unitPrice: asNumberOrNull(line.unitPrice),
      lineSubtotal: asNumberOrNull(line.lineSubtotal),
    });
  }

  return {
    orderId,
    displayCode: asStringOrNull(o.displayCode) ?? asStringOrNull(o.display_code),
    customerId,
    status,
    createdAt: asStringOrNull(o.createdAt),
    deliveryDate: asStringOrNull(o.deliveryDate),
    confirmedAt: asStringOrNull(o.confirmedAt),
    conversationId: asStringOrNull(o.conversationId),
    currency: asStringOrNull(o.currency),
    subtotal: asNumberOrNull(o.subtotal),
    total: asNumberOrNull(o.total),
    lines,
    matchCoverage: parseMatchCoverage(o.matchCoverage),
    isTouchless: o.isTouchless === true,
  };
}

function parseCustomerDetail(raw: unknown): CustomerDetail | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!root) return null;
  const c =
    root.customer && typeof root.customer === "object" && !Array.isArray(root.customer)
      ? (root.customer as Record<string, unknown>)
      : null;
  if (!c) return null;

  return {
    name: asStringOrNull(c.name),
    legalName: asStringOrNull(c.legalName),
    governmentId: asStringOrNull(c.governmentId),
    addressLine1: asStringOrNull(c.addressLine1),
    addressLine2: asStringOrNull(c.addressLine2),
    city: asStringOrNull(c.city),
  };
}

function parseProductsMap(raw: unknown): Map<number, ProductLookup> {
  const map = new Map<number, ProductLookup>();
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const list = root?.products;
  if (!Array.isArray(list)) return map;

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const productId = parsePositiveCustomerId(p.productId);
    if (!productId) continue;
    map.set(productId, {
      sku: asStringOrNull(p.sku),
      presentation: asStringOrNull(p.presentation),
    });
  }
  return map;
}

function DetailRow({
  label,
  children,
  className,
}: Readonly<{ label: string; children: ReactNode; className?: string }>) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-foreground text-sm">{children}</dd>
    </div>
  );
}

export function OrderDetailSheet({
  orderId,
  open,
  onOpenChange,
  customerNameFallback,
  onConfirmed,
  onOrderStatusChange,
  onOrderSeen,
  onOrderRemoved,
  syncedStatus,
}: OrderDetailSheetProps) {
  const productsCatalogRef = useRef<Map<number, ProductLookup> | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [productsByPid, setProductsByPid] = useState<Map<number, ProductLookup>>(new Map());
  const [reloadToken, setReloadToken] = useState(0);

  const loadOrder = useCallback(async (id: string, signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    setOrder(null);
    setCustomer(null);

    try {
      const orderRes = await fetch(`/api/backend/dashboard/orders/${encodeURIComponent(id)}`, {
        credentials: "same-origin",
        cache: "no-store",
        signal,
      });
      const orderBody = (await orderRes.json().catch(() => ({}))) as Record<string, unknown>;

      if (!orderRes.ok) {
        const msg =
          typeof orderBody.error === "string" && orderBody.error.trim()
            ? orderBody.error.trim()
            : `No se pudo cargar el pedido (HTTP ${String(orderRes.status)}).`;
        throw new Error(msg);
      }

      const parsedOrder = parseOrderDetail(orderBody, id);
      if (!parsedOrder) {
        throw new Error("Respuesta de pedido inválida.");
      }

      if (signal.aborted) return;
      setOrder(parsedOrder);

      if (parsedOrder.status === "draft") {
        onOrderSeen?.(parsedOrder.orderId);
        void markDashboardOrderSeenViaProxy(parsedOrder.orderId).catch(() => {
          /* best-effort */
        });
      }

      let catalog = productsCatalogRef.current;
      if (!catalog) {
        try {
          const productsRes = await fetch("/api/backend/dashboard/products", {
            credentials: "same-origin",
            cache: "no-store",
            signal,
          });
          const productsBody = (await productsRes.json().catch(() => ({}))) as unknown;
          if (productsRes.ok && !signal.aborted) {
            catalog = parseProductsMap(productsBody);
            productsCatalogRef.current = catalog;
          }
        } catch {
          /* best-effort */
        }
      }

      if (!signal.aborted) {
        setProductsByPid(catalog ?? new Map());
      }

      try {
        const customerRes = await fetch(
          `/api/backend/dashboard/customers/${encodeURIComponent(String(parsedOrder.customerId))}`,
          { credentials: "same-origin", cache: "no-store", signal },
        );
        const customerBody = (await customerRes.json().catch(() => ({}))) as unknown;
        if (customerRes.ok && !signal.aborted) {
          setCustomer(parseCustomerDetail(customerBody));
        }
      } catch {
        /* best-effort */
      }
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof Error ? err.message : "No se pudo cargar el pedido.");
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [onOrderSeen]);

  useEffect(() => {
    if (!open || !orderId) return undefined;

    const controller = new AbortController();
    void loadOrder(orderId, controller.signal);

    return () => {
      controller.abort();
    };
  }, [open, orderId, loadOrder, reloadToken]);

  useEffect(() => {
    if (!open || !order || !syncedStatus || order.status === syncedStatus) return;
    setOrder((prev) => (prev ? { ...prev, status: syncedStatus } : prev));
  }, [open, order, syncedStatus]);

  useEffect(() => {
    if (open) return;
    setLoading(false);
    setError(null);
    setOrder(null);
    setCustomer(null);
    setProductsByPid(new Map());
  }, [open]);

  const displayStatus = order?.status ?? "draft";
  const statusText = statusLabel(displayStatus);

  const customerDisplayName =
    customer?.name ??
    customer?.legalName ??
    customerNameFallback ??
    (order ? `Cliente #${order.customerId}` : "—");

  const formatMoney = useCallback(
    (value: number | null): string => {
      if (value === null) return "—";
      try {
        return new Intl.NumberFormat("es-CR", {
          style: "currency",
          currency: order?.currency ?? "CRC",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
      } catch {
        return value.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    },
    [order?.currency],
  );

  const computedSubtotal = (() => {
    if (!order) return null;
    if (order.subtotal !== null) return order.subtotal;
    let sum = 0;
    let hasLine = false;
    for (const line of order.lines) {
      const sub = lineSubtotalValue(line);
      if (sub !== null) {
        sum += sub;
        hasLine = true;
      }
    }
    return hasLine ? sum : null;
  })();

  const computedTotal = order?.total ?? computedSubtotal;

  const handleExport = useCallback(() => {
    if (!order || order.lines.length === 0) return;

    const header = [
      "order_id",
      "sku",
      "product",
      "presentation",
      "unit",
      "quantity",
      "unit_price",
      "line_subtotal",
    ];
    const rows = order.lines.map((line) => {
      const product = line.productId !== null ? productsByPid.get(line.productId) : undefined;
      const sub = lineSubtotalValue(line);
      return [
        csvField(order.orderId),
        csvField(product?.sku ?? ""),
        csvField(line.productName),
        csvField(product?.presentation ?? ""),
        csvField(line.unit),
        csvField(line.quantity),
        csvField(line.unitPrice),
        csvField(sub),
      ].join(",");
    });

    const csv = `\uFEFF${[header.join(","), ...rows].join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedido_${order.orderId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [order, productsByPid]);

  const exportDisabled = loading || !order || order.lines.length === 0;
  const chatDisabled = loading || !order?.conversationId;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-3xl">
        <SheetHeader className="shrink-0 space-y-3 border-b px-6 py-4 pr-9">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <SheetTitle className="text-left text-lg">
                Pedido{" "}
                {orderId
                  ? formatOrderDisplayCode(orderId, order?.displayCode)
                  : "—"}
              </SheetTitle>
              <SheetDescription className="text-left">{customerDisplayName}</SheetDescription>
              {order ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="w-fit" variant={statusBadgeVariant(displayStatus)}>
                    {statusText}
                  </Badge>
                  <MatchCoverageIndicator
                    isTouchless={order.isTouchless}
                    lineCount={order.lines.length}
                    matchCoverage={order.matchCoverage}
                    size="md"
                  />
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                className="gap-1.5"
                disabled={exportDisabled}
                size="sm"
                type="button"
                variant="outline"
                onClick={handleExport}
              >
                <Download aria-hidden className="size-4" />
                Exportar
              </Button>
              {order?.conversationId ? (
                <Button asChild className="gap-1.5" size="sm" type="button" variant="secondary">
                  <Link href="/whatsapp">
                    <MessageCircle aria-hidden className="size-4" />
                    Ir al chat
                  </Link>
                </Button>
              ) : (
                <Button className="gap-1.5" disabled={chatDisabled} size="sm" type="button" variant="secondary">
                  <MessageCircle aria-hidden className="size-4" />
                  Ir al chat
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 aria-hidden className="size-8 animate-spin" />
              <p className="text-sm">Cargando detalle del pedido…</p>
            </div>
          ) : null}

          {!loading && error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <AlertCircle aria-hidden className="size-10 text-destructive" />
              <p className="max-w-sm text-destructive text-sm">{error}</p>
              {orderId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReloadToken((t) => t + 1)}
                >
                  Reintentar
                </Button>
              ) : null}
            </div>
          ) : null}

          {!loading && !error && order ? (
            <div className="space-y-6">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <DetailRow label="Código del pedido">
                  <span className="font-mono">
                    {formatOrderDisplayCode(order.orderId, order.displayCode)}
                  </span>
                </DetailRow>
                <DetailRow label="Fecha de creación (hora)">
                  {formatCreatedDateTime(order.createdAt)}
                </DetailRow>
                <DetailRow label="Fecha de creación">{formatDateOnly(order.createdAt)}</DetailRow>
                <DetailRow label="Fecha de entrega">
                  {formatDeliveryDateStored(order.deliveryDate)}
                </DetailRow>
                <DetailRow label="Razón social">
                  {customer?.legalName ?? customer?.name ?? "—"}
                </DetailRow>
                <DetailRow label="Identificación">{customer?.governmentId ?? "—"}</DetailRow>
                <DetailRow className="sm:col-span-2" label="Dirección de entrega">
                  {formatAddress(customer)}
                </DetailRow>
              </dl>

              <Separator />

              <div className="rounded-lg border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Presentación</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio unitario</TableHead>
                      <TableHead className="text-right">Precio total</TableHead>
                      <TableHead className="text-right">Subtotal de línea</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.lines.length === 0 ? (
                      <TableRow>
                        <TableCell
                          className="h-24 text-center text-muted-foreground text-sm"
                          colSpan={8}
                        >
                          Este pedido todavía no tiene líneas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      order.lines.map((line, index) => {
                        const product =
                          line.productId !== null ? productsByPid.get(line.productId) : undefined;
                        return (
                          <TableRow key={`${line.productName}-${index}`}>
                            <TableCell className="font-mono text-xs">
                              {product?.sku ?? "—"}
                            </TableCell>
                            <TableCell>{line.productName}</TableCell>
                            <TableCell>{line.unit}</TableCell>
                            <TableCell>{product?.presentation ?? "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {line.quantity.toLocaleString("es")}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(line.unitPrice)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(lineUnitPriceTotal(line))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(lineSubtotalValue(line))}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="ml-auto max-w-xs space-y-2 text-right text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">{formatMoney(computedSubtotal)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t pt-2">
                  <span className="font-medium">Total</span>
                  <span className="font-semibold tabular-nums">{formatMoney(computedTotal)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="sticky bottom-0 flex shrink-0 flex-col gap-3 border-t bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            {order?.confirmedAt
              ? `Confirmado el ${formatConfirmedAt(order.confirmedAt)}`
              : displayStatus === "pending"
                ? "Pendiente de confirmación."
                : displayStatus === "draft"
                  ? "Borrador extraído por el AI."
                  : `Estado actual: ${statusText}.`}
          </p>
          {order && (order.status === "draft" || order.status === "pending") ? (
            <OrderLifecycleActions
              layout="inline"
              orderId={order.orderId}
              status={order.status}
              onRemoved={(id) => {
                onOrderRemoved?.(id);
                onOpenChange(false);
              }}
              onStatusChange={(id, status, patch) => {
                setOrder((prev) =>
                  prev
                    ? {
                        ...prev,
                        status,
                        displayCode: patch?.displayCode ?? prev.displayCode,
                      }
                    : prev,
                );
                onOrderStatusChange?.(id, status, patch);
                if (status === "confirmed") onConfirmed?.(id);
              }}
            />
          ) : null}
        </footer>
      </SheetContent>
    </Sheet>
  );
}
