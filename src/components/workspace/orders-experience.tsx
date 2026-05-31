"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Loader2, Package, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { OrderStatusFilterChips } from "@/components/workspace/order-status-filter-chips";
import { OrdersBoard } from "@/components/workspace/orders-board";
import { OrdersCatalogTable } from "@/components/workspace/orders-catalog-table";
import { OrdersHeaderActions } from "@/components/workspace/orders-header-actions";
import { OrdersPageHeader } from "@/components/workspace/orders-page-header";
import { OrdersToolbar } from "@/components/workspace/orders-toolbar";
import { parseDashboardCustomersEnvelope, type DashboardCustomerRow } from "@/lib/dashboard-customers";
import {
  DASHBOARD_ORDER_STATUSES,
  DEFAULT_ORDER_STATUS_FILTER,
  ORDERS_VIEW_STORAGE_KEY,
  mergeAndSortOrders,
  normalizeOrderSearchText,
  orderStatusFilterToParam,
  parseDashboardOrdersEnvelope,
  parseOrderStatusFilter,
  parseOrdersViewMode,
  type DashboardOrderListRow,
  type DashboardOrderPatch,
  type DashboardOrdersFetchResult,
  type OrdersViewMode,
} from "@/lib/dashboard-orders";
import {
  buildDefaultFlowItems,
  fetchSupplierFlow,
  flowToFilterOptions,
  type EffectiveStatusItem,
} from "@/lib/order-status-flow";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
} from "@/lib/workspace-layout";

