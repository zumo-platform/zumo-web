"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2, ShoppingCart } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { OrdersCatalogTable } from "@/components/workspace/orders-catalog-table";
import { OrdersHeaderActions } from "@/components/workspace/orders-header-actions";
import { OrdersPageHeader } from "@/components/workspace/orders-page-header";
import { parseDashboardCustomersEnvelope, type DashboardCustomerRow } from "@/lib/dashboard-customers";
import {
  DASHBOARD_ORDER_STATUSES,
  mergeAndSortOrders,
  parseDashboardOrdersEnvelope,
  type DashboardOrderListRow,
} from "@/lib/dashboard-orders";

async function fetchAllOrdersFromProxy(): Promise<{ ok: true; rows: DashboardOrderListRow[] } | { ok: false }> {
  const origin = window.location.origin;
  const flat: DashboardOrderListRow[] = [];
  let anySuccess = false;

  for (const status of DASHBOARD_ORDER_STATUSES) {
    const url = `${origin}/api/backend/dashboard/orders?status=${encodeURIComponent(status)}`;
    try {
      const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        anySuccess = true;
        flat.push(...parseDashboardOrdersEnvelope(body));
      }
    } catch {
      /* ignore */
    }
  }

  if (!anySuccess) return { ok: false };
  return { ok: true, rows: mergeAndSortOrders(flat) };
}

async function fetchCustomersFromProxy(): Promise<{ ok: true; rows: DashboardCustomerRow[] } | { ok: false }> {
  const url = `${window.location.origin}/api/backend/dashboard/customers`;
  try {
    const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false };
    return { ok: true, rows: parseDashboardCustomersEnvelope(body) };
  } catch {
    return { ok: false };
  }
}

export function OrdersExperience({
  initialOrders,
  initialCustomers,
}: Readonly<{
  initialOrders: DashboardOrderListRow[] | null;
  initialCustomers: DashboardCustomerRow[] | null;
}>) {
  const hydratedOrders = initialOrders !== null;
  const hydratedCustomers = initialCustomers !== null;

  const [orderRows, setOrderRows] = useState<DashboardOrderListRow[] | undefined>(() =>
    hydratedOrders ? (initialOrders ?? []) : undefined,
  );
  const [customerRows, setCustomerRows] = useState<DashboardCustomerRow[] | undefined>(() =>
    hydratedCustomers ? (initialCustomers ?? []) : undefined,
  );
  const [ordersFetchFailed, setOrdersFetchFailed] = useState(false);
  const [customersFetchFailed, setCustomersFetchFailed] = useState(false);

  useEffect(() => {
    if (hydratedOrders && hydratedCustomers) return;

    let cancelled = false;
    void (async () => {
      const [ordersResult, customersResult] = await Promise.all([
        hydratedOrders ? Promise.resolve({ ok: true as const, rows: initialOrders ?? [] }) : fetchAllOrdersFromProxy(),
        hydratedCustomers
          ? Promise.resolve({ ok: true as const, rows: initialCustomers ?? [] })
          : fetchCustomersFromProxy(),
      ]);

      if (cancelled) return;

      if (ordersResult.ok) {
        setOrdersFetchFailed(false);
        setOrderRows(ordersResult.rows);
      } else {
        setOrdersFetchFailed(true);
        setOrderRows([]);
      }

      if (customersResult.ok) {
        setCustomersFetchFailed(false);
        setCustomerRows(customersResult.rows);
      } else {
        setCustomersFetchFailed(true);
        setCustomerRows([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydratedCustomers, hydratedOrders, initialCustomers, initialOrders]);

  const orderList = useMemo((): DashboardOrderListRow[] | undefined => {
    if (!hydratedOrders && orderRows === undefined) return undefined;
    return hydratedOrders ? (initialOrders ?? []) : (orderRows ?? []);
  }, [hydratedOrders, initialOrders, orderRows]);

  const customerList = useMemo((): DashboardCustomerRow[] | undefined => {
    if (!hydratedCustomers && customerRows === undefined) return undefined;
    return hydratedCustomers ? (initialCustomers ?? []) : (customerRows ?? []);
  }, [hydratedCustomers, initialCustomers, customerRows]);

  const customerNameById = useMemo(() => {
    if (!customerList) return new Map<number, string>();
    const m = new Map<number, string>();
    for (const c of customerList) {
      m.set(c.customerId, c.name);
    }
    return m;
  }, [customerList]);

  const pendingClient = orderList === undefined || customerList === undefined;

  if (pendingClient) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 aria-hidden className="size-5 animate-spin" />
          Cargando pedidos…
        </div>
      </div>
    );
  }

  const orders = orderList;

  const hasOrders = orders.length > 0;

  const description = ordersFetchFailed
    ? "No pudimos cargar los pedidos. Revisá la conexión con el API o intentá de nuevo más tarde."
    : customersFetchFailed
      ? "Los pedidos se muestran, pero no pudimos cargar los nombres de clientes (se muestra el ID)."
      : hasOrders
        ? `Tenés ${orders.length} ${orders.length === 1 ? "pedido" : "pedidos"}. Seleccioná filas para edición masiva (próximamente).`
        : "Consultá y gestioná los pedidos confirmados y en curso. Los borradores seguís gestionándolos desde el inbox.";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <OrdersPageHeader actions={<OrdersHeaderActions />} description={description} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex min-h-0 flex-1 overflow-auto px-4 py-5 md:px-6 md:py-6">
          <div className="mx-auto flex w-full max-w-[1400px] min-h-0 flex-1 flex-col gap-6">
            {ordersFetchFailed && !hasOrders ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
                <h2 className="text-balance font-semibold text-lg text-foreground md:text-xl">
                  No se pudieron cargar los pedidos
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-muted-foreground text-sm leading-relaxed">
                  Revisá tu conexión, que la sesión siga activa y que el API esté disponible.
                </p>
                <Button className="mt-6" size="sm" type="button" variant="outline" onClick={() => window.location.reload()}>
                  Reintentar
                </Button>
              </div>
            ) : null}

            {!hasOrders && !ordersFetchFailed ? (
              <div className="rounded-lg border border-dashed bg-muted/15 px-6 py-8 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
                  <ShoppingCart aria-hidden className="size-6 text-muted-foreground" />
                </div>
                <h2 className="mt-5 text-balance font-semibold text-foreground text-lg md:text-xl">
                  You don&apos;t have orders yet
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-muted-foreground text-sm leading-relaxed">
                  When customers place orders through WhatsApp or the inbox, they will appear in the table below with
                  delivery details and status.
                </p>
                <Button asChild className="mt-6" size="default" type="button">
                  <Link href="/inbox">Create your first order</Link>
                </Button>
              </div>
            ) : null}

            <OrdersCatalogTable customerNameById={customerNameById} data={orders} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrdersExperienceFallback() {
  return (
    <div className="flex flex-1 items-center justify-center gap-2 bg-background text-muted-foreground text-sm">
      <Loader2 aria-hidden className="size-4 animate-spin" />
      Cargando pedidos…
    </div>
  );
}
