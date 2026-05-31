import {
  fetchProductsViaProxy,
  type DashboardProductRow,
} from "@/lib/dashboard-products";
import {
  dedupeSessionLoad,
  invalidateSessionCache,
  readSessionCache,
  scheduleIdleTask,
  writeSessionCache,
  WORKSPACE_CACHE_KEYS,
  WORKSPACE_CACHE_TTL_MS,
} from "@/lib/workspace-session-cache";

export function readCachedProducts(): DashboardProductRow[] | null {
  return readSessionCache<DashboardProductRow[]>(WORKSPACE_CACHE_KEYS.products);
}

export async function loadProductsCatalog(options?: {
  force?: boolean;
}): Promise<DashboardProductRow[]> {
  if (options?.force) {
    invalidateSessionCache(WORKSPACE_CACHE_KEYS.products);
  } else {
    const cached = readCachedProducts();
    if (cached) return cached;
  }

  return dedupeSessionLoad(WORKSPACE_CACHE_KEYS.products, async () => {
    const rows = await fetchProductsViaProxy();
    writeSessionCache(WORKSPACE_CACHE_KEYS.products, rows, WORKSPACE_CACHE_TTL_MS.products);
    return rows;
  });
}

export function invalidateProductsCatalogCache(): void {
  invalidateSessionCache(WORKSPACE_CACHE_KEYS.products);
}

export async function prefetchProductsCatalog(): Promise<void> {
  if (readCachedProducts()) return;
  await loadProductsCatalog();
}

export type ProductCategoryMap = ReadonlyMap<number, string>;

export function readCachedProductCategories(): ProductCategoryMap | null {
  return readSessionCache<ProductCategoryMap>(WORKSPACE_CACHE_KEYS.productCategories);
}

export async function loadProductCategoryMap(options?: {
  force?: boolean;
}): Promise<ProductCategoryMap> {
  if (!options?.force) {
    const cached = readCachedProductCategories();
    if (cached) return cached;
  }

  return dedupeSessionLoad(WORKSPACE_CACHE_KEYS.productCategories, async () => {
    const res = await fetch("/api/backend/dashboard/product-categories", {
      cache: "no-store",
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const map = new Map<number, string>();
    if (res.ok && Array.isArray(data.categories)) {
      for (const item of data.categories) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const id = typeof o.categoryId === "number" ? o.categoryId : Number(o.categoryId);
        const name = typeof o.name === "string" ? o.name.trim() : "";
        if (Number.isFinite(id) && id >= 1 && name.length) map.set(id, name);
      }
    }

    writeSessionCache(WORKSPACE_CACHE_KEYS.productCategories, map, WORKSPACE_CACHE_TTL_MS.productCategories);
    return map;
  });
}

export async function prefetchProductCategories(): Promise<void> {
  if (readCachedProductCategories()) return;
  await loadProductCategoryMap();
}

/** Warm inventory data before navigating to /products (idle, non-blocking). */
export function prefetchInventoryWorkspaceData(): void {
  scheduleIdleTask(() => {
    void prefetchProductsCatalog();
    void prefetchProductCategories();
  });
}
