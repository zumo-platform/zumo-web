"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductsPageHeader } from "@/components/workspace/products-page-header";
import { fetchWarehousesViaProxy, type DashboardWarehouseRow } from "@/lib/inventory";
import { loadProductCategoryMap } from "@/lib/products-catalog-cache";
import { createStockCountViaProxy } from "@/lib/stock-counts";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
} from "@/lib/workspace-layout";

type ScopeMode = "all" | "category";

export function StockCountCreateView() {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<readonly DashboardWarehouseRow[]>([]);
  const [categoryMap, setCategoryMap] = useState<ReadonlyMap<number, string>>(new Map());
  const [name, setName] = useState("");
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>("all");
  const [categoryIds, setCategoryIds] = useState<Set<number>>(new Set());
  const [includeZeroStock, setIncludeZeroStock] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void fetchWarehousesViaProxy()
      .then((whs) => {
        setWarehouses(whs);
        const def = whs.find((w) => w.isDefault) ?? whs[0];
        setWarehouseId(def?.warehouseId ?? null);
      })
      .catch(() => setWarehouses([]));

    void loadProductCategoryMap().then(setCategoryMap);
  }, []);

  function toggleCategory(categoryId: number, checked: boolean) {
    setCategoryIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(categoryId);
      else next.delete(categoryId);
      return next;
    });
  }

  async function handleCreate() {
    if (warehouseId == null) {
      toast.error("Selecciona una bodega.");
      return;
    }
    if (scopeMode === "category" && categoryIds.size === 0) {
      toast.error("Selecciona al menos una categoría.");
      return;
    }

    setCreating(true);
    try {
      const scope =
        scopeMode === "all"
          ? { kind: "all" as const }
          : { kind: "category" as const, categoryIds: [...categoryIds] };

      const result = await createStockCountViaProxy({
        warehouseId,
        name: name.trim() || null,
        scope,
        includeZeroStock,
      });
      toast.success("Conteo creado.");
      router.push(`/products/stock-counts/${encodeURIComponent(result.countId)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el conteo.");
    } finally {
      setCreating(false);
    }
  }

  const actions = (
    <Button asChild size="sm" variant="outline">
      <Link href="/products/stock-counts">Volver al listado</Link>
    </Button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProductsPageHeader
        title="Nuevo conteo"
        subPage="Nuevo conteo"
        description="Se tomará una foto del inventario en la bodega seleccionada. Las ventas y recepciones durante el conteo no se congelan."
        actions={actions}
      />

      <div className={workspaceContentOuterClassName}>
        <div className={cn(workspaceContentInnerClassName, "max-w-xl space-y-6")}>
          <div className="space-y-2">
            <Label htmlFor="count-name">Nombre del conteo</Label>
            <Input
              id="count-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Conteo mensual bodega central"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="count-warehouse">Bodega</Label>
            <Select
              value={warehouseId != null ? String(warehouseId) : undefined}
              onValueChange={(v) => setWarehouseId(Number(v))}
            >
              <SelectTrigger id="count-warehouse">
                <SelectValue placeholder="Seleccionar bodega" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.warehouseId} value={String(wh.warehouseId)}>
                    {wh.name}
                    {wh.isDefault ? " (predeterminada)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Alcance</Label>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="scope"
                  checked={scopeMode === "all"}
                  onChange={() => setScopeMode("all")}
                />
                Todo el inventario
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="scope"
                  checked={scopeMode === "category"}
                  onChange={() => setScopeMode("category")}
                />
                Por categoría
              </label>
            </div>

            {scopeMode === "category" ? (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {[...categoryMap.entries()].map(([categoryId, label]) => (
                  <label
                    key={categoryId}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={categoryIds.has(categoryId)}
                      onCheckedChange={(v) => toggleCategory(categoryId, v === true)}
                    />
                    {label}
                  </label>
                ))}
                {categoryMap.size === 0 ? (
                  <p className="text-muted-foreground text-sm">No hay categorías.</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={includeZeroStock}
              onCheckedChange={(v) => setIncludeZeroStock(v === true)}
            />
            Incluir productos sin stock
          </label>

          <Button
            type="button"
            disabled={creating || warehouseId == null}
            className="gap-2"
            onClick={() => void handleCreate()}
          >
            {creating ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            Crear conteo
          </Button>
        </div>
      </div>
    </div>
  );
}
