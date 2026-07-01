"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PriceLevelMethod } from "@/lib/dashboard-price-levels";
import {
  marginRateLabel,
  priceFromRatePct,
  ratePctFromPrice,
  roundMoney,
} from "@/lib/pricing-engine-client";
import { formatMoney } from "@/lib/product-pricing";
import { cn } from "@/lib/utils";

const SLIDER_MAX: Record<PriceLevelMethod, number> = {
  margin: 95,
  markup: 100,
};

export function ProductPricingBandSlider({
  kind,
  method,
  ratePct,
  effectiveCost,
  disabled,
  onRateChange,
}: Readonly<{
  kind: "min" | "default" | "max";
  method: PriceLevelMethod;
  ratePct: number;
  effectiveCost: number | null;
  disabled?: boolean;
  onRateChange: (ratePct: number) => void;
}>) {
  const max = SLIDER_MAX[method];
  const price =
    effectiveCost != null ? priceFromRatePct(effectiveCost, method, ratePct) : null;
  const sliderId = `${kind}-${method}-rate`;

  function handlePriceInput(raw: string) {
    if (effectiveCost == null || disabled) return;
    const n = Number(raw.replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(n) || n <= 0) return;
    const nextRate = ratePctFromPrice(effectiveCost, method, n);
    if (nextRate != null) onRateChange(roundMoney(nextRate * 10) / 10);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-muted-foreground text-xs" htmlFor={sliderId}>
          {marginRateLabel(method, kind)}
        </Label>
        <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-[11px] tabular-nums">
          {ratePct % 1 === 0 ? ratePct.toFixed(0) : ratePct.toFixed(1)}%
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          aria-label={marginRateLabel(method, kind)}
          className={cn(
            "h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-muted",
            "accent-amber-400 disabled:cursor-not-allowed disabled:opacity-50",
            "[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400",
            "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
            "[&::-moz-range-thumb]:bg-amber-400",
          )}
          disabled={disabled || effectiveCost == null}
          id={sliderId}
          max={max}
          min={0}
          step={1}
          type="range"
          value={Math.min(max, Math.max(0, ratePct))}
          onChange={(e) => onRateChange(Number(e.target.value))}
        />
        <div className="relative w-22 shrink-0">
          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground text-xs">
            $
          </span>
          <Input
            className="h-8 pl-5 text-right tabular-nums text-xs"
            disabled={disabled || effectiveCost == null}
            inputMode="decimal"
            value={price != null ? price.toFixed(2) : ""}
            onChange={(e) => handlePriceInput(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export function ProductPricingYieldSlider({
  yieldPct,
  disabled,
  onChange,
}: Readonly<{
  yieldPct: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}>) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-muted-foreground text-xs" htmlFor="product-yield-pct">
          Rendimiento
        </Label>
        <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-[11px] tabular-nums">
          {yieldPct % 1 === 0 ? yieldPct.toFixed(0) : yieldPct.toFixed(1)}%
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          aria-label="Rendimiento"
          className={cn(
            "h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-muted",
            "accent-amber-400 disabled:cursor-not-allowed disabled:opacity-50",
            "[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400",
            "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
            "[&::-moz-range-thumb]:bg-amber-400",
          )}
          disabled={disabled}
          id="product-yield-pct"
          max={100}
          min={1}
          step={1}
          type="range"
          value={Math.min(100, Math.max(1, yieldPct))}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className="relative w-22 shrink-0">
          <Input
            className="h-8 text-right tabular-nums text-xs"
            disabled={disabled}
            inputMode="decimal"
            value={String(yieldPct)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(Math.min(100, Math.max(1, n)));
            }}
          />
          <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground text-xs">
            %
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProductPricingListRow({
  label,
  value,
}: Readonly<{ label: string; value: string | null }>) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{formatMoney(value)}</span>
    </div>
  );
}
