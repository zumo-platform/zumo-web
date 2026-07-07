"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InfoTip } from "@/components/workspace/info-tip";
import { ProductPricingPercentSlider } from "@/components/workspace/product-pricing-band-slider";
import type { DashboardCategoryOption } from "@/components/workspace/create-product-form";
import {
  createPriceLevelViaProxy,
  PRICE_BASIS_LABEL,
  PRICE_METHOD_LABEL,
  updatePriceLevelViaProxy,
  type PriceLevelBasis,
  type PriceLevelDetail,
  type PriceLevelMethod,
} from "@/lib/dashboard-price-levels";
import { PRICING_TOOLTIPS } from "@/lib/pricing-copy";
import { cn } from "@/lib/utils";

const SLIDER_MAX: Record<PriceLevelMethod, number> = {
  margin: 95,
  markup: 100,
};

function OptionTiles<T extends string>({
  label,
  tip,
  options,
  value,
  onChange,
}: Readonly<{
  label: string;
  tip?: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}>) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {tip ? <InfoTip label={label} text={tip} /> : null}
      </Label>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Button
              key={option.value}
              aria-pressed={selected}
              className={cn("min-w-[5.5rem]", selected && "pointer-events-none")}
              size="sm"
              type="button"
              variant={selected ? "default" : "outline"}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function PriceLevelFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PriceLevelDetail | null;
  onSaved: () => void;
}>) {
  const isEdit = initial != null && initial.priceLevelId > 0;

  const [name, setName] = useState("");
  const [method, setMethod] = useState<PriceLevelMethod>("margin");
  const [basis, setBasis] = useState<PriceLevelBasis>("cost");
  const [defaultRate, setDefaultRate] = useState(25);
  const [minRate, setMinRate] = useState(0);
  const [maxRate, setMaxRate] = useState(25);
  const [minEnabled, setMinEnabled] = useState(false);
  const [maxEnabled, setMaxEnabled] = useState(false);
  const [categoryIds, setCategoryIds] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<DashboardCategoryOption[]>([]);
  const [saving, setSaving] = useState(false);

  const sliderMax = SLIDER_MAX[method];

  const methodOptions = useMemo(
    () =>
      (Object.keys(PRICE_METHOD_LABEL) as PriceLevelMethod[]).map((value) => ({
        value,
        label: PRICE_METHOD_LABEL[value],
      })),
    [],
  );

  const basisOptions = useMemo(
    () =>
      (Object.keys(PRICE_BASIS_LABEL) as PriceLevelBasis[]).map((value) => ({
        value,
        label: PRICE_BASIS_LABEL[value],
      })),
    [],
  );

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setMethod(initial?.method ?? "margin");
    setBasis(initial?.basis ?? "cost");
    const def = Number(initial?.defaultRatePct ?? 25);
    setDefaultRate(Number.isFinite(def) ? def : 25);
    const hasMin = initial?.minRatePct != null && initial.minRatePct.trim() !== "";
    const hasMax = initial?.maxRatePct != null && initial.maxRatePct.trim() !== "";
    setMinEnabled(hasMin);
    setMaxEnabled(hasMax);
    const minN = hasMin ? Number(initial!.minRatePct) : 0;
    setMinRate(Number.isFinite(minN) ? minN : 0);
    const maxN = hasMax ? Number(initial!.maxRatePct) : def;
    setMaxRate(Number.isFinite(maxN) ? maxN : def);
    setCategoryIds(new Set(initial?.categoryIds ?? []));
  }, [initial, open]);

  useEffect(() => {
    setDefaultRate((v) => Math.min(sliderMax, Math.max(0, v)));
    setMinRate((v) => Math.min(sliderMax, Math.max(0, v)));
    setMaxRate((v) => Math.min(sliderMax, Math.max(0, v)));
  }, [sliderMax]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const res = await fetch("/api/backend/dashboard/product-categories", {
          cache: "no-store",
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) return;
        const list: DashboardCategoryOption[] = [];
        if (Array.isArray(data.categories)) {
          for (const row of data.categories) {
            if (!row || typeof row !== "object") continue;
            const o = row as Record<string, unknown>;
            const categoryId =
              typeof o.categoryId === "number" ? o.categoryId : Number(o.categoryId);
            const catName = typeof o.name === "string" ? o.name.trim() : "";
            if (Number.isFinite(categoryId) && categoryId > 0 && catName) {
              list.push({ categoryId, name: catName });
            }
          }
        }
        setCategories(list);
      } catch {
        /* optional */
      }
    })();
  }, [open]);

  const toggleCategory = useCallback((categoryId: number, checked: boolean) => {
    setCategoryIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(categoryId);
      else next.delete(categoryId);
      return next;
    });
  }, []);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("El nombre es obligatorio.");
      return;
    }

    const minN = minEnabled ? minRate : null;
    const maxN = maxEnabled ? maxRate : null;

    if (minN != null && minN > defaultRate) {
      toast.error("La banda mínima no puede ser mayor que la tasa objetivo.");
      return;
    }
    if (maxN != null && defaultRate > maxN) {
      toast.error("La tasa objetivo no puede ser mayor que la banda máxima.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: trimmed,
        method,
        basis,
        defaultRatePct: defaultRate,
        minRatePct: minN,
        maxRatePct: maxN,
        categoryIds: [...categoryIds],
      };
      if (isEdit && initial) {
        await updatePriceLevelViaProxy(initial.priceLevelId, payload);
        toast.success("Nivel actualizado.");
      } else {
        await createPriceLevelViaProxy(payload);
        toast.success("Nivel creado.");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  const maxRateValue = maxEnabled ? Math.max(defaultRate, maxRate) : defaultRate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[96vh] min-h-[75vh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-[50.4rem]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar nivel de precio" : "Nuevo nivel de precio"}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-2">
          <div className="space-y-2">
            <Label htmlFor="pl-name">Nombre</Label>
            <Input
              id="pl-name"
              placeholder="Restaurantes"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <OptionTiles
              label="Método"
              options={methodOptions}
              tip={PRICING_TOOLTIPS.method}
              value={method}
              onChange={setMethod}
            />
            <OptionTiles
              label="Base de cálculo"
              options={basisOptions}
              tip={PRICING_TOOLTIPS.basis}
              value={basis}
              onChange={setBasis}
            />
          </div>

          <div className="divide-y rounded-lg border bg-muted/20 px-3">
            <ProductPricingPercentSlider
              label="Tasa objetivo"
              labelTip={PRICING_TOOLTIPS.targetRate}
              max={sliderMax}
              sliderId="pl-default-rate"
              value={defaultRate}
              onChange={(v) => {
                setDefaultRate(v);
                if (minEnabled) setMinRate((m) => Math.min(m, v));
                if (maxEnabled) setMaxRate((m) => Math.max(m, v));
              }}
            />

            <div className="space-y-1 border-t py-1">
              <div className="flex items-center justify-end gap-2 px-1 py-2">
                <Label className="mr-auto flex items-center gap-1 text-sm">
                  Banda mínima
                  <InfoTip label="Banda mínima" text={PRICING_TOOLTIPS.bandMin} />
                </Label>
                <span className="text-muted-foreground text-xs">{minEnabled ? "Activa" : "Sin límite"}</span>
                <Switch
                  checked={minEnabled}
                  onCheckedChange={(checked) => {
                    setMinEnabled(checked);
                    if (checked && minRate > defaultRate) setMinRate(defaultRate);
                  }}
                />
              </div>
              {minEnabled ? (
                <ProductPricingPercentSlider
                  label="Límite inferior"
                  max={Math.min(sliderMax, defaultRate)}
                  sliderId="pl-min-rate"
                  value={Math.min(minRate, defaultRate)}
                  onChange={(v) => setMinRate(Math.min(v, defaultRate))}
                />
              ) : null}
            </div>

            <div className="space-y-1 border-t py-1">
              <div className="flex items-center justify-end gap-2 px-1 py-2">
                <Label className="mr-auto flex items-center gap-1 text-sm">
                  Banda máxima
                  <InfoTip label="Banda máxima" text={PRICING_TOOLTIPS.bandMax} />
                </Label>
                <span className="text-muted-foreground text-xs">{maxEnabled ? "Activa" : "Sin límite"}</span>
                <Switch
                  checked={maxEnabled}
                  onCheckedChange={(checked) => {
                    setMaxEnabled(checked);
                    if (checked) setMaxRate((m) => Math.max(defaultRate, m));
                  }}
                />
              </div>
              {maxEnabled ? (
                <ProductPricingPercentSlider
                  label="Límite superior"
                  max={sliderMax}
                  sliderId="pl-max-rate"
                  value={maxRateValue}
                  onChange={(v) => setMaxRate(Math.max(defaultRate, v))}
                />
              ) : null}
            </div>
          </div>

          {categories.length > 0 ? (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Categorías
                <InfoTip
                  label="Categorías"
                  text="Si no elegís ninguna, el nivel aplica a todo el catálogo."
                />
              </Label>
              <div className="min-h-32 max-h-56 flex-1 space-y-2 overflow-y-auto rounded-md border bg-background p-3">
                {categories.map((cat) => (
                  <label
                    key={cat.categoryId}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={categoryIds.has(cat.categoryId)}
                      onCheckedChange={(c) => toggleCategory(cat.categoryId, c === true)}
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button disabled={saving} type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={saving} type="button" onClick={() => void handleSave()}>
            {saving ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
