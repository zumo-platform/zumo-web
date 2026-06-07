"use client";

import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BackorderPill } from "@/components/workspace/backorder-pill";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import type { ProductOrderRow } from "@/lib/product-detail";

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

function formatMoney(value: string | null): string {
  if (!value) return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function ProductOrdersTab({
  orders,
}: Readonly<{ orders: readonly ProductOrderRow[] }>) {
  if (orders.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground text-sm">
        Ningún pedido incluye este producto todavía.
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead>Pendiente</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const backordered = Number(order.lineBackordered);
            const statusKey = order.effectiveStatusKey ?? order.status;
            const showBackorderPill =
              statusKey !== "cancelled" &&
              statusKey !== "rejected" &&
              Number.isFinite(backordered) &&
              backordered > 0;
            const when = order.confirmedAt ?? order.createdAt;
            return (
              <TableRow key={`${order.orderId}-${order.lineQuantity}`}>
                <TableCell>
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={`/orders?orderId=${encodeURIComponent(order.orderId)}`}
                  >
                    {formatOrderDisplayCode(order.orderId, order.displayCode)}
                  </Link>
                </TableCell>
                <TableCell>{order.customerName || "—"}</TableCell>
                <TableCell>{formatDate(when)}</TableCell>
                <TableCell>{statusLabel(order.effectiveStatusKey ?? order.status)}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(order.lineQuantity)}</TableCell>
                <TableCell>
                  {showBackorderPill ? <BackorderPill /> : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(order.lineTotal)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
