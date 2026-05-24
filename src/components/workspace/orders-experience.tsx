"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Loader2, Package, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { OrderStatusFilterChips } from "@/components/workspace/order-status-filter-chips";
import { OrdersCatalogTable } from "@/components/workspace/orders-catalog-table";
import { OrdersHeaderActions } from "@/components/workspace/orders-header-actions";
import { OrdersPageHeader } from "@/components/workspace/orders-page-header";
import { parseDashboardCustomersEnvelope, type DashboardCustomerRow } from "@/lib/dashboard-customers";
import {
  DEFAULT_ORDER_STATUS_FILTER,
  mergeAndSortOrders,
  orderStatusFilterToParam,
  parseDashboardOrdersEnvelope,
  parseOrderStatusFilter,
  type DashboardOrderListRow,
  type DashboardOrderPatch,
  type DashboardOrderStatus,
  type DashboardOrdersFetchResult,
} from "@/lib/dashboard-orders";

async function fetchOrdersFromProxy(
  statuses: readonly DashboardOrderStatus[],
): Promise<DashboardOrdersFetchResult> {
  const origin = window.location.origin;
  const flat: DashboardOrderListRow[] = [];
  let anySuccess = false;
  const statusList = statuses.length > 0 ? statuses : DEFAULT_ORDER_STATUS_FILTER;

  for (const status of statusList) {
    const url = `${origin}/api/backend/dashboard/orders?status=${encodeURIComponent(status)}`;
    try {
      const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        anySuccess = true;
        flat.push(...parseDashboardOrdersEnvelope(body));
      }
    } catch {
      /* network error for this status — keep trying others */
    }
  }

  if (!anySuccess) return { ok: false };
  return { ok: true, orders: mergeAndSortOrders(flat) };
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
  initialOrdersResult,
  initialCustomers,
  initialStatusFilter,
}: Readonly<{
  initialOrdersResult: DashboardOrdersFetchResult;
  initialCustomers: DashboardCustomerRow[] | null;
  initialStatusFilter: DashboardOrderStatus[];
}>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydratedCustomers = initialCustomers !== null;

  const statusFilter = useMemo((): DashboardOrderStatus[] => {
    const raw = searchParams.get("status");
    if (raw !== null) return parseOrderStatusFilter(raw);
    return initialStatusFilter.length > 0
      ? [...initialStatusFilter]
      : [...DEFAULT_ORDER_STATUS_FILTER];
  }, [searchParams, initialStatusFilter]);

  const [orders, setOrders] = useState<DashboardOrderListRow[]>(() =>
    initialOrdersResult.ok ? initialOrdersResult.orders : [],
  );
  const [ordersFetchFailed, setOrdersFetchFailed] = useState(() => !initialOrdersResult.ok);
  const [ordersReady, setOrdersReady] = useState(() => initialOrdersResult.ok);
  const [customerRows, setCustomerRows] = useState<DashboardCustomerRow[] | undefined>(() =>
    hydratedCustomers ? (initialCustomers ?? []) : undefined,
  );
  const [customersFetchFailed, setCustomersFetchFailed] = useState(false);
  const [refetching, setRefetching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const tasks: Promise<void>[] = [];

      if (!initialOrdersResult.ok) {
        tasks.push(
          (async () => {
            const result = await fetchOrdersFromProxy(statusFilter);
            if (cancelled) return;
            if (result.ok) {
              setOrdersFetchFailed(false);
              setOrders(result.orders);
            } else {
              setOrdersFetchFailed(true);
              setOrders([]);
            }
            setOrdersReady(true);
          })(),
        );
      }

      if (!hydratedCustomers) {
        tasks.push(
          (async () => {
            const customersResult = await fetchCustomersFromProxy();
            if (cancelled) return;
            if (customersResult.ok) {
              setCustomersFetchFailed(false);
              setCustomerRows(customersResult.rows);
            } else {
              setCustomersFetchFailed(true);
              setCustomerRows([]);
            }
          })(),
        );
      }

      if (tasks.length === 0) return;

      await Promise.all(tasks);
    })();

    return () => {
      cancelled = true;
    };
  }, [hydratedCustomers, initialOrdersResult.ok, statusFilter]);

  const handleStatusFilterChange = useCallback(
    (next: DashboardOrderStatus[]) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("status", orderStatusFilterToParam(next));
      router.replace(`/orders?${params.toString()}`, { scroll: false });
      setRefetching(true);
      void fetchOrdersFromProxy(next).then((result) => {
        setRefetching(false);
        if (result.ok) {
          setOrdersFetchFailed(false);
          setOrders(result.orders);
          setOrdersReady(true);
        } else {
          setOrdersFetchFailed(true);
        }
      });
    },
    [router, searchParams],
  );

  const skipInitialStatusRefetch = useRef(initialOrdersResult.ok);

  useEffect(() => {
    if (skipInitialStatusRefetch.current) {
      skipInitialStatusRefetch.current = false;
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await fetchOrdersFromProxy(statusFilter);
      if (cancelled) return;
      if (result.ok) {
        setOrdersFetchFailed(false);
        setOrders(result.orders);
        setOrdersReady(true);
      } else {
        setOrdersFetchFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

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

  const handleOrderStatusChange = useCallback(
    (orderId: string, status: string, patch?: DashboardOrderPatch) => {
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, status, ...patch } : o)),
      );
    },
    [],
  );

  const handleOrderRemoved = useCallback((orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
  }, []);

  const handleOrderSeen = useCallback((orderId: string) => {
    const seenAt = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, seenAt } : o)),
    );
  }, []);

  const pendingClient = !ordersReady || customerList === undefined;

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

  const hasOrders = orders.length > 0;

  const description = ordersFetchFailed
    ? "No pudimos cargar los pedidos. Revisá la conexión con el API o intentá de nuevo más tarde."
    : customersFetchFailed
      ? "Los pedidos se muestran, pero no pudimos cargar los nombres de clientes (se muestra el ID)."
      : hasOrders
        ? `Tenés ${orders.length} ${orders.length === 1 ? "pedido" : "pedidos"}. Seleccioná filas para edición masiva (próximamente).`
        : "No hay pedidos con los filtros seleccionados. Ajustá los estados o creá un pedido manualmente.";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <OrdersPageHeader
        actions={<OrdersHeaderActions showCreateOrder={hasOrders} />}
        description={description}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex min-h-0 flex-1 overflow-auto px-4 py-5 md:px-6 md:py-6">
          <div className="mx-auto flex w-full max-w-[1400px] min-h-0 flex-1 flex-col gap-6">
            {ordersFetchFailed ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
                <h2 className="text-balance font-semibold text-foreground text-lg md:text-xl">
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
              <div className="rounded-lg border border-dashed bg-muted/15 px-6 py-10 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
                  <Package aria-hidden className="size-6 text-muted-foreground" />
                </div>
                <h2 className="mt-5 text-balance font-semibold text-foreground text-lg md:text-xl">
                  No hay pedidos todavía
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-muted-foreground text-sm leading-relaxed">
                  Los pedidos aparecerán aquí cuando se creen desde WhatsApp o manualmente.
                </p>
                <Button asChild className="mt-6 gap-2" size="default" type="button">
                  <Link href="/orders/creation">
                    <Plus aria-hidden className="size-4" />
                    Crear pedido
                  </Link>
                </Button>
              </div>
            ) : null}

            {hasOrders && !ordersFetchFailed ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <header className="shrink-0 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-base tracking-tight text-foreground">Listado de pedidos</h2>
                      <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
                        Código, cliente, fechas, ítems, estado y canal de cada pedido.
                      </p>
                    </div>
                    {refetching ? (
                      <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />
                    ) : null}
                  </div>
                  <OrderStatusFilterChips selected={statusFilter} onChange={handleStatusFilterChange} />
                </header>
                <OrdersCatalogTable
                  customerNameById={customerNameById}
                  data={orders}
                  onOrderRemoved={handleOrderRemoved}
                  onOrderSeen={handleOrderSeen}
                  onOrderStatusChange={handleOrderStatusChange}
                />
              </div>
            ) : null}
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
