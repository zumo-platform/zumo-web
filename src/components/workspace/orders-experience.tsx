"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";

import { Package, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { OrdersBoard } from "@/components/workspace/orders-board";
import { OrdersCatalogTable } from "@/components/workspace/orders-catalog-table";
import { OrdersHeaderActions } from "@/components/workspace/orders-header-actions";
import { OrdersPageHeader } from "@/components/workspace/orders-page-header";
import { OrdersToolbar } from "@/components/workspace/orders-toolbar";
import { OrdersPageSkeleton } from "@/components/workspace/workspace-skeletons";
import type { DashboardCustomerRow } from "@/lib/dashboard-customers";
import {
  DEFAULT_ORDER_STATUS_FILTER,
  ORDERS_VIEW_STORAGE_KEY,
  normalizeOrderSearchText,
  orderMatchesStatusFilter,
  ordersBoardEmptyDescription,
  ordersBoardFilteredDescription,
  orderStatusFilterToParam,
  parseOrderStatusFilter,
  parseOrderStatusFilterLogic,
  parseOrdersViewMode,
  type DashboardOrderListRow,
  type DashboardOrderPatch,
  type OrderStatusFilterLogic,
  type OrdersViewMode,
} from "@/lib/dashboard-orders";
import {
  buildDefaultFlowItems,
  fetchSupplierFlow,
  flowToBoardColumns,
  type EffectiveStatusItem,
} from "@/lib/order-status-flow";
import {
  loadCustomersList,
  loadOrdersCatalog,
  readCachedCustomers,
  readCachedOrders,
} from "@/lib/orders-catalog-cache";
import { prefetchInventoryWorkspaceData } from "@/lib/products-catalog-cache";
import { useWorkspaceLocale } from "@/lib/use-workspace-locale";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspaceTableScrollClassName,
} from "@/lib/workspace-layout";

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

