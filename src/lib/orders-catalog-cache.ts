import {
  mergeAndSortOrders,
  parseDashboardOrdersEnvelope,
  type DashboardOrderListRow,
  type DashboardOrdersFetchResult,
} from "@/lib/dashboard-orders";
import { parseDashboardCustomersEnvelope, type DashboardCustomerRow } from "@/lib/dashboard-customers";
import {
  dedupeSessionLoad,
  invalidateSessionCache,
  invalidateSessionCachePrefix,
  readSessionCache,
  scheduleIdleTask,
  writeSessionCache,
  WORKSPACE_CACHE_KEYS,
  WORKSPACE_CACHE_TTL_MS,
} from "@/lib/workspace-session-cache";
import {
  buildDefaultFlowItems,
  flowToBoardColumns,
} from "@/lib/order-status-flow";

function ordersCacheKey(statusKeys: readonly string[]): string {
  return `${WORKSPACE_CACHE_KEYS.orders}:${[...statusKeys].sort().join(",")}`;
}

async function fetchOrdersFromProxy(statusKeys: readonly string[]): Promise<DashboardOrdersFetchResult> {
  const origin = window.location.origin;
  const sortedKeys = [...statusKeys].sort();
  const batchUrl = `${origin}/api/backend/dashboard/orders?status=${encodeURIComponent(sortedKeys.join(","))}`;

  try {
    const res = await fetch(batchUrl, { credentials: "same-origin", cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true, orders: mergeAndSortOrders(parseDashboardOrdersEnvelope(body)) };
    }
    // Older API builds reject comma-separated status; fall back to one request per column.
    if (res.status !== 400) return { ok: false };
  } catch {
    return { ok: false };
  }

  const chunks = await Promise.all(
    sortedKeys.map(async (status) => {
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

export function readCachedOrders(statusKeys: readonly string[]): DashboardOrderListRow[] | null {
  return readSessionCache<DashboardOrderListRow[]>(ordersCacheKey(statusKeys));
}

export async function loadOrdersCatalog(
  statusKeys: readonly string[],
  options?: { force?: boolean },
): Promise<DashboardOrdersFetchResult> {
  const key = ordersCacheKey(statusKeys);

  if (options?.force) {
    invalidateSessionCache(key);
  } else {
    const cached = readSessionCache<DashboardOrderListRow[]>(key);
    if (cached) return { ok: true, orders: cached };
  }

  return dedupeSessionLoad(key, async () => {
    const result = await fetchOrdersFromProxy(statusKeys);
    if (result.ok) {
      writeSessionCache(key, result.orders, WORKSPACE_CACHE_TTL_MS.orders);
    }
    return result;
  });
}

export function invalidateOrdersCatalogCache(): void {
  invalidateSessionCachePrefix(`${WORKSPACE_CACHE_KEYS.orders}:`);
}

export function readCachedCustomers(): DashboardCustomerRow[] | null {
  return readSessionCache<DashboardCustomerRow[]>(WORKSPACE_CACHE_KEYS.customers);
}

async function fetchCustomersFromProxy(): Promise<DashboardCustomerRow[] | null> {
  const url = `${window.location.origin}/api/backend/dashboard/customers`;
  try {
    const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return parseDashboardCustomersEnvelope(body);
  } catch {
    return null;
  }
}

export async function loadCustomersList(options?: { force?: boolean }): Promise<DashboardCustomerRow[] | null> {
  if (!options?.force) {
    const cached = readCachedCustomers();
    if (cached) return cached;
  }

  return dedupeSessionLoad(WORKSPACE_CACHE_KEYS.customers, async () => {
    const rows = await fetchCustomersFromProxy();
    if (rows) {
      writeSessionCache(WORKSPACE_CACHE_KEYS.customers, rows, WORKSPACE_CACHE_TTL_MS.customers);
    }
    return rows;
  });
}

export function invalidateCustomersCache(): void {
  invalidateSessionCache(WORKSPACE_CACHE_KEYS.customers);
}

function defaultBoardStatusKeys(): string[] {
  return flowToBoardColumns(buildDefaultFlowItems()).map((column) => column.key);
}

export async function prefetchOrdersCatalog(
  statusKeys: readonly string[] = defaultBoardStatusKeys(),
): Promise<void> {
  if (readCachedOrders(statusKeys)) return;
  await loadOrdersCatalog(statusKeys);
}

export function prefetchOrdersWorkspaceData(): void {
  scheduleIdleTask(() => {
    void prefetchOrdersCatalog();
    void loadCustomersList();
  });
}

export function prefetchCustomersWorkspaceData(): void {
  scheduleIdleTask(() => {
    void loadCustomersList();
  });
}
