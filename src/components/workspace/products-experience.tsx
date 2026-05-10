"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductUploadSheets } from "@/components/workspace/product-upload-sheets";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import {
  activeProducts,
  parseDashboardProductsEnvelope,
  type DashboardProductRow,
} from "@/lib/dashboard-products";

export function ProductsExperience({
  initialProducts,
}: Readonly<{
  /** SSR result: `null` may recover via same-origin `/api/backend` fetch in the browser. */
  initialProducts: DashboardProductRow[] | null;
}>) {
  const router = useRouter();
  const hydratedFromSSR = initialProducts !== null;

  /** `undefined` = client hasn't finished; only used when SSR returned `null`. */
  const [clientRows, setClientRows] = useState<DashboardProductRow[] | undefined>(() =>
    hydratedFromSSR ? initialProducts ?? [] : undefined,
  );
  const [clientError, setClientError] = useState(false);

  useEffect(() => {
    if (initialProducts !== null) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/backend/dashboard/products", {
          credentials: "same-origin",
          cache: "no-store",
        });

        const body = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok) {
          setClientError(true);
          return;
        }

        setClientRows(parseDashboardProductsEnvelope(body));
      } catch {
        if (!cancelled) setClientError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialProducts]);

  const pendingClient = !hydratedFromSSR && clientRows === undefined && !clientError;
  const fatalError =
    !hydratedFromSSR && !pendingClient && (clientError || clientRows === undefined);

  if (pendingClient) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
        <WorkspacePageHeader
          description="Gestiona tu catálogo para pedidos desde WhatsApp."
          title="Productos"
        />
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 aria-hidden className="size-5 animate-spin" />
          Cargando productos…
        </div>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
        <WorkspacePageHeader
          description="Gestiona tu catálogo para pedidos desde WhatsApp."
          title="Productos"
        />
        <div className="flex min-h-0 flex-1 overflow-y-auto px-4 md:px-8">
          <div className="mx-auto w-full max-w-3xl space-y-6 py-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conexión con el API</CardTitle>
                <CardDescription>
                  No pudimos cargar tus productos. Verificá API_URL o NEXT_PUBLIC_API_URL en .env.local,
                  iniciá sesión de nuevo si hace falta, y actualizá la página.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
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
            Conectá tus productos e inventarios a Zumo
          </h1>
          <p className="mt-6 text-muted-foreground text-[15px] leading-relaxed">
            Conectá tu catálogo para permitir que nuestros robots automaticen tus pedidos e inventarios
            directamente desde WhatsApp.
          </p>
          <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">
            Cualquier precio incluido solo será visible para los clientes que vos definas.
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <WorkspacePageHeader
        description={`Tu catálogo tiene ${visible.length} ${visible.length === 1 ? "producto" : "productos"}. La edición desde el panel llegará próximamente.`}
        title="Productos"
      >
        <ProductUploadSheets
          onProductsChanged={() => {
            router.refresh();
          }}
          renderTrigger={({ open }) => (
            <Button size="sm" type="button" variant="outline" onClick={open}>
              Agregar producto
            </Button>
          )}
        />
      </WorkspacePageHeader>
      <div className="flex min-h-0 flex-1 overflow-auto px-4 py-6 md:px-6">
        <Card className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col border-border/60 shadow-sm">
          <CardHeader className="shrink-0 pb-4">
            <CardTitle className="text-base">Catálogo</CardTitle>
            <CardDescription>
              Listado sincronizado con el servidor. SKU y estado según tus datos operativos.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className="max-w-[200px] truncate font-medium md:max-w-xs">
                      {p.name}
                    </TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {p.sku ?? "—"}
                    </TableCell>
                    <TableCell className="capitalize">{p.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
