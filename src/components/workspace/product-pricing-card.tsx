"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Loader2, RotateCcw } from "lucide-react";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/workspace/info-tip";
import { ProductPricingBaseFields } from "@/components/workspace/product-pricing-base-fields";
import {
  ProductPricingBandSlider,
  ProductPricingYieldSlider,
} from "@/components/workspace/product-pricing-band-slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRICE_BASIS_LABEL, PRICE_METHOD_LABEL } from "@/lib/dashboard-price-levels";
import type { PriceLevelBasis } from "@/lib/dashboard-price-levels";
import { PRICING_TOOLTIPS } from "@/lib/pricing-copy";
import {
  acquirePriceLabel,
  basisAcquirePrice,
  effectiveCost,
  parsePricingNumber,
} from "@/lib/pricing-engine-client";
import {
  deleteProductPriceOverrideViaProxy,
  fetchProductPricingViaProxy,
  patchProductPricingInputsViaProxy,
  upsertProductPriceOverrideViaProxy,
  type ProductLevelPriceRow,
  type ProductPricingDetail,
} from "@/lib/product-pricing";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";
import { currencySymbol, type WorkspaceCurrency } from "@/lib/workspace-currency";

function effectiveRatePct(
  override: string | null | undefined,
  level: string | null | undefined,
  fallback: string,
): number {
  const raw = override ?? level ?? fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function ratesMatchLevel(row: ProductLevelPriceRow, min: number, def: number, max: number | null): boolean {
  const levelMin = row.levelMinRatePct != null ? Number(row.levelMinRatePct) : null;
  const levelMax = row.levelMaxRatePct != null ? Number(row.levelMaxRatePct) : null;
  const levelDef = Number(row.levelDefaultRatePct);
  const minOk = levelMin == null ? min === 0 || !Number.isFinite(min) : Math.abs(min - levelMin) < 0.05;
  const defOk = Math.abs(def - levelDef) < 0.05;
  const maxOk =
    levelMax == null
      ? max == null || max === def
      : max != null && Math.abs(max - levelMax) < 0.05;
  return minOk && defOk && maxOk;
}

function RequiredMark() {
  return (
    <abbr className="ml-0.5 cursor-help text-destructive no-underline" title="Obligatorio">
      *
    </abbr>
  );
}

function PricingMoneyInput({
  currency,
  disabled,
  id,
  label,
  labelTip,
  required,
  value,
  onBlur,
  onChange,
}: Readonly<{
  currency: WorkspaceCurrency;
  disabled?: boolean;
  id: string;
  label: string;
  labelTip?: string;
  required?: boolean;
  value: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
}>) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] items-center gap-4">
      <span className="flex items-center gap-1 text-sm">
        {label}
        {required ? <RequiredMark /> : null}
        {labelTip ? <InfoTip label={label} text={labelTip} /> : null}
      </span>
      <div className="relative max-w-xs">
        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground text-xs">
          {currencySymbol(currency)}
        </span>
        <input
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 pl-6 text-sm tabular-nums shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          id={id}
          inputMode="decimal"
          value={value}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function marginTip(method: "margin" | "markup", kind: "min" | "default" | "max"): string {
  if (kind === "min") return PRICING_TOOLTIPS.bandMin;
  if (kind === "max") return PRICING_TOOLTIPS.bandMax;
  return method === "margin" ? PRICING_TOOLTIPS.targetRate : PRICING_TOOLTIPS.markup;
}

