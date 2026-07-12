/** Stock count (cycle count) API clients. */

export type StockCountStatus = "open" | "counting" | "review" | "applied" | "cancelled";

export type StockCountRow = Readonly<{
  countId: string;
  name: string | null;
  warehouseId: number;
  warehouseName: string;
  status: StockCountStatus;
  createdAt: string;
  appliedAt: string | null;
  productCount: number;
  countedCount: number;
}>;

export type StockCountLineDetail = Readonly<{
  productId: number;
  name: string;
  sku: string | null;
  warehouseName: string;
  vendorId: number | null;
  vendorName: string | null;
  systemQty: number;
  countedQty: number | null;
  variance: number | null;
}>;

export type StockCountDetail = Readonly<{
  countId: string;
  name: string | null;
  warehouseId: number;
  warehouseName: string;
  status: StockCountStatus;
  notes: string | null;
  createdAt: string;
  appliedAt: string | null;
  productCount: number;
  countedCount: number;
  lines: readonly StockCountLineDetail[];
}>;

export type StockCountScope =
  | Readonly<{ kind: "all" }>
  | Readonly<{ kind: "category"; categoryIds: readonly number[] }>;

export type CreateStockCountPayload = Readonly<{
  warehouseId: number;
  name?: string | null;
  scope: StockCountScope;
  includeZeroStock?: boolean;
}>;

const DEFAULT_TIMEOUT_MS = 30_000;

function rethrowFetchAbort(err: unknown, parentSignal?: AbortSignal): never {
  if (err instanceof DOMException && err.name === "AbortError") {
    if (parentSignal?.aborted) throw err;
    throw new Error("La carga tardó demasiado");
  }
  throw err;
}

function parseCountRow(raw: unknown): StockCountRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.countId !== "string" || typeof r.warehouseId !== "number") return null;
  const num = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;
  const status = r.status;
  if (
    status !== "open" &&
    status !== "counting" &&
    status !== "review" &&
    status !== "applied" &&
    status !== "cancelled"
  ) {
    return null;
  }
  return {
    countId: r.countId,
    name: typeof r.name === "string" ? r.name : null,
    warehouseId: r.warehouseId,
    warehouseName: typeof r.warehouseName === "string" ? r.warehouseName : "—",
    status,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    appliedAt: typeof r.appliedAt === "string" ? r.appliedAt : null,
    productCount: num(r.productCount),
    countedCount: num(r.countedCount),
  };
}

function parseLineDetail(raw: unknown): StockCountLineDetail | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.productId !== "number" || typeof r.name !== "string") return null;
  const numOrNull = (v: unknown): number | null =>
    v == null ? null : typeof v === "number" && Number.isFinite(v) ? v : null;
  const num = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;
  return {
    productId: r.productId,
    name: r.name,
    sku: typeof r.sku === "string" ? r.sku : null,
    warehouseName: typeof r.warehouseName === "string" ? r.warehouseName : "—",
    vendorId: typeof r.vendorId === "number" ? r.vendorId : null,
    vendorName: typeof r.vendorName === "string" ? r.vendorName : null,
    systemQty: num(r.systemQty),
    countedQty: numOrNull(r.countedQty),
    variance: numOrNull(r.variance),
  };
}

function parseCountDetail(raw: unknown): StockCountDetail | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const header = parseCountRow(raw);
  if (!header) return null;
  const linesRaw = Array.isArray(r.lines) ? r.lines : [];
  const lines: StockCountLineDetail[] = [];
  for (const item of linesRaw) {
    const line = parseLineDetail(item);
    if (line) lines.push(line);
  }
  return {
    ...header,
    notes: typeof r.notes === "string" ? r.notes : null,
    lines,
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number; parentSignal?: AbortSignal },
): Promise<Response> {
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const ctrl = new AbortController();
  if (init.parentSignal) {
    if (init.parentSignal.aborted) ctrl.abort();
    else init.parentSignal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      credentials: "include",
      signal: ctrl.signal,
    });
  } catch (err) {
    rethrowFetchAbort(err, init.parentSignal);
  } finally {
    clearTimeout(timer);
  }
}

export function formatStockCountNumber(countId: string): string {
  const stripped = countId.startsWith("scn_") ? countId.slice(4) : countId;
  return stripped.slice(0, 8).toUpperCase();
}

export async function fetchStockCountsViaProxy(
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<StockCountRow[]> {
  const res = await fetchWithTimeout("/api/backend/dashboard/inventory/stock-counts", {
    method: "GET",
    timeoutMs: opts?.timeoutMs,
    parentSignal: opts?.signal,
  });
  const data = (await res.json().catch(() => ({}))) as { counts?: unknown[]; error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
  }
  if (!Array.isArray(data.counts)) return [];
  const rows: StockCountRow[] = [];
  for (const item of data.counts) {
    const row = parseCountRow(item);
    if (row) rows.push(row);
  }
  return rows;
}

export async function fetchStockCountViaProxy(
  countId: string,
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<StockCountDetail> {
  const res = await fetchWithTimeout(
    `/api/backend/dashboard/inventory/stock-counts/${encodeURIComponent(countId)}`,
    { method: "GET", timeoutMs: opts?.timeoutMs, parentSignal: opts?.signal },
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
  }
  const detail = parseCountDetail(data);
  if (!detail) throw new Error("Respuesta inválida del servidor");
  return detail;
}

export async function createStockCountViaProxy(
  payload: CreateStockCountPayload,
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<{ countId: string }> {
  const res = await fetchWithTimeout("/api/backend/dashboard/inventory/stock-counts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    timeoutMs: opts?.timeoutMs,
    parentSignal: opts?.signal,
  });
  const data = (await res.json().catch(() => ({}))) as { countId?: string; error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
  }
  if (typeof data.countId !== "string") throw new Error("Respuesta inválida del servidor");
  return { countId: data.countId };
}

export async function saveStockCountLinesViaProxy(
  countId: string,
  lines: ReadonlyArray<{ productId: number; countedQty: number | null }>,
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<void> {
  const res = await fetchWithTimeout(
    `/api/backend/dashboard/inventory/stock-counts/${encodeURIComponent(countId)}/lines`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
      timeoutMs: opts?.timeoutMs,
      parentSignal: opts?.signal,
    },
  );
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
  }
}

export async function completeStockCountViaProxy(
  countId: string,
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<{ applied: number; adjustedLines: number }> {
  const res = await fetchWithTimeout(
    `/api/backend/dashboard/inventory/stock-counts/${encodeURIComponent(countId)}/complete`,
    {
      method: "POST",
      timeoutMs: opts?.timeoutMs,
      parentSignal: opts?.signal,
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    applied?: number;
    adjustedLines?: number;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
  }
  return {
    applied: typeof data.applied === "number" ? data.applied : 0,
    adjustedLines: typeof data.adjustedLines === "number" ? data.adjustedLines : 0,
  };
}

export async function cancelStockCountViaProxy(
  countId: string,
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<void> {
  const res = await fetchWithTimeout(
    `/api/backend/dashboard/inventory/stock-counts/${encodeURIComponent(countId)}/cancel`,
    {
      method: "POST",
      timeoutMs: opts?.timeoutMs,
      parentSignal: opts?.signal,
    },
  );
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
  }
}

export const STOCK_COUNT_STATUS_LABEL: Record<StockCountStatus, string> = {
  open: "Abierto",
  counting: "En conteo",
  review: "Revisión",
  applied: "Aplicado",
  cancelled: "Cancelado",
};

export function stockCountStatusBadgeVariant(
  status: StockCountStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "counting":
      return "secondary";
    case "review":
      return "outline";
    case "applied":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}
