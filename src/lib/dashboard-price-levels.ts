/** Types + fetch helpers for /dashboard/price-levels. */

export type PriceLevelMethod = "margin" | "markup";
export type PriceLevelBasis = "cost" | "avg_cost" | "market_val";

export type PriceLevelSummary = Readonly<{
  priceLevelId: number;
  name: string;
  description: string | null;
  method: PriceLevelMethod;
  basis: PriceLevelBasis;
  defaultRatePct: string;
  minRatePct: string | null;
  maxRatePct: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  categoryCount: number;
}>;

export type PriceLevelDetail = PriceLevelSummary &
  Readonly<{
    categoryIds: number[];
  }>;

export type CreatePriceLevelPayload = Readonly<{
  name: string;
  description?: string | null;
  method: PriceLevelMethod;
  basis: PriceLevelBasis;
  defaultRatePct: number;
  minRatePct?: number | null;
  maxRatePct?: number | null;
  active?: boolean;
  categoryIds?: number[];
}>;

function backendPath(path: string): string {
  return `/api/backend${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseJson(res: Response): Promise<unknown> {
  return res.json().catch(() => ({}));
}

function parseSummary(raw: unknown): PriceLevelSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const priceLevelId =
    typeof o.priceLevelId === "number" ? o.priceLevelId : Number(o.priceLevelId);
  if (!Number.isFinite(priceLevelId) || priceLevelId <= 0) return null;
  return {
    priceLevelId,
    name: typeof o.name === "string" ? o.name : "",
    description: typeof o.description === "string" ? o.description : null,
    method: o.method === "markup" ? "markup" : "margin",
    basis:
      o.basis === "avg_cost" ? "avg_cost" : o.basis === "market_val" ? "market_val" : "cost",
    defaultRatePct: typeof o.defaultRatePct === "string" ? o.defaultRatePct : "0",
    minRatePct: typeof o.minRatePct === "string" ? o.minRatePct : null,
    maxRatePct: typeof o.maxRatePct === "string" ? o.maxRatePct : null,
    active: o.active !== false,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : "",
    categoryCount:
      typeof o.categoryCount === "number" && Number.isFinite(o.categoryCount)
        ? o.categoryCount
        : 0,
  };
}

function parseDetail(raw: unknown): PriceLevelDetail | null {
  const base = parseSummary(raw);
  if (!base) return null;
  const o = raw as Record<string, unknown>;
  const categoryIds: number[] = [];
  if (Array.isArray(o.categoryIds)) {
    for (const id of o.categoryIds) {
      const n = typeof id === "number" ? id : Number(id);
      if (Number.isFinite(n) && n > 0) categoryIds.push(n);
    }
  }
  return { ...base, categoryIds };
}

export async function fetchPriceLevelsViaProxy(): Promise<PriceLevelSummary[]> {
  const res = await fetch(backendPath("/dashboard/price-levels"), {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${String(res.status)}`);
  }
  const rows = Array.isArray(data.levels) ? data.levels : [];
  return rows.map(parseSummary).filter((r): r is PriceLevelSummary => r != null);
}

export async function fetchPriceLevelViaProxy(
  priceLevelId: number,
): Promise<PriceLevelDetail | null> {
  const res = await fetch(backendPath(`/dashboard/price-levels/${String(priceLevelId)}`), {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${String(res.status)}`);
  }
  return parseDetail(data.level);
}

export async function createPriceLevelViaProxy(
  payload: CreatePriceLevelPayload,
): Promise<PriceLevelDetail | null> {
  const res = await fetch(backendPath("/dashboard/price-levels"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${String(res.status)}`);
  }
  return parseDetail(data.level);
}

export async function updatePriceLevelViaProxy(
  priceLevelId: number,
  payload: Partial<CreatePriceLevelPayload>,
): Promise<PriceLevelDetail | null> {
  const res = await fetch(backendPath(`/dashboard/price-levels/${String(priceLevelId)}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${String(res.status)}`);
  }
  return parseDetail(data.level);
}

export async function deactivatePriceLevelViaProxy(priceLevelId: number): Promise<void> {
  const res = await fetch(backendPath(`/dashboard/price-levels/${String(priceLevelId)}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = (await parseJson(res)) as Record<string, unknown>;
    throw new Error(typeof data.error === "string" ? data.error : `Error ${String(res.status)}`);
  }
}

export async function recalculatePriceLevelViaProxy(
  priceLevelId: number,
): Promise<{ productCount: number; level: PriceLevelDetail | null }> {
  const res = await fetch(
    backendPath(`/dashboard/price-levels/${String(priceLevelId)}/recalculate`),
    { method: "POST", credentials: "include" },
  );
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${String(res.status)}`);
  }
  const productCount =
    typeof data.productCount === "number" && Number.isFinite(data.productCount)
      ? data.productCount
      : 0;
  return { productCount, level: parseDetail(data.level) };
}

export const PRICE_METHOD_LABEL: Record<PriceLevelMethod, string> = {
  margin: "Margen",
  markup: "Sobreprecio",
};

export const PRICE_BASIS_LABEL: Record<PriceLevelBasis, string> = {
  cost: "Costo",
  avg_cost: "Costo promedio",
  market_val: "Valor de mercado",
};
