"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductUploadSheets } from "@/components/workspace/product-upload-sheets";
import { ProductsCatalogTable } from "@/components/workspace/products-catalog-table";
import { ProductsHeaderActions } from "@/components/workspace/products-header-actions";
import { ProductsPageHeader } from "@/components/workspace/products-page-header";
import { activeProducts, type DashboardProductRow } from "@/lib/dashboard-products";
import { fetchWarehousesViaProxy, type DashboardWarehouseRow } from "@/lib/inventory";
import {
  invalidateProductsCatalogCache,
  loadProductsCatalog,
} from "@/lib/products-catalog-cache";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspaceTableScrollClassName,
} from "@/lib/workspace-layout";

export function ProductsExperience() {
  const [rows, setRows] = useState<DashboardProductRow[] | null>(null);
  const [ready, setReady] = useState(false);
  const [warehouses, setWarehouses] = useState<DashboardWarehouseRow[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      invalidateProductsCatalogCache();
      const [data, wh] = await Promise.all([
        loadProductsCatalog({ force: true, warehouseId: null }),
        fetchWarehousesViaProxy(),
      ]);
      if (!cancelled) {
        setRows(data);
        setWarehouses(wh);
        setReady(true);
        initialLoadDone.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    let cancelled = false;
    void (async () => {
      const data = await loadProductsCatalog({ force: true, warehouseId });
      if (!cancelled) setRows(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [warehouseId]);

  const refreshCatalog = useCallback(
    async (force = false, nextWarehouseId: number | null = warehouseId) => {
      const data = await loadProductsCatalog(
        force ? { force: true, warehouseId: nextWarehouseId } : { warehouseId: nextWarehouseId },
      );
      setRows(data);
      setReady(true);
      return data;
    },
    [warehouseId],
  );

  const handleCatalogChanged = useCallback(() => {
    invalidateProductsCatalogCache();
    void refreshCatalog(true);
  }, [refreshCatalog]);

  const handleWarehouseChange = useCallback((nextId: number | null) => {
    setWarehouseId(nextId);
  }, []);

  if (!ready || rows === null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex min-h-0 flex-1 items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 aria-hidden className="size-5 animate-spin" />
          Cargando inventario…
        </div>
      </div>
    );
  }

  const visible = activeProducts(rows);

  if (visible.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto bg-background px-4 py-16">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
          <h1 className="text-balance font-semibold text-2xl tracking-tight text-foreground md:text-3xl">
            Conecta tus productos e inventarios a Zumo
          </h1>
          <p className="mt-6 text-muted-foreground text-[15px] leading-relaxed">
            Conecta tu catálogo para permitir que nuestros robots automaticen tus pedidos e inventarios directamente
            desde WhatsApp.
          </p>
          <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">
            Cualquier precio incluido solo será visible para los clientes que usted defina.
          </p>
          <ProductUploadSheets
            onProductsChanged={handleCatalogChanged}
            renderTrigger={({ open }) => (
              <Button className="mt-10 px-8" size="lg" type="button" onClick={open}>
                Ingresar productos
              </Button>
            )}
          />
        </div>
      </div>
    );
  }

  const listDescription =
    visible.length > 1
      ? `Tenés ${visible.length} ítems en inventario.`
      : "Tu inventario tiene 1 ítem.";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <ProductsPageHeader
        actions={
          <ProductsHeaderActions
            onProductsChanged={handleCatalogChanged}
            onWarehouseIdChange={handleWarehouseChange}
            warehouseId={warehouseId}
            warehouses={warehouses}
          />
        }
        description={listDescription}
      />
      <div
        className={cn(workspaceTableScrollClassName, workspaceContentOuterClassName, "bg-background")}
      >
        <div className={workspaceContentInnerClassName}>
          <ProductsCatalogTable data={visible} onCatalogChanged={handleCatalogChanged} />
        </div>
      </div>
    </div>
  );
}

export function ProductsExperienceFallback() {
  return (
    <div className="flex flex-1 items-center justify-center gap-2 bg-background text-muted-foreground text-sm">
      <Loader2 aria-hidden className="size-4 animate-spin" />
      Cargando productos…
    </div>
  );
}