async function fetchOrdersFromProxy(
  statuses: readonly string[],
): Promise<DashboardOrdersFetchResult> {
  const origin = window.location.origin;
  const statusList = statuses.length > 0 ? statuses : [...DASHBOARD_ORDER_STATUSES];

  const chunks = await Promise.all(
    statusList.map(async (status) => {
      const url = `${origin}/api/backend/dashboard/orders?status=${encodeURIComponent(status)}`;
      try {
        const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) return null;
        return parseDashboardOrdersEnvelope(body);
      } catch {
        return null;
      }
    }),
  );

  const flat: DashboardOrderListRow[] = [];
  let anySuccess = false;
  for (const chunk of chunks) {
    if (chunk) {
      anySuccess = true;
      flat.push(...chunk);
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

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function readInitialViewMode(searchParams: URLSearchParams): OrdersViewMode {
  return parseOrdersViewMode(searchParams.get("view"));
}

export function OrdersExperience({
  initialOrdersResult,
  initialCustomers,
  initialStatusFilter,
}: Readonly<{
  initialOrdersResult: DashboardOrdersFetchResult;
  initialCustomers: DashboardCustomerRow[] | null;
  initialStatusFilter: string[];
}>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydratedCustomers = initialCustomers !== null;
  const [, startTransition] = useTransition();

  const [supplierFlow, setSupplierFlow] = useState<EffectiveStatusItem[]>([]);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [deliveryDateFilter, setDeliveryDateFilter] = useState("");
  const [viewMode, setViewMode] = useState<OrdersViewMode>(() => readInitialViewMode(searchParams));
  const [boardMounted, setBoardMounted] = useState(() => readInitialViewMode(searchParams) === "board");

  const deferredViewMode = useDeferredValue(viewMode);
  const isViewTransitioning = viewMode !== deferredViewMode;

  const debouncedQuery = useDebouncedValue(searchQuery, 150);
  const urlView = searchParams.get("view");

  const statusFilter = useMemo((): string[] => {
    const raw = searchParams.get("status");
    if (raw !== null) return parseOrderStatusFilter(raw);
    return initialStatusFilter.length > 0
      ? [...initialStatusFilter]
      : [...DEFAULT_ORDER_STATUS_FILTER];
  }, [searchParams, initialStatusFilter]);

  const fetchStatusKeys = useMemo((): string[] => {
    if (supplierFlow.length > 0) {
      return flowToFilterOptions(supplierFlow).map((o) => o.value);
    }
    return [...DASHBOARD_ORDER_STATUSES];
  }, [supplierFlow]);

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
    void fetchSupplierFlow()
      .then(({ flow }) => {
        if (!cancelled) setSupplierFlow(flow.length > 0 ? flow : buildDefaultFlowItems());
      })
      .catch(() => {
        if (!cancelled) setSupplierFlow(buildDefaultFlowItems());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const replaceSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      router.replace(`/orders?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (urlView !== "board" && urlView !== "list") return;
    setViewMode(urlView);
    if (urlView === "board") setBoardMounted(true);
  }, [urlView]);

  useEffect(() => {
    replaceSearchParams((params) => {
      const q = debouncedQuery.trim();
      if (q) params.set("q", q);
      else params.delete("q");
    });
  }, [debouncedQuery, replaceSearchParams]);

  const handleViewChange = useCallback(
    (next: OrdersViewMode) => {
      if (next === viewMode) return;
      setViewMode(next);
      if (next === "board") setBoardMounted(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ORDERS_VIEW_STORAGE_KEY, next);
      }
      startTransition(() => {
        replaceSearchParams((params) => {
          params.set("view", next);
        });
      });
    },
    [replaceSearchParams, viewMode, startTransition],
  );

  const handleStatusFilterChange = useCallback(
    (next: string[]) => {
      replaceSearchParams((params) => {
        params.set("status", orderStatusFilterToParam(next));
      });
    },
    [replaceSearchParams],
  );

  const loadedFetchKeysRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const tasks: Promise<void>[] = [];

      if (!initialOrdersResult.ok) {
        tasks.push(
          (async () => {
            const result = await fetchOrdersFromProxy(fetchStatusKeys);
            if (cancelled) return;
            if (result.ok) {
              setOrdersFetchFailed(false);
              setOrders(result.orders);
              loadedFetchKeysRef.current = fetchStatusKeys.join(",");
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
  }, [fetchStatusKeys, hydratedCustomers, initialOrdersResult.ok]);

  useEffect(() => {
    const keySignature = fetchStatusKeys.join(",");
    if (loadedFetchKeysRef.current === keySignature) return;

    let cancelled = false;
    setRefetching(true);
    void fetchOrdersFromProxy(fetchStatusKeys).then((result) => {
      if (cancelled) return;
      setRefetching(false);
      if (result.ok) {
        setOrdersFetchFailed(false);
        setOrders(result.orders);
        loadedFetchKeysRef.current = keySignature;
        setOrdersReady(true);
      } else {
        setOrdersFetchFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchStatusKeys]);

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

  const searchFilteredOrders = useMemo(() => {
    const q = normalizeOrderSearchText(debouncedQuery);
    let base = orders;

    if (deliveryDateFilter) {
      base = base.filter((o) => o.deliveryDate === deliveryDateFilter);
    }

    if (!q) return base;

    return base.filter((o) => {
      const name = normalizeOrderSearchText(customerNameById.get(o.customerId) ?? "");
      const code = normalizeOrderSearchText(`${o.orderId} ${o.displayCode ?? ""}`);
      if (code.includes(q) || name.includes(q)) return true;
      return (
        (o.productNames ?? []).some((p) => normalizeOrderSearchText(p).includes(q)) ||
        (o.productSkus ?? []).some((s) => normalizeOrderSearchText(s).includes(q))
      );
    });
  }, [orders, debouncedQuery, customerNameById, deliveryDateFilter]);

  const listOrders = useMemo(() => {
    if (deferredViewMode === "board") return searchFilteredOrders;
    const allowed = new Set(statusFilter);
    return searchFilteredOrders.filter((o) =>
      allowed.has(o.effectiveStatusKey ?? o.status),
    );
  }, [searchFilteredOrders, statusFilter, deferredViewMode]);

  const ordersByStatus = useMemo(() => {
    const bucket = new Map<string, DashboardOrderListRow[]>();
    for (const order of searchFilteredOrders) {
      const key = order.effectiveStatusKey ?? order.status;
      const list = bucket.get(key) ?? [];
      list.push(order);
      bucket.set(key, list);
    }
    for (const [, list] of bucket) {
      list.sort((a, b) => {
        const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bTime - aTime;
      });
    }
    return bucket;
  }, [searchFilteredOrders]);

  const handleOrderStatusChange = useCallback(
    (orderId: string, status: string, patch?: DashboardOrderPatch) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? { ...o, status, effectiveStatusKey: status, ...patch }
            : o,
        ),
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

  const hasAnyOrders = orders.length > 0;
  const hasVisibleResults = searchFilteredOrders.length > 0;
  const flow = supplierFlow.length > 0 ? supplierFlow : buildDefaultFlowItems();

  const description = ordersFetchFailed
    ? "No pudimos cargar los pedidos. Revisá la conexión con el API o intentá de nuevo más tarde."
    : customersFetchFailed
      ? "Los pedidos se muestran, pero no pudimos cargar los nombres de clientes (se muestra el ID)."
      : hasAnyOrders
        ? viewMode === "board"
          ? "Arrastrá pedidos entre columnas para cambiar su estado."
          : `Tenés ${listOrders.length} ${listOrders.length === 1 ? "pedido" : "pedidos"} en la lista.`
        : "No hay pedidos todavía. Creá uno manualmente o esperá pedidos desde WhatsApp.";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <OrdersPageHeader
        actions={<OrdersHeaderActions showCreateOrder={hasAnyOrders} />}
        description={description}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            workspaceContentOuterClassName,
          )}
        >
          <div className={cn(workspaceContentInnerClassName, "gap-4")}>
            {ordersFetchFailed ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
                <h2 className="text-balance font-semibold text-foreground text-lg md:text-xl">
                  No se pudieron cargar los pedidos
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-muted-foreground text-sm leading-relaxed">
                  Revisá tu conexión, que la sesión siga activa y que el API esté disponible.
                </p>
                <Button
                  className="mt-6"
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Reintentar
                </Button>
              </div>
            ) : null}

            {!hasAnyOrders && !ordersFetchFailed ? (
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

            {hasAnyOrders && !ordersFetchFailed ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <header className="shrink-0 space-y-3">
                  {refetching ? (
                    <div className="flex justify-end">
                      <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : null}

                  <OrdersToolbar
                    deliveryDateFilter={deliveryDateFilter}
                    resultCount={searchFilteredOrders.length}
                    searchQuery={searchQuery}
                    view={viewMode}
                    onClearSearch={() => setSearchQuery("")}
                    onDeliveryDateChange={setDeliveryDateFilter}
                    onSearchChange={setSearchQuery}
                    onViewChange={handleViewChange}
                  />

                  {viewMode === "list" ? (
                    <OrderStatusFilterChips
                      flow={flow}
                      selected={statusFilter}
                      onChange={handleStatusFilterChange}
                    />
                  ) : null}
                </header>

                {!hasVisibleResults ? (
                  <div className="rounded-lg border border-dashed bg-muted/15 px-6 py-10 text-center">
                    <p className="text-muted-foreground text-sm">
                      Ningún pedido coincide con la búsqueda o el filtro de entrega.
                    </p>
                    <Button
                      className="mt-4"
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setDeliveryDateFilter("");
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "relative flex min-h-0 flex-1 flex-col",
                      isViewTransitioning && "opacity-80",
                    )}
                  >
                    <div
                      className={cn(
                        "min-h-0 flex-1 flex-col",
                        deferredViewMode === "list" ? "flex" : "hidden",
                      )}
                    >
                      <OrdersCatalogTable
                        customerNameById={customerNameById}
                        data={listOrders}
                        flow={flow}
                        showInlineEmpty={false}
                        onOrderRemoved={handleOrderRemoved}
                        onOrderSeen={handleOrderSeen}
                        onOrderStatusChange={handleOrderStatusChange}
                      />
                    </div>
                    {boardMounted ? (
                      <div
                        className={cn(
                          "min-h-0 flex-1 flex-col",
                          deferredViewMode === "board" ? "flex h-full" : "hidden",
                        )}
                      >
                        <OrdersBoard
                          customerNameById={customerNameById}
                          flow={flow}
                          orders={searchFilteredOrders}
                          ordersByStatus={ordersByStatus}
                          onOrderRemoved={handleOrderRemoved}
                          onOrderSeen={handleOrderSeen}
                          onOrderStatusChange={handleOrderStatusChange}
                        />
                      </div>
                    ) : null}
                  </div>
                )}
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
