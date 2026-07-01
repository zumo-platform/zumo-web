"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoTip } from "@/components/workspace/info-tip";
import {
  ProductPricingBandSlider,
  ProductPricingListRow,
  ProductPricingYieldSlider,
} from "@/components/workspace/product-pricing-band-slider";
import { PRICE_BASIS_LABEL, PRICE_METHOD_LABEL } from "@/lib/dashboard-price-levels";
import { PRICING_TOOLTIPS } from "@/lib/pricing-copy";
import {
  acquirePriceLabel,
  basisAcquirePrice,
  effectiveCost,
  parsePricingNumber,
  priceFromRatePct,
} from "@/lib/pricing-engine-client";
import {
  deleteProductPriceOverrideViaProxy,
  fetchProductPricingViaProxy,
  formatMoney,
  patchProductPricingInputsViaProxy,
  upsertProductPriceOverrideViaProxy,
  type ProductLevelPriceRow,
  type ProductPricingDetail,
} from "@/lib/product-pricing";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

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

function LevelPricingPanel({
  productId,
  row,
  pricing,
  yieldPct,
  marketVal,
  canEdit,
  onUpdated,
}: Readonly<{
  productId: number;
  row: ProductLevelPriceRow;
  pricing: ProductPricingDetail;
  yieldPct: number;
  marketVal: string;
  canEdit: boolean;
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

  const derivedDefault =
    eff != null ? priceFromRatePct(eff, row.method, defaultRate) : parsePricingNumber(row.derivedPrice);

  async function saveOverride() {
    if (!canEdit || eff == null) {
      toast.error("Completá el costo base antes de guardar.");
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
    if (!canEdit || !row.hasOverride) return;
    setSaving(true);
    try {
      const detail = await deleteProductPriceOverrideViaProxy(productId, row.priceLevelId);
      if (detail) onUpdated(detail);
      toast.success("Volvió a heredar del nivel.");
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

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{row.levelName}</p>
          <p className="text-muted-foreground text-xs">
            {PRICE_METHOD_LABEL[row.method]} sobre {PRICE_BASIS_LABEL[row.basis].toLowerCase()}
          </p>
        </div>
        {derivedDefault != null ? (
          <p className="font-semibold text-sm tabular-nums">{formatMoney(String(derivedDefault))}</p>
        ) : (
          <p className="text-muted-foreground text-xs">Sin costo base</p>
        )}
      </div>

      <ProductPricingListRow label={acquirePriceLabel(row.basis)} value={acquire != null ? String(acquire) : null} />

      {eff == null ? (
        <p className="text-amber-700 text-xs dark:text-amber-300">
          Agregá {PRICE_BASIS_LABEL[row.basis].toLowerCase()} para calcular este nivel.
        </p>
      ) : (
        <div className="space-y-3">
          <ProductPricingBandSlider
            disabled={!canEdit || saving}
            effectiveCost={eff}
            kind="min"
            method={row.method}
            ratePct={minRate}
            onRateChange={(v) => {
              markDirty();
              setMinRate(Math.min(v, defaultRate));
            }}
          />
          <ProductPricingBandSlider
            disabled={!canEdit || saving}
            effectiveCost={eff}
            kind="default"
            method={row.method}
            ratePct={defaultRate}
            onRateChange={(v) => {
              markDirty();
              setDefaultRate(Math.max(minRate, maxRateValue != null ? Math.min(v, maxRateValue) : v));
            }}
          />
          <ProductPricingBandSlider
            disabled={!canEdit || saving}
            effectiveCost={eff}
            kind="max"
            method={row.method}
            ratePct={maxRateValue}
            onRateChange={(v) => {
              markDirty();
              const next = Math.max(defaultRate, v);
              setMaxRate(next);
            }}
          />
        </div>
      )}

      {canEdit ? (
        <div className="flex flex-wrap gap-2 border-t pt-2">
          <Button disabled={saving || eff == null} size="sm" type="button" onClick={() => void saveOverride()}>
            {saving ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
            Guardar
          </Button>
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
        </div>
      ) : null}
    </div>
  );
}

export function ProductPricingCard({
  productId,
  engineEnabled,
  listPrice,
  cost,
  readOnly,
}: Readonly<{
  productId: number;
  engineEnabled: boolean;
  listPrice: string | null;
  cost: string | null;
  readOnly?: boolean;
}>) {
  const { can } = useWorkspacePermissions();
  const canEdit = !readOnly && can("pricing.edit_own");

  const [pricing, setPricing] = useState<ProductPricingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [marketVal, setMarketVal] = useState("");
  const [yieldPct, setYieldPct] = useState(100);
  const [savingInputs, setSavingInputs] = useState(false);
  const yieldSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!engineEnabled) return;
    setLoading(true);
    try {
      const detail = await fetchProductPricingViaProxy(productId);
      setPricing(detail);
      setMarketVal(detail?.marketVal ?? "");
      const y = parsePricingNumber(detail?.yieldPercent);
      setYieldPct(y ?? 100);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar precios.");
    } finally {
      setLoading(false);
    }
  }, [engineEnabled, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const persistInputs = useCallback(
    async (nextYield: number, nextMarketVal: string) => {
      setSavingInputs(true);
      try {
        const detail = await patchProductPricingInputsViaProxy(productId, {
          marketVal: nextMarketVal.trim() || null,
          yieldPercent: String(nextYield),
        });
        if (detail) setPricing(detail);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
      } finally {
        setSavingInputs(false);
      }
    },
    [productId],
  );

  function scheduleYieldSave(nextYield: number) {
    if (!canEdit) return;
    if (yieldSaveTimer.current) clearTimeout(yieldSaveTimer.current);
    yieldSaveTimer.current = setTimeout(() => {
      void persistInputs(nextYield, marketVal);
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Precio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ProductPricingListRow label="Precio de lista" value={listPrice} />
          {cost ? <ProductPricingListRow label="Costo" value={cost} /> : null}
          <p className="text-muted-foreground text-xs">
            Activá el motor de precios en Opciones → Precios para usar niveles y márgenes automáticos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Precio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {loading && !pricing ? (
          <p className="text-muted-foreground text-xs">Cargando precios…</p>
        ) : null}

        <ProductPricingListRow label="Precio de lista" value={pricing?.listPrice ?? listPrice} />
        <ProductPricingListRow label="Costo de adquisición" value={pricing?.cost ?? cost} />

        <div className="space-y-1">
          <Label className="flex items-center gap-1 text-muted-foreground text-xs">
            Valor de mercado
            <InfoTip label="Valor de mercado" text={PRICING_TOOLTIPS.marketVal} />
          </Label>
          <Input
            disabled={!canEdit || savingInputs}
            inputMode="decimal"
            value={marketVal}
            onBlur={() => {
              if (canEdit) void persistInputs(yieldPct, marketVal);
            }}
            onChange={(e) => setMarketVal(e.target.value)}
          />
        </div>

        <ProductPricingYieldSlider
          disabled={!canEdit || savingInputs}
          yieldPct={yieldPct}
          onChange={(v) => {
            setYieldPct(v);
            scheduleYieldSave(v);
          }}
        />

        {pricing && pricing.levels.length > 0 ? (
          <div className="space-y-3 border-t pt-3">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Por nivel
              <InfoTip label="Niveles" text={PRICING_TOOLTIPS.level} />
            </p>
            {pricing.levels.map((row) => (
              <LevelPricingPanel
                key={row.priceLevelId}
                canEdit={canEdit}
                marketVal={marketVal}
                pricing={pricing}
                productId={productId}
                row={row}
                yieldPct={yieldPct}
                onUpdated={setPricing}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            Creá niveles de precio en Opciones → Niveles de precio.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