export function OrdersExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const locale = useWorkspaceLocale();

  const defaultBoardKeys = useMemo(
    () => flowToBoardColumns(buildDefaultFlowItems()).map((column) => column.key),
    [],
  );
  const cachedOrdersOnMount = readCachedOrders(defaultBoardKeys);
  const cachedCustomersOnMount = readCachedCustomers();

  const [supplierFlow, setSupplierFlow] = useState<EffectiveStatusItem[]>(() => buildDefaultFlowItems());
  const [flowReady, setFlowReady] = useState(false);
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
    return [...DEFAULT_ORDER_STATUS_FILTER];
  }, [searchParams]);

  const statusLogic = useMemo(
    (): OrderStatusFilterLogic => parseOrderStatusFilterLogic(searchParams.get("statusLogic")),
    [searchParams],
  );

  const boardStatusKeys = useMemo(
    () => flowToBoardColumns(supplierFlow).map((column) => column.key),
    [supplierFlow],
  );
  const boardStatusKeysKey = useMemo(() => boardStatusKeys.join(","), [boardStatusKeys]);

  const [orders, setOrders] = useState<DashboardOrderListRow[]>(() => cachedOrdersOnMount ?? []);
  const [ordersFetchFailed, setOrdersFetchFailed] = useState(false);
  const [ordersReady, setOrdersReady] = useState(() => cachedOrdersOnMount !== null);
  const [customerRows, setCustomerRows] = useState<DashboardCustomerRow[] | null>(
    () => cachedCustomersOnMount,
  );
  const [customersFetchFailed, setCustomersFetchFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSupplierFlow()
      .then(({ flow }) => {
        if (!cancelled) {
          setSupplierFlow(flow.length > 0 ? flow : buildDefaultFlowItems());
        }
      })
      .catch(() => {
        if (!cancelled) setSupplierFlow(buildDefaultFlowItems());
      })
      .finally(() => {
        if (!cancelled) setFlowReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!flowReady) return;
    let cancelled = false;

    void (async () => {
      const [ordersResult, customers] = await Promise.all([
        loadOrdersCatalog(boardStatusKeys),
        loadCustomersList(),
      ]);
      if (cancelled) return;

      if (ordersResult.ok) {
        setOrdersFetchFailed(false);
        setOrders(ordersResult.orders);
      } else {
        setOrdersFetchFailed(true);
        setOrders([]);
      }
      setOrdersReady(true);

      if (customers) {
        setCustomersFetchFailed(false);
        setCustomerRows(customers);
      } else {
        setCustomersFetchFailed(true);
        setCustomerRows([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [flowReady, boardStatusKeys, boardStatusKeysKey]);

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
    const timer = window.setTimeout(() => {
      setViewMode(urlView);
      if (urlView === "board") setBoardMounted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [urlView]);

  useEffect(() => {
    prefetchInventoryWorkspaceData();
  }, []);

  useEffect(() => {
    const q = debouncedQuery.trim();
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    replaceSearchParams((params) => {
      if (q) params.set("q", q);
      else params.delete("q");
    });
  }, [debouncedQuery, replaceSearchParams, searchParams]);

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
    (next: readonly string[], logic: OrderStatusFilterLogic) => {
      replaceSearchParams((params) => {
        params.set("status", orderStatusFilterToParam(next));
        if (logic === "or") params.delete("statusLogic");
        else params.set("statusLogic", logic);
      });
    },
    [replaceSearchParams],
  );

  const customerList = customerRows;

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

  const statusFilteredOrders = useMemo(
    () =>
      searchFilteredOrders.filter((o) =>
        orderMatchesStatusFilter(
          o.effectiveStatusKey ?? o.status,
          statusFilter,
          statusLogic,
        ),
      ),
    [searchFilteredOrders, statusFilter, statusLogic],
  );

  const listOrders = statusFilteredOrders;

  const ordersByStatus = useMemo(() => {
    const bucket = new Map<string, DashboardOrderListRow[]>();
    for (const order of statusFilteredOrders) {
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
  }, [statusFilteredOrders]);

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

  const pendingClient = !ordersReady || customerList === null;

  if (pendingClient) {
    return <OrdersPageSkeleton viewMode={viewMode} />;
  }

  const hasAnyOrders = orders.length > 0;
  const hasVisibleResults = statusFilteredOrders.length > 0;
  const flow = supplierFlow.length > 0 ? supplierFlow : buildDefaultFlowItems();

  const description = ordersFetchFailed
    ? "No pudimos cargar los pedidos. Revisá la conexión con el API o intentá de nuevo más tarde."
    : customersFetchFailed
      ? "Los pedidos se muestran, pero no pudimos cargar los nombres de clientes (se muestra el ID)."
      : hasAnyOrders
        ? viewMode === "board"
          ? statusFilter.length > 0
            ? ordersBoardFilteredDescription(locale, listOrders.length)
            : ordersBoardEmptyDescription(locale)
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
            "flex min-h-0 flex-1 flex-col",
            hasAnyOrders && !ordersFetchFailed ? "overflow-hidden" : workspaceTableScrollClassName,
            workspaceContentOuterClassName,
          )}
        >
          <div
            className={cn(
              workspaceContentInnerClassName,
              "min-h-0 gap-4",
              hasAnyOrders && !ordersFetchFailed ? "flex flex-1 flex-col overflow-hidden" : undefined,
            )}
          >
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
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                <header className="shrink-0 space-y-3">
                  <OrdersToolbar
                    deliveryDateFilter={deliveryDateFilter}
                    flow={flow}
                    resultCount={statusFilteredOrders.length}
                    searchQuery={searchQuery}
                    statusFilter={statusFilter}
                    statusLogic={statusLogic}
                    view={viewMode}
                    onClearSearch={() => setSearchQuery("")}
                    onDeliveryDateChange={setDeliveryDateFilter}
                    onSearchChange={setSearchQuery}
                    onStatusFilterChange={handleStatusFilterChange}
                    onViewChange={handleViewChange}
                  />
                </header>

                {!hasVisibleResults ? (
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="rounded-lg border border-dashed bg-muted/15 px-6 py-10 text-center">
                    <p className="text-muted-foreground text-sm">
                      Ningún pedido coincide con la búsqueda, el estado o el filtro de entrega.
                    </p>
                    <Button
                      className="mt-4"
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setDeliveryDateFilter("");
                        handleStatusFilterChange([], "or");
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
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
                        "min-h-0 flex-1 flex-col overflow-y-auto",
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
                          "min-h-0 flex-1 flex-col overflow-hidden",
                          deferredViewMode === "board" ? "flex h-full" : "hidden",
                        )}
                      >
                        <OrdersBoard
                          customerNameById={customerNameById}
                          flow={flow}
                          orders={statusFilteredOrders}
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
  return <OrdersPageSkeleton viewMode="list" />;
}
