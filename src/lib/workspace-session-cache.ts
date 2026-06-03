type CacheEntry<T> = Readonly<{
  value: T;
  expiresAt: number;
}>;

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function readSessionCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function writeSessionCache<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateSessionCache(key: string): void {
  store.delete(key);
  inflight.delete(key);
}

export function invalidateSessionCachePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}

/** Coalesce concurrent loads (React Strict Mode, double hover prefetch, etc.). */
export function dedupeSessionLoad<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const cached = readSessionCache<T>(key);
  if (cached !== null) return Promise.resolve(cached);

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = loader()
    .then((value) => {
      inflight.delete(key);
      return value;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, promise);
  return promise;
}

export const WORKSPACE_CACHE_KEYS = {
  bootstrap: "workspace:bootstrap",
  /** v3: inventory availability from ledger join */
  products: "workspace:products:v3",
  productCategories: "workspace:product-categories",
  orders: "workspace:orders",
  customers: "workspace:customers",
} as const;

export const WORKSPACE_CACHE_TTL_MS = {
  bootstrap: 5 * 60_000,
  products: 3 * 60_000,
  productCategories: 10 * 60_000,
  orders: 2 * 60_000,
  customers: 3 * 60_000,
} as const;

export function scheduleIdleTask(task: () => void, timeoutMs = 4000): void {
  if (typeof window === "undefined") return;
  const run = () => task();
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: timeoutMs });
    return;
  }
  globalThis.setTimeout(run, 1200);
}
