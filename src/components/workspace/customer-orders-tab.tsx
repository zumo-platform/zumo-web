"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardCustomerOrder } from "@/lib/dashboard-customers";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import { cn } from "@/lib/utils";

function statusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Borrador";
    case "pending":
      return "En Revisión";
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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(iso));
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

export function CustomerOrdersTab({
  orders,
  onOpenOrder,
}: Readonly<{
  orders: readonly DashboardCustomerOrder[];
  onOpenOrder?: (orderId: string) => void;
}>) {
  const sorted = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      }),
    [orders],
  );

  if (sorted.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground text-sm">
        Este cliente todavía no tiene pedidos.
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((order) => (
            <TableRow
              className={cn(onOpenOrder && "cursor-pointer")}
              key={order.orderId}
              onClick={() => onOpenOrder?.(order.orderId)}
            >
              <TableCell className="font-mono text-sm">
                {formatOrderDisplayCode(order.orderId, order.displayCode)}
              </TableCell>
              <TableCell>{formatDate(order.createdAt)}</TableCell>
              <TableCell>
                <Badge variant="outline">{statusLabel(order.status)}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(order.total, order.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
