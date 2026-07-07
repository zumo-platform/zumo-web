"use client";

import type { CSSProperties, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { InfoTip } from "@/components/workspace/info-tip";
import type { PriceLevelMethod } from "@/lib/dashboard-price-levels";
import {
  marginRateLabel,
  priceFromRatePct,
  ratePctFromPrice,
  roundMoney,
} from "@/lib/pricing-engine-client";
import { formatMoney } from "@/lib/product-pricing";
import { cn } from "@/lib/utils";
import { currencySymbol, type WorkspaceCurrency } from "@/lib/workspace-currency";

const SLIDER_MAX: Record<PriceLevelMethod, number> = {
  margin: 95,
  markup: 100,
};

function sliderFillStyle(value: number, max: number): CSSProperties {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return {
    background: `linear-gradient(to right, rgb(251 191 36) 0%, rgb(251 191 36) ${pct}%, rgb(229 231 235) ${pct}%, rgb(229 231 235) 100%)`,
  };
}

function formatRatePct(ratePct: number): string {
  return ratePct % 1 === 0 ? ratePct.toFixed(0) : ratePct.toFixed(1);
}

function PricingSliderRow({
  label,
  labelTip,
  sliderId,
  min,
  max,
  step,
  value,
  disabled,
  rightInput,
  onChange,
}: Readonly<{
  label: string;
  labelTip?: string;
  sliderId: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  rightInput: ReactNode;
  onChange: (value: number) => void;
}>) {
  const clamped = Math.min(max, Math.max(min, value));
  const thumbLeft =
    max > min ? Math.min(96, Math.max(4, ((clamped - min) / (max - min)) * 100)) : 0;

  return (
    <div className="grid grid-cols-[8.5rem_1fr_7rem] items-center gap-x-4 gap-y-1 py-3">
      <span className="flex items-center gap-1 text-sm">
        {label}
        {labelTip ? <InfoTip label={label} text={labelTip} /> : null}
      </span>
      <div className="relative min-w-0 px-0.5 pt-7 pb-1">
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 z-20 -translate-x-1/2 rounded-md border border-border bg-background px-2.5 py-1 font-semibold text-foreground text-xs shadow-md tabular-nums"
          style={{ left: `${thumbLeft}%` }}
        >
          {formatRatePct(clamped)}%
        </span>
        <input
          aria-label={label}
          aria-valuetext={`${formatRatePct(clamped)}%`}
          className={cn(
            "relative z-10 block h-2.5 w-full cursor-pointer appearance-none rounded-full",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2",
            "[&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-amber-400",
            "[&::-webkit-slider-thumb]:shadow-md",
            "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white",
            "[&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-thumb]:shadow-md",
          )}
          disabled={disabled}
          id={sliderId}
          max={max}
          min={min}
          step={step}
          style={sliderFillStyle(clamped - min, max - min)}
          type="range"
          value={clamped}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      {rightInput}
    </div>
  );
}

function MoneyInput({
  value,
  disabled,
  currency,
  onChange,
}: Readonly<{
  value: number | null;
  disabled?: boolean;
  currency: WorkspaceCurrency;
  onChange: (raw: string) => void;
}>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground text-xs">
        {currencySymbol(currency)}
      </span>
      <Input
        className="h-9 bg-muted/40 pl-6 text-right tabular-nums text-sm"
        disabled={disabled}
        inputMode="decimal"
        value={value != null ? value.toFixed(2) : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function PercentInput({
  value,
  disabled,
  onChange,
}: Readonly<{
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}>) {
  return (
    <div className="relative">
      <Input
        className="h-9 bg-muted/40 pr-7 text-right tabular-nums text-sm"
        disabled={disabled}
        inputMode="decimal"
        value={String(value)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground text-xs">
        %
      </span>
    </div>
  );
}

export function ProductPricingPercentSlider({
  label,
  labelTip,
  sliderId,
  min = 0,
  max,
  step = 1,
  value,
  disabled,
  onChange,
}: Readonly<{
  label: string;
  labelTip?: string;
  sliderId: string;
  min?: number;
  max: number;
  step?: number;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}>) {
  return (
    <PricingSliderRow
      disabled={disabled}
      label={label}
      labelTip={labelTip}
      max={max}
      min={min}
      rightInput={
        <PercentInput
          disabled={disabled}
          value={value}
          onChange={(n) => onChange(Math.min(max, Math.max(min, n)))}
        />
      }
      sliderId={sliderId}
      step={step}
      value={value}
      onChange={onChange}
    />
  );
}

export function ProductPricingBandSlider({
  kind,
  method,
  ratePct,
  effectiveCost,
  disabled,
  currency,
  labelTip,
  onRateChange,
}: Readonly<{
  kind: "min" | "default" | "max";
  method: PriceLevelMethod;
  ratePct: number;
  effectiveCost: number | null;
  disabled?: boolean;
  currency: WorkspaceCurrency;
  labelTip?: string;
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
    <PricingSliderRow
      disabled={disabled || effectiveCost == null}
      label={marginRateLabel(method, kind)}
      labelTip={labelTip}
      max={max}
      min={0}
      sliderId={sliderId}
      step={1}
      value={Math.min(max, Math.max(0, ratePct))}
      rightInput={
        <MoneyInput
          currency={currency}
          disabled={disabled || effectiveCost == null}
          value={price}
          onChange={handlePriceInput}
        />
      }
      onChange={onRateChange}
    />
  );
}

export function ProductPricingYieldSlider({
  yieldPct,
  disabled,
  labelTip,
  onChange,
}: Readonly<{
  yieldPct: number;
  disabled?: boolean;
  labelTip?: string;
  onChange: (value: number) => void;
}>) {
  return (
    <PricingSliderRow
      disabled={disabled}
      label="Rendimiento"
      labelTip={labelTip}
      max={100}
      min={1}
      sliderId="product-yield-pct"
      step={1}
      value={Math.min(100, Math.max(1, yieldPct))}
      rightInput={
        <PercentInput
          disabled={disabled}
          value={yieldPct}
          onChange={(n) => onChange(Math.min(100, Math.max(1, n)))}
        />
      }
      onChange={onChange}
    />
  );
}

export function ProductPricingStaticRow({
  label,
  value,
  currency,
}: Readonly<{ label: string; value: string | null; currency: WorkspaceCurrency }>) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-center gap-4 py-2">
      <span className="text-sm">{label}</span>
      <span className="font-semibold text-sm tabular-nums">{formatMoney(value, currency)}</span>
    </div>
  );
}

export function ProductPricingMoneyField({
  label,
  value,
  disabled,
  readOnly,
  currency,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  disabled?: boolean;
  readOnly?: boolean;
  currency: WorkspaceCurrency;
  onChange?: (value: string) => void;
}>) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-center gap-4 py-2">
      <span className="text-sm">{label}</span>
      <div className="relative max-w-xs">
        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground text-xs">
          {currencySymbol(currency)}
        </span>
        <Input
          className="h-9 bg-muted/40 pl-6 tabular-nums text-sm"
          disabled={disabled}
          inputMode="decimal"
          readOnly={readOnly}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          onBlur={onChange ? undefined : undefined}
        />
      </div>
    </div>
  );
}
