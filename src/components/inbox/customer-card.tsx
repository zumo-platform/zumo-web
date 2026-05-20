import type { Conversation, Order } from "@/lib/dashboard-types";

import { computeCustomerOrderStats, lastOrderSpanishRelativeDays } from "./inbox-helpers";

export function CustomerCard({
  conversation,
  orders,
}: Readonly<{
  conversation: Conversation;
  orders: readonly Order[];
}>) {
  const cid = conversation.customerId ?? 0;
  const name = conversation.customerName.trim() || `Cliente #${String(cid)}`;
  const stats = computeCustomerOrderStats(cid, orders);
  const rel = stats.latestConfirmedCreatedAt ? lastOrderSpanishRelativeDays(stats.latestConfirmedCreatedAt) : null;

  const lastOrderLine =
    stats.hasHistoricalConfirmed && rel
      ? rel === "hoy"
        ? "Último pedido: hoy"
        : `Último pedido: ${rel}`
      : "Sin pedidos previos.";

  return (
    <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
      <p className="font-semibold text-foreground text-base leading-tight">{name}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide">Teléfono</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{conversation.customerPhone.trim() || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide">Último pedido</dt>
          <dd className="mt-0.5 text-foreground">{lastOrderLine}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide">Total de pedidos</dt>
          <dd className="mt-0.5 tabular-nums">{stats.total}</dd>
        </div>
      </dl>
    </div>
  );
}
