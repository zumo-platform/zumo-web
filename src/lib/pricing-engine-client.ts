/** Client-side mirror of packages/core/src/pricing/engine.ts for live UI previews. */

import type { PriceLevelBasis, PriceLevelMethod } from "@/lib/dashboard-price-levels";

export type PricingInputs = Readonly<{
  cost: number | null;
  avgCost: number | null;
  marketVal: number | null;
  yieldPercent: number | null;
}>;

export function parsePricingNumber(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function yieldMultiplier(yieldPercent: number | null): number | null {
  const y = yieldPercent ?? 100;
  if (y <= 0 || y > 100) return null;
  return y / 100;
}

export function effectiveCost(
  base: number | null,
  yieldPercent: number | null,
): number | null {
  if (base == null) return null;
  const mult = yieldMultiplier(yieldPercent);
  if (mult == null) return null;
  return base / mult;
}

export function basisAcquirePrice(
  inputs: PricingInputs,
  basis: PriceLevelBasis,
): number | null {
  const raw =
    basis === "cost"
      ? inputs.cost
      : basis === "avg_cost"
        ? inputs.avgCost
        : inputs.marketVal;
  return raw;
}

export function priceFromRatePct(
  effective: number,
  method: PriceLevelMethod,
  ratePct: number,
): number | null {
  if (!Number.isFinite(ratePct) || ratePct < 0) return null;
  const rate = ratePct / 100;
  if (method === "margin") {
    if (rate >= 1) return null;
    return roundMoney(effective / (1 - rate));
  }
  return roundMoney(effective * (1 + rate));
}

export function ratePctFromPrice(
  effective: number,
  method: PriceLevelMethod,
  price: number,
): number | null {
  if (effective <= 0 || price <= 0) return null;
  if (method === "margin") {
    const rate = 1 - effective / price;
    return Math.max(0, Math.min(99, rate * 100));
  }
  const rate = price / effective - 1;
  return Math.max(0, Math.min(100, rate * 100));
}

export function marginRateLabel(method: PriceLevelMethod, kind: "min" | "default" | "max"): string {
  const noun = method === "margin" ? "Margen" : "Sobreprecio";
  if (kind === "min") return `${noun} mínimo`;
  if (kind === "max") return `${noun} máximo`;
  return method === "margin" ? "Margen objetivo" : "Sobreprecio objetivo";
}

export function acquirePriceLabel(basis: PriceLevelBasis): string {
  if (basis === "avg_cost") return "Costo promedio";
  if (basis === "market_val") return "Valor de mercado";
  return "Costo de adquisición";
}
