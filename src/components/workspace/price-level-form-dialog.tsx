"use client";

import { useCallback, useEffect, useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoTip } from "@/components/workspace/info-tip";
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
  const [defaultRatePct, setDefaultRatePct] = useState("25");
  const [minRatePct, setMinRatePct] = useState("");
  const [maxRatePct, setMaxRatePct] = useState("");
  const [categoryIds, setCategoryIds] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<DashboardCategoryOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setMethod(initial?.method ?? "margin");
    setBasis(initial?.basis ?? "cost");
    setDefaultRatePct(initial?.defaultRatePct ?? "25");
    setMinRatePct(initial?.minRatePct ?? "");
    setMaxRatePct(initial?.maxRatePct ?? "");
    setCategoryIds(new Set(initial?.categoryIds ?? []));
  }, [initial, open]);

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
            const label = typeof o.name === "string" ? o.name : "";
            if (Number.isFinite(categoryId) && categoryId > 0 && label) {
              list.push({ categoryId, label });
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
    const defaultN = Number(defaultRatePct);
    if (!Number.isFinite(defaultN)) {
      toast.error("Tasa objetivo inválida.");
      return;
    }
    const minN = minRatePct.trim() ? Number(minRatePct) : null;
    const maxN = maxRatePct.trim() ? Number(maxRatePct) : null;

    setSaving(true);
    try {
      const payload = {
        name: trimmed,
        method,
        basis,
        defaultRatePct: defaultN,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar nivel de precio" : "Nuevo nivel de precio"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pl-name">Nombre</Label>
            <Input id="pl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Restaurantes" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Método
                <InfoTip label="Método" text={PRICING_TOOLTIPS.method} />
              </Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PriceLevelMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRICE_METHOD_LABEL) as PriceLevelMethod[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {PRICE_METHOD_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Base de cálculo
                <InfoTip label="Base" text={PRICING_TOOLTIPS.basis} />
              </Label>
              <Select value={basis} onValueChange={(v) => setBasis(v as PriceLevelBasis)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRICE_BASIS_LABEL) as PriceLevelBasis[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {PRICE_BASIS_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1" htmlFor="pl-default">
                Tasa objetivo (%)
                <InfoTip label="Tasa objetivo" text={PRICING_TOOLTIPS.targetRate} />
              </Label>
              <Input
                id="pl-default"
                inputMode="decimal"
                value={defaultRatePct}
                onChange={(e) => setDefaultRatePct(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1" htmlFor="pl-min">
                Banda mín (%)
                <InfoTip label="Banda mínima" text={PRICING_TOOLTIPS.bandMin} />
              </Label>
              <Input
                id="pl-min"
                inputMode="decimal"
                placeholder="—"
                value={minRatePct}
                onChange={(e) => setMinRatePct(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1" htmlFor="pl-max">
                Banda máx (%)
                <InfoTip label="Banda máxima" text={PRICING_TOOLTIPS.bandMax} />
              </Label>
              <Input
                id="pl-max"
                inputMode="decimal"
                placeholder="—"
                value={maxRatePct}
                onChange={(e) => setMaxRatePct(e.target.value)}
              />
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
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {categories.map((cat) => (
                  <label
                    key={cat.categoryId}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={categoryIds.has(cat.categoryId)}
                      onCheckedChange={(c) => toggleCategory(cat.categoryId, c === true)}
                    />
                    {cat.label}
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
