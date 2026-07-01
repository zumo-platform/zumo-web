/** Types + fetch for GET/PATCH /dashboard/products/{id}/pricing. */

import type { PriceLevelBasis, PriceLevelMethod } from "@/lib/dashboard-price-levels";

export type ProductLevelPriceRow = Readonly<{
  priceLevelId: number;
  levelName: string;
  method: PriceLevelMethod;
  basis: PriceLevelBasis;
  levelDefaultRatePct: string;
  levelMinRatePct: string | null;
  levelMaxRatePct: string | null;
  derivedPrice: string | null;
  realizedMarginPct: string | null;
  effectiveCost: string | null;
  bandMin: string | null;
  bandMax: string | null;
  status: string;
  clamped: boolean;
  computedAt: string | null;
  hasOverride: boolean;
  overrideDefaultRatePct: string | null;
  overrideMinRatePct: string | null;
  overrideMaxRatePct: string | null;
}>;

export type ProductPricingDetail = Readonly<{
  productId: number;
  cost: string | null;
  avgCost: string | null;
  marketVal: string | null;
  yieldPercent: string | null;
  listPrice: string | null;
  levels: ProductLevelPriceRow[];
}>;

function backendPath(path: string): string {
  return `/api/backend${path.startsWith("/") ? path : `/${path}`}`;
}

function parsePricing(raw: unknown): ProductPricingDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const productId = typeof o.productId === "number" ? o.productId : Number(o.productId);
  if (!Number.isFinite(productId) || productId <= 0) return null;
  const strOrNull = (k: string) =>
    typeof o[k] === "string" ? o[k] : o[k] != null ? String(o[k]) : null;
  const levels: ProductLevelPriceRow[] = [];
  if (Array.isArray(o.levels)) {
    for (const row of o.levels) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const priceLevelId =
        typeof r.priceLevelId === "number" ? r.priceLevelId : Number(r.priceLevelId);
      if (!Number.isFinite(priceLevelId)) continue;
      levels.push({
        priceLevelId,
        levelName: typeof r.levelName === "string" ? r.levelName : "",
        method: r.method === "markup" ? "markup" : "margin",
        basis:
          r.basis === "avg_cost"
            ? "avg_cost"
            : r.basis === "market_val"
              ? "market_val"
              : "cost",
        levelDefaultRatePct:
          typeof r.levelDefaultRatePct === "string" ? r.levelDefaultRatePct : "0",
        levelMinRatePct:
          typeof r.levelMinRatePct === "string" ? r.levelMinRatePct : null,
        levelMaxRatePct:
          typeof r.levelMaxRatePct === "string" ? r.levelMaxRatePct : null,
        derivedPrice: typeof r.derivedPrice === "string" ? r.derivedPrice : null,
        realizedMarginPct:
          typeof r.realizedMarginPct === "string" ? r.realizedMarginPct : null,
        effectiveCost: typeof r.effectiveCost === "string" ? r.effectiveCost : null,
        bandMin: typeof r.bandMin === "string" ? r.bandMin : null,
        bandMax: typeof r.bandMax === "string" ? r.bandMax : null,
        status: typeof r.status === "string" ? r.status : "needs_manual",
        clamped: Boolean(r.clamped),
        computedAt: typeof r.computedAt === "string" ? r.computedAt : null,
        hasOverride: Boolean(r.hasOverride),
        overrideDefaultRatePct:
          typeof r.overrideDefaultRatePct === "string" ? r.overrideDefaultRatePct : null,
        overrideMinRatePct:
          typeof r.overrideMinRatePct === "string" ? r.overrideMinRatePct : null,
        overrideMaxRatePct:
          typeof r.overrideMaxRatePct === "string" ? r.overrideMaxRatePct : null,
      });
    }
  }
  return {
    productId,
    cost: strOrNull("cost"),
    avgCost: strOrNull("avgCost"),
    marketVal: strOrNull("marketVal"),
    yieldPercent: strOrNull("yieldPercent"),
    listPrice: strOrNull("listPrice"),
    levels,
  };
}

export async function fetchProductPricingViaProxy(
  productId: number,
): Promise<ProductPricingDetail | null> {
  const res = await fetch(backendPath(`/dashboard/products/${String(productId)}/pricing`), {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${String(res.status)}`);
  }
  return parsePricing(data.pricing);
}

async function parseJson(res: Response): Promise<unknown> {
  return res.json().catch(() => ({}));
}

export async function patchProductPricingInputsViaProxy(
  productId: number,
  input: Readonly<{ marketVal?: string | null; yieldPercent?: string | null }>,
): Promise<ProductPricingDetail | null> {
  const res = await fetch(backendPath(`/dashboard/products/${String(productId)}/pricing`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${String(res.status)}`);
  }
  return parsePricing(data.pricing);
}

export async function upsertProductPriceOverrideViaProxy(
  productId: number,
  priceLevelId: number,
  input: Readonly<{
    defaultRatePct: number;
    minRatePct?: number | null;
    maxRatePct?: number | null;
  }>,
): Promise<ProductPricingDetail | null> {
  const res = await fetch(
    backendPath(
      `/dashboard/products/${String(productId)}/pricing/overrides/${String(priceLevelId)}`,
    ),
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${String(res.status)}`);
  }
  return parsePricing(data.pricing);
}

export async function deleteProductPriceOverrideViaProxy(
  productId: number,
  priceLevelId: number,
): Promise<ProductPricingDetail | null> {
  const res = await fetch(
    backendPath(
      `/dashboard/products/${String(productId)}/pricing/overrides/${String(priceLevelId)}`,
    ),
    { method: "DELETE", credentials: "include" },
  );
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${String(res.status)}`);
  }
  return parsePricing(data.pricing);
}

export function formatMoney(value: string | null | undefined): string {
  if (value == null || value.trim() === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatRatePct(value: string | null | undefined): string {
  if (value == null || value.trim() === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}%`;
}
