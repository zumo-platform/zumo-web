"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ProductUploadSheets } from "@/components/workspace/product-upload-sheets";
import { ProductsCatalogTable } from "@/components/workspace/products-catalog-table";
import { ProductsHeaderActions } from "@/components/workspace/products-header-actions";
import { ProductsPageHeader } from "@/components/workspace/products-page-header";
import {
  activeProducts,
  parseDashboardProductsEnvelope,
  type DashboardProductRow,
} from "@/lib/dashboard-products";

async function fetchProductsFromProxy(): Promise<{ ok: true; rows: DashboardProductRow[] } | { ok: false }> {
  const path = "/api/backend/dashboard/products";
  const url = `${window.location.origin}${path}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        return { ok: true, rows: parseDashboardProductsEnvelope(body) };
      }
    } catch {
      /* retry */
    }
    if (attempt === 0) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  return { ok: false };
}

export function ProductsExperience({
  initialProducts,
}: Readonly<{
  /** SSR result: `null` = server could not reach API; client retries via `/api/backend`. */
  initialProducts: DashboardProductRow[] | null;
}>) {
  const router = useRouter();
  const hydratedFromSSR = initialProducts !== null;

  const [clientRows, setClientRows] = useState<DashboardProductRow[] | undefined>(() =>
    hydratedFromSSR ? (initialProducts ?? []) : undefined,
  );

  useEffect(() => {
    if (initialProducts !== null) return;

    let cancelled = false;
    void (async () => {
      const result = await fetchProductsFromProxy();
      if (cancelled) return;
      if (result.ok) {
        setClientRows(result.rows);
      } else {
        setClientRows([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialProducts]);

  const pendingClient = !hydratedFromSSR && clientRows === undefined;

  if (pendingClient) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 aria-hidden className="size-5 animate-spin" />
          Cargando productos…
        </div>
      </div>
    );
  }

  const catalog: DashboardProductRow[] = hydratedFromSSR
    ? (initialProducts ?? [])
    : (clientRows ?? []);

  const visible = activeProducts(catalog);

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
            onProductsChanged={() => {
              router.refresh();
            }}
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

  const catalogBody = (
    <div className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col">
      <header className="shrink-0 pb-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Catálogo</h2>
        <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
          Listado sincronizado con el servidor: foto, inventario, precio y categorías según tus datos.
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto pb-6">
        <ProductsCatalogTable data={visible} onCatalogChanged={() => router.refresh()} />
      </div>
    </div>
  );

  const listDescription =
    visible.length > 1
      ? `Tienes ${visible.length} productos. Listado sincronizado con el servidor; la edición de filas desde el panel llegará próximamente.`
      : "Tu catálogo tiene 1 producto. Listado sincronizado con el servidor; la edición desde el panel llegará próximamente.";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <ProductsPageHeader
        actions={<ProductsHeaderActions onProductsChanged={() => router.refresh()} />}
        description={listDescription}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex min-h-0 flex-1 overflow-auto px-4 py-5 md:px-6 md:py-6">{catalogBody}</div>
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
