"use client";

import { Controller, useFormContext } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatQty } from "@/lib/inventory-format";
import type { ProductFormValues } from "@/lib/product-form";
import type { DashboardProductDetail } from "@/lib/product-detail";

function StockRow({
  label,
  value,
  strong = false,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</span>
    </div>
  );
}

function ToggleRow({
  name,
  label,
  readOnly,
}: Readonly<{
  name: "trackStock" | "trackBatches" | "manageMinimumStock" | "availableForCustomers";
  label: string;
  readOnly?: boolean;
}>) {
  const { control } = useFormContext<ProductFormValues>();

  if (name === "availableForCustomers") {
    return (
      <Controller
        name="availableForCustomers"
        control={control}
        render={({ field }) => (
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="active-toggle">{label}</Label>
            <Switch
              id="active-toggle"
              checked={field.value}
              disabled={readOnly}
              onCheckedChange={field.onChange}
            />
          </div>
        )}
      />
    );
  }

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${name}-toggle`}>{label}</Label>
          <Switch
            id={`${name}-toggle`}
            checked={field.value === "yes"}
            disabled={readOnly}
            onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
          />
        </div>
      )}
    />
  );
}

export function ProductSidebar({
  detail,
  readOnly = false,
}: Readonly<{
  detail: DashboardProductDetail;
  readOnly?: boolean;
}>) {
  const { control } = useFormContext<ProductFormValues>();
  const { stock, backorderSummary } = detail;
  const showOnPo = stock.onPurchaseOrder > 0;

  return (
    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Existencias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <StockRow label="Físico" value={formatQty(stock.physical)} />
          <StockRow label="Reservado" value={formatQty(stock.reserved)} />
          <StockRow label="Disponible" value={formatQty(stock.sellableAvailable)} strong />
          {stock.committed > 0 ? (
            <StockRow label="Comprometido" value={formatQty(stock.committed)} />
          ) : null}
          {showOnPo ? (
            <StockRow label="En órdenes de compra" value={formatQty(stock.onPurchaseOrder)} />
          ) : null}
        </CardContent>
      </Card>

      {backorderSummary.totalBackordered > 0 ? (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="py-3 text-amber-800 text-sm dark:text-amber-200">
            <span className="font-semibold">
              {formatQty(backorderSummary.totalBackordered)} pendientes
            </span>{" "}
            en {backorderSummary.orderCount}{" "}
            {backorderSummary.orderCount === 1 ? "pedido" : "pedidos"}
            <div className="text-amber-700 text-xs dark:text-amber-300">
              Este producto tiene backorder.
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow name="trackStock" label="Rastrear stock" readOnly={readOnly} />
          <ToggleRow name="trackBatches" label="Rastrear lotes" readOnly={readOnly} />
          <ToggleRow name="manageMinimumStock" label="Gestionar stock mínimo" readOnly={readOnly} />
          <ToggleRow name="availableForCustomers" label="Activo / Vendible" readOnly={readOnly} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                disabled={readOnly}
                placeholder="Notas internas sobre el producto…"
                rows={5}
              />
            )}
          />
          <p className="mt-1 text-muted-foreground text-xs">
            Nota a nivel de producto (igual en todas las bodegas).
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}
