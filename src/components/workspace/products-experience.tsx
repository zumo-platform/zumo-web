"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductUploadSheets } from "@/components/workspace/product-upload-sheets";
import { ProductsCatalogTable } from "@/components/workspace/products-catalog-table";
import { ProductsHeaderActions } from "@/components/workspace/products-header-actions";
import { ProductsPageHeader } from "@/components/workspace/products-page-header";
import { activeProducts, type DashboardProductRow } from "@/lib/dashboard-products";
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

export function ProductsExperience() {
  const cachedOnMount = readCachedProducts();
  const [rows, setRows] = useState<DashboardProductRow[] | null>(() => cachedOnMount);
  const [ready, setReady] = useState(() => cachedOnMount !== null);

  const refreshCatalog = useCallback(async (force = false) => {
    const data = await loadProductsCatalog(force ? { force: true } : undefined);
    setRows(data);
    setReady(true);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const data = await loadProductsCatalog();
      if (!cancelled) {
        setRows(data);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCatalogChanged = useCallback(() => {
    invalidateProductsCatalogCache();
    void refreshCatalog(true);
  }, [refreshCatalog]);

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
        actions={<ProductsHeaderActions onProductsChanged={handleCatalogChanged} />}
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
