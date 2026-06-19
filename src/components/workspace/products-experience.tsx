"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductUploadSheets } from "@/components/workspace/product-upload-sheets";
import { ProductsCatalogTable } from "@/components/workspace/products-catalog-table";
import { ProductsHeaderActions } from "@/components/workspace/products-header-actions";
import { ProductsPageHeader } from "@/components/workspace/products-page-header";
import { ProductsPageSkeleton } from "@/components/workspace/workspace-skeletons";
import { activeProducts, type DashboardProductRow } from "@/lib/dashboard-products";
import { fetchWarehousesViaProxy, type DashboardWarehouseRow } from "@/lib/inventory";
import {
  invalidateProductsCatalogCache,
  loadProductsCatalog,
  readCachedProducts,
} from "@/lib/products-catalog-cache";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspaceTableScrollClassName,
} from "@/lib/workspace-layout";

function normalizeProductSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function ProductsExperience() {
  const cachedOnMount = readCachedProducts(null);
  const [rows, setRows] = useState<DashboardProductRow[] | null>(() => cachedOnMount);
  const [ready, setReady] = useState(() => cachedOnMount !== null);
  const [warehouses, setWarehouses] = useState<DashboardWarehouseRow[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const initialLoadDone = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cached = readCachedProducts(null);
      if (cached && !cancelled) {
        setRows(cached);
        setReady(true);
      }

      const [fresh, wh] = await Promise.all([
        loadProductsCatalog({ warehouseId: null }),
        fetchWarehousesViaProxy(),
      ]);
      if (!cancelled) {
        setRows(fresh);
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
      const cached = readCachedProducts(warehouseId);
      if (cached && !cancelled) setRows(cached);
      const data = await loadProductsCatalog({ warehouseId });
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
    return <ProductsPageSkeleton />;
  }

  const visible = activeProducts(rows);
  const normalizedSearch = normalizeProductSearch(searchQuery);
  const filteredVisible = normalizedSearch
    ? visible.filter((product) => {
        const name = normalizeProductSearch(product.name);
        const sku = normalizeProductSearch(product.sku ?? "");
        return name.includes(normalizedSearch) || sku.includes(normalizedSearch);
      })
    : visible;
  const prefetchBatchProductIds =
    normalizedSearch.length >= 2
      ? filteredVisible
          .filter((product) => product.trackStock)
          .slice(0, 5)
          .map((product) => product.productId)
      : [];

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

  const listDescription = normalizedSearch
    ? `Mostrando ${filteredVisible.length} de ${visible.length} ítems en inventario.`
    : visible.length > 1
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
        <div className={cn(workspaceContentInnerClassName, "gap-3")}>
          <div className="relative w-full sm:max-w-md">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Buscar productos por nombre o SKU"
              className="h-9 pr-8 pl-9"
              placeholder="Buscar por producto o SKU"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button
                aria-label="Limpiar búsqueda"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                type="button"
                onClick={() => setSearchQuery("")}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <ProductsCatalogTable
            data={filteredVisible}
            prefetchBatchProductIds={prefetchBatchProductIds}
            onCatalogChanged={handleCatalogChanged}
          />
        </div>
      </div>
    </div>
  );
}

export function ProductsExperienceFallback() {
  return <ProductsPageSkeleton />;
}
