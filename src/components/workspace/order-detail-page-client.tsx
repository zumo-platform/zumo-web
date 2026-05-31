"use client";

import { useCallback, useEffect, useState } from "react";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderLifecycleActions } from "@/components/workspace/order-lifecycle-actions";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspacePageHeaderClassName,
} from "@/lib/workspace-layout";
import { cn } from "@/lib/utils";

const BLOCK_TOOLTIP = "Creá primero el cliente para gestionar el pedido";

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

type OrderSummary = Readonly<{
  orderId: string;
  displayCode: string | null;
  status: string;
  customerId: number;
  lines: ReadonlyArray<{ productName: string; quantity: number; unit: string }>;
}>;

function parseOrderSummary(raw: unknown, fallbackOrderId: string): OrderSummary | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!root) return null;
  const o =
    root.order && typeof root.order === "object" && !Array.isArray(root.order)
      ? (root.order as Record<string, unknown>)
      : root;

  const orderId =
    typeof o.orderId === "string" && o.orderId.trim() ? o.orderId.trim() : fallbackOrderId;
  const status = typeof o.status === "string" && o.status.trim() ? o.status.trim() : "draft";
  const customerId =
    typeof o.customerId === "number" && Number.isInteger(o.customerId) && o.customerId > 0
      ? o.customerId
      : null;
  if (!customerId) return null;

  const displayCode =
    typeof o.displayCode === "string" && o.displayCode.trim() ? o.displayCode.trim() : null;

  const linesRaw = Array.isArray(o.lines) ? o.lines : [];
  const lines: OrderSummary["lines"][number][] = [];
  for (const item of linesRaw) {
    if (!item || typeof item !== "object") continue;
    const line = item as Record<string, unknown>;
    const productName =
      typeof line.productName === "string" && line.productName.trim()
        ? line.productName.trim()
        : "—";
    const quantity = typeof line.quantity === "number" && line.quantity > 0 ? line.quantity : 0;
    const unit = typeof line.unit === "string" && line.unit.trim() ? line.unit.trim() : "—";
    if (quantity <= 0) continue;
    lines.push({ productName, quantity, unit });
  }

  return { orderId, displayCode, status, customerId, lines };
}

export function OrderDetailPageClient({
  orderId,
  customerBlocked = false,
}: Readonly<{
  orderId: string;
  customerBlocked?: boolean;
}>) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/backend/dashboard/orders/${encodeURIComponent(orderId)}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        throw new Error(
          body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
            ? (body as { error: string }).error
            : "No se pudo cargar el pedido.",
        );
      }
      const parsed = parseOrderSummary(body, orderId);
      if (!parsed) throw new Error("Respuesta de pedido inválida.");
      setOrder(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el pedido.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatusChange = useCallback((id: string, status: string) => {
    setOrder((prev) => (prev && prev.orderId === id ? { ...prev, status } : prev));
  }, []);

  const handleRemoved = useCallback(() => {
    router.push("/orders");
  }, [router]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <div className={cn("border-b", workspacePageHeaderClassName)}>
        <div className={cn("flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", workspaceContentInnerClassName)}>
          <div className="min-w-0 space-y-2">
            <Button asChild className="mb-1 -ml-2 gap-1.5" size="sm" type="button" variant="ghost">
              <Link href="/orders">
                <ArrowLeft aria-hidden className="size-4" />
                Volver a pedidos
              </Link>
            </Button>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Cargando pedido…
              </div>
            ) : error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : order ? (
              <>
                <h1 className="font-semibold text-xl tracking-tight">
                  Pedido{" "}
                  <span className="font-mono">{formatOrderDisplayCode(order.orderId, order.displayCode)}</span>
                </h1>
                <Badge variant="outline">{statusLabel(order.status)}</Badge>
              </>
            ) : null}
          </div>
          {order && (order.status === "draft" || order.status === "pending") ? (
            <OrderLifecycleActions
              blocked={customerBlocked}
              blockedTitle={BLOCK_TOOLTIP}
              layout="inline"
              orderId={order.orderId}
              status={order.status}
              onRemoved={handleRemoved}
              onStatusChange={handleStatusChange}
            />
          ) : null}
        </div>
      </div>

      <div className={workspaceContentOuterClassName}>
        <div className={workspaceContentInnerClassName}>
          {!loading && !error && order ? (
            <ul className="space-y-2">
              {order.lines.length === 0 ? (
                <li className="text-muted-foreground text-sm">Este pedido no tiene líneas.</li>
              ) : (
                order.lines.map((line, i) => (
                  <li className="flex flex-wrap items-baseline gap-x-1 text-sm" key={`${order.orderId}-${i}`}>
                    <span className="font-semibold tabular-nums">{line.quantity}</span>
                    <span className="text-muted-foreground">{line.unit}</span>
                    <span>{line.productName}</span>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
