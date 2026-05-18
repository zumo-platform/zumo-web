"use client";

import { useState } from "react";

import { CheckCircle, Loader2, PencilLine, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  confirmDashboardOrderViaProxy,
  rejectDashboardOrderViaProxy,
} from "@/lib/dashboard-orders";
import type { Order } from "@/lib/dashboard-types";

import { formatAiConfidencePct } from "./inbox-helpers";

export type DraftOrderCardVariant = "active" | "blocked";

export function DraftOrderCard({
  order,
  variant,
  confirmDisabledTitle,
  onAfterChange,
}: Readonly<{
  order: Order;
  variant: DraftOrderCardVariant;
  confirmDisabledTitle?: string;
  onAfterChange?: () => void;
}>) {
  const blocked = variant === "blocked";
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  async function confirm() {
    if (blocked) return;
    setConfirmingId(order.orderId);
    try {
      await confirmDashboardOrderViaProxy(order.orderId);
      toast.success("Pedido confirmado");
      onAfterChange?.();
    } catch {
      toast.error("No se pudo confirmar. Intentá de nuevo.");
    } finally {
      setConfirmingId(null);
    }
  }

  async function rejectOrder() {
    if (blocked) return;
    setRejectingId(order.orderId);
    try {
      await rejectDashboardOrderViaProxy(order.orderId);
      toast.success("Pedido rechazado");
      onAfterChange?.();
    } catch {
      toast.error("No se pudo rechazar el pedido. Intentá de nuevo.");
    } finally {
      setRejectingId(null);
    }
  }

  const busyReject = rejectingId === order.orderId;
  const busyConfirm = confirmingId === order.orderId;

  const confidence = formatAiConfidencePct(order);

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 border-b bg-muted/20 px-4 py-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-sm">Pedido extraído</CardTitle>
          {confidence ? <p className="text-muted-foreground text-xs">{confidence}</p> : null}
        </div>
        <Badge variant="outline">{order.status === "draft" ? "borrador" : "pendiente"}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-4">
        <ul className="space-y-1.5">
          {(order.lines ?? []).map((line, i) => (
            <li className="flex flex-wrap items-baseline gap-x-1 text-sm" key={`${order.orderId}-${i}`}>
              <span className="font-semibold tabular-nums">{line.quantity}</span>
              <span className="text-muted-foreground">{line.unit}</span>
              <span>{line.productName}</span>
            </li>
          ))}
          {(!order.lines || order.lines.length === 0) ? (
            <li className="text-muted-foreground text-sm">Sin líneas.</li>
          ) : null}
        </ul>
        {order.deliveryNotes ? (
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-muted-foreground text-xs leading-relaxed">
            <span className="font-medium text-foreground">Nota:</span> {order.deliveryNotes}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t bg-muted/10 px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button
          className="w-full sm:w-auto sm:min-w-[11rem]"
          disabled={blocked || busyReject || busyConfirm}
          size="sm"
          title={blocked ? confirmDisabledTitle : undefined}
          type="button"
          variant="outline"
          onClick={() => void rejectOrder()}
        >
          {busyReject ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <XCircle aria-hidden className="size-4" />
          )}
          Rechazar
        </Button>
        {blocked ? (
          <Button className="w-full sm:w-auto" disabled size="sm" type="button" variant="outline">
            <PencilLine aria-hidden className="size-4" />
            Editar
          </Button>
        ) : (
          <Button asChild className="w-full sm:w-auto" disabled={busyConfirm || busyReject} size="sm" variant="outline">
            <Link href={`/orders/${encodeURIComponent(order.orderId)}/edit`}>
              <PencilLine aria-hidden className="size-4" />
              Editar
            </Link>
          </Button>
        )}
        <Button
          className="w-full sm:ml-auto sm:min-w-[11rem] sm:flex-initial"
          disabled={blocked || busyConfirm || busyReject}
          size="sm"
          title={blocked ? confirmDisabledTitle : undefined}
          type="button"
          onClick={() => void confirm()}
        >
          {busyConfirm ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <CheckCircle aria-hidden className="size-4" />
          )}
          Confirmar pedido
        </Button>
      </CardFooter>
    </Card>
  );
}