function LevelPricingSection({
  productId,
  row,
  pricing,
  yieldPct,
  marketVal,
  canEdit,
  currency,
  onUpdated,
}: Readonly<{
  productId: number;
  row: ProductLevelPriceRow;
  pricing: ProductPricingDetail;
  yieldPct: number;
  marketVal: string;
  canEdit: boolean;
  currency: WorkspaceCurrency;
  onUpdated: (detail: ProductPricingDetail) => void;
}>) {
  const inputs = useMemo(
    () => ({
      cost: parsePricingNumber(pricing.cost),
      avgCost: parsePricingNumber(pricing.avgCost),
      marketVal: parsePricingNumber(marketVal.trim() || pricing.marketVal),
      yieldPercent: yieldPct,
    }),
    [marketVal, pricing.avgCost, pricing.cost, pricing.marketVal, yieldPct],
  );

  const acquire = basisAcquirePrice(inputs, row.basis);
  const eff = effectiveCost(acquire, yieldPct);

  const [minRate, setMinRate] = useState(() =>
    effectiveRatePct(row.overrideMinRatePct, row.levelMinRatePct, "0"),
  );
  const [defaultRate, setDefaultRate] = useState(() =>
    effectiveRatePct(row.overrideDefaultRatePct, row.levelDefaultRatePct, row.levelDefaultRatePct),
  );
  const [maxRate, setMaxRate] = useState<number | null>(() => {
    const raw = row.overrideMaxRatePct ?? row.levelMaxRatePct;
    return raw != null && raw !== "" ? Number(raw) : null;
  });
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    setMinRate(effectiveRatePct(row.overrideMinRatePct, row.levelMinRatePct, "0"));
    setDefaultRate(
      effectiveRatePct(row.overrideDefaultRatePct, row.levelDefaultRatePct, row.levelDefaultRatePct),
    );
    const rawMax = row.overrideMaxRatePct ?? row.levelMaxRatePct;
    setMaxRate(rawMax != null && rawMax !== "" ? Number(rawMax) : null);
    dirtyRef.current = false;
  }, [row]);

  async function saveOverride() {
    if (!canEdit || eff == null) {
      toast.error(`Completá ${acquirePriceLabel(row.basis).toLowerCase()} para guardar.`);
      return;
    }
    if (minRate > defaultRate) {
      toast.error("El margen mínimo no puede ser mayor que el objetivo.");
      return;
    }
    if (maxRate != null && defaultRate > maxRate) {
      toast.error("El margen objetivo no puede ser mayor que el máximo.");
      return;
    }

    setSaving(true);
    try {
      const matchesLevel = ratesMatchLevel(row, minRate, defaultRate, maxRate);
      if (matchesLevel && row.hasOverride) {
        const detail = await deleteProductPriceOverrideViaProxy(productId, row.priceLevelId);
        if (detail) onUpdated(detail);
        toast.success("Volvió a heredar del nivel.");
        return;
      }

      const detail = await upsertProductPriceOverrideViaProxy(productId, row.priceLevelId, {
        defaultRatePct: defaultRate,
        minRatePct: minRate,
        maxRatePct: maxRate,
      });
      if (detail) onUpdated(detail);
      toast.success("Precio del producto guardado.");
      dirtyRef.current = false;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function revertToLevel() {
    if (!canEdit || (!row.hasOverride && !dirtyRef.current)) return;
    setSaving(true);
    try {
      const detail = await deleteProductPriceOverrideViaProxy(productId, row.priceLevelId);
      if (detail) onUpdated(detail);
      toast.success("Volvió a heredar del nivel.");
      dirtyRef.current = false;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo revertir.");
    } finally {
      setSaving(false);
    }
  }

  function markDirty() {
    dirtyRef.current = true;
  }

  const maxRateValue = maxRate ?? defaultRate;
  const slidersDisabled = !canEdit || saving || eff == null;

  return (
    <div className="space-y-1 border-t pt-4">
      <div className="mb-3">
        <p className="font-medium text-sm">{row.levelName}</p>
        <p className="text-muted-foreground text-xs">
          {PRICE_METHOD_LABEL[row.method]} sobre {PRICE_BASIS_LABEL[row.basis].toLowerCase()}
          {row.hasOverride || dirtyRef.current ? " · Ajuste manual" : ""}
        </p>
      </div>

      {eff == null ? (
        <p className="pb-2 text-amber-700 text-sm dark:text-amber-300">
          Agregá {PRICE_BASIS_LABEL[row.basis].toLowerCase()} para calcular márgenes en este nivel.
        </p>
      ) : null}

      <div className="divide-y">
        <ProductPricingBandSlider
          currency={currency}
          disabled={slidersDisabled}
          effectiveCost={eff}
          kind="min"
          labelTip={marginTip(row.method, "min")}
          method={row.method}
          ratePct={minRate}
          onRateChange={(v) => {
            markDirty();
            setMinRate(Math.min(v, defaultRate));
          }}
        />
        <ProductPricingBandSlider
          currency={currency}
          disabled={slidersDisabled}
          effectiveCost={eff}
          kind="default"
          labelTip={marginTip(row.method, "default")}
          method={row.method}
          ratePct={defaultRate}
          onRateChange={(v) => {
            markDirty();
            setDefaultRate(Math.max(minRate, maxRateValue != null ? Math.min(v, maxRateValue) : v));
          }}
        />
        <ProductPricingBandSlider
          currency={currency}
          disabled={slidersDisabled}
          effectiveCost={eff}
          kind="max"
          labelTip={marginTip(row.method, "max")}
          method={row.method}
          ratePct={maxRateValue}
          onRateChange={(v) => {
            markDirty();
            setMaxRate(Math.max(defaultRate, v));
          }}
        />
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-4">
          {row.hasOverride || dirtyRef.current ? (
            <Button
              disabled={saving}
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => void revertToLevel()}
            >
              <RotateCcw aria-hidden className="size-3.5" />
              Heredar del nivel
            </Button>
          ) : null}
          <Button disabled={saving || eff == null} size="sm" type="button" onClick={() => void saveOverride()}>
            {saving ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
            Guardar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ProductPricingTab({
  productId,
  engineEnabled,
  readOnly,
  canEditProductFields = false,
  productCost,
  productListPrice,
  currency,
}: Readonly<{
  productId: number;
  engineEnabled: boolean;
  readOnly?: boolean;
  canEditProductFields?: boolean;
  productCost?: string | null;
  productListPrice?: string | null;
  currency: WorkspaceCurrency;
}>) {
  const { can } = useWorkspacePermissions();
  const canEdit = !readOnly && can("pricing.edit_own");
  const watchedCost = useWatch({ name: "cost" }) as string | undefined;
  const watchedPrice = useWatch({ name: "price" }) as string | undefined;

  const [pricing, setPricing] = useState<ProductPricingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [avgCost, setAvgCost] = useState("");
  const [marketVal, setMarketVal] = useState("");
  const [yieldPct, setYieldPct] = useState(100);
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");
  const [savingInputs, setSavingInputs] = useState(false);
  const yieldSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!engineEnabled) return;
    setLoading(true);
    try {
      const detail = await fetchProductPricingViaProxy(productId);
      setPricing(detail);
      setAvgCost(detail?.avgCost ?? "");
      setMarketVal(detail?.marketVal ?? "");
      const y = parsePricingNumber(detail?.yieldPercent);
      setYieldPct(y ?? 100);
      if (detail?.levels.length) {
        setSelectedLevelId((prev) => {
          if (prev && detail.levels.some((l) => String(l.priceLevelId) === prev)) return prev;
          return String(detail.levels[0]!.priceLevelId);
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar precios.");
    } finally {
      setLoading(false);
    }
  }, [engineEnabled, productId]);

  useEffect(() => {
    void load();
  }, [load, productCost, productListPrice]);

  const pricingForLevels = useMemo(() => {
    if (!pricing) return null;
    const cost = watchedCost?.trim() || productCost || pricing.cost;
    const listPrice = watchedPrice?.trim() || productListPrice || pricing.listPrice;
    return {
      ...pricing,
      cost,
      avgCost: avgCost.trim() || pricing.avgCost,
      marketVal: marketVal.trim() || pricing.marketVal,
      listPrice,
    };
  }, [avgCost, marketVal, pricing, productCost, productListPrice, watchedCost, watchedPrice]);

  const selectedLevel = pricingForLevels?.levels.find((l) => String(l.priceLevelId) === selectedLevelId);
  const requiredBasisField: PriceLevelBasis | null = selectedLevel?.basis ?? null;

  const persistInputs = useCallback(
    async (next: Readonly<{ avgCost?: string; marketVal?: string; yieldPercent?: number }>) => {
      setSavingInputs(true);
      try {
        const detail = await patchProductPricingInputsViaProxy(productId, {
          avgCost: next.avgCost !== undefined ? next.avgCost.trim() || null : undefined,
          marketVal: next.marketVal !== undefined ? next.marketVal.trim() || null : undefined,
          yieldPercent:
            next.yieldPercent !== undefined ? String(next.yieldPercent) : undefined,
        });
        if (detail) {
          setPricing(detail);
          if (detail.avgCost != null) setAvgCost(detail.avgCost);
          if (detail.marketVal != null) setMarketVal(detail.marketVal);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
      } finally {
        setSavingInputs(false);
      }
    },
    [productId],
  );

  function persistPricingFields() {
    if (!canEdit) return;
    void persistInputs({ avgCost, marketVal, yieldPercent: yieldPct });
  }

  function scheduleYieldSave(nextYield: number) {
    if (!canEdit) return;
    if (yieldSaveTimer.current) clearTimeout(yieldSaveTimer.current);
    yieldSaveTimer.current = setTimeout(() => {
      void persistInputs({ yieldPercent: nextYield, avgCost, marketVal });
    }, 600);
  }

  useEffect(
    () => () => {
      if (yieldSaveTimer.current) clearTimeout(yieldSaveTimer.current);
    },
    [],
  );

  if (!engineEnabled) {
    return (
      <div className="max-w-2xl space-y-6">
        <h2 className="font-semibold text-lg">Precio</h2>
        <ProductPricingBaseFields currency={currency} disabled={!canEditProductFields} />
        <p className="text-muted-foreground text-sm">
          Activá el motor de precios en{" "}
          <Link className="underline underline-offset-2 hover:text-foreground" href="/settings/pricing">
            Opciones → Precios
          </Link>{" "}
          para usar niveles y márgenes automáticos.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="font-semibold text-lg">Precio</h2>

      <ProductPricingBaseFields
        costRequired={requiredBasisField === "cost"}
        currency={currency}
        disabled={!canEditProductFields}
      />

      {loading && !pricing ? (
        <p className="text-muted-foreground text-sm">Cargando precios…</p>
      ) : null}

      {pricingForLevels && pricingForLevels.levels.length > 1 ? (
        <div className="grid grid-cols-[8.5rem_1fr] items-center gap-4">
          <span className="flex items-center gap-1 text-sm">
            Nivel de precio
            <InfoTip label="Niveles" text={PRICING_TOOLTIPS.level} />
          </span>
          <Select value={selectedLevelId} onValueChange={setSelectedLevelId}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Elegí un nivel" />
            </SelectTrigger>
            <SelectContent>
              {pricingForLevels.levels.map((row) => (
                <SelectItem key={row.priceLevelId} value={String(row.priceLevelId)}>
                  {row.levelName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <PricingMoneyInput
        currency={currency}
        disabled={!canEdit || savingInputs}
        id="price-tab-avg-cost"
        label="Costo promedio"
        labelTip={PRICING_TOOLTIPS.avgCost}
        required={requiredBasisField === "avg_cost"}
        value={avgCost}
        onBlur={persistPricingFields}
        onChange={setAvgCost}
      />

      <PricingMoneyInput
        currency={currency}
        disabled={!canEdit || savingInputs}
        id="price-tab-market-val"
        label="Valor de mercado"
        labelTip={PRICING_TOOLTIPS.marketVal}
        required={requiredBasisField === "market_val"}
        value={marketVal}
        onBlur={persistPricingFields}
        onChange={setMarketVal}
      />

      <div className="divide-y border-t pt-2">
        <ProductPricingYieldSlider
          disabled={!canEdit || savingInputs}
          labelTip={PRICING_TOOLTIPS.yield}
          yieldPct={yieldPct}
          onChange={(v) => {
            setYieldPct(v);
            scheduleYieldSave(v);
          }}
        />
      </div>

      {pricingForLevels && pricingForLevels.levels.length > 0 ? (
        <>
          {selectedLevel && pricingForLevels ? (
            <LevelPricingSection
              canEdit={canEdit}
              currency={currency}
              marketVal={marketVal}
              pricing={pricingForLevels}
              productId={productId}
              row={selectedLevel}
              yieldPct={yieldPct}
              onUpdated={setPricing}
            />
          ) : null}
        </>
      ) : (
        <p className="pt-4 text-muted-foreground text-sm">
          Creá niveles de precio en{" "}
          <Link className="underline underline-offset-2 hover:text-foreground" href="/settings/price-levels">
            Opciones → Niveles de precio
          </Link>
          .
        </p>
      )}
    </div>
  );
}

/** @deprecated Use ProductPricingTab */
export const ProductPricingCard = ProductPricingTab;
