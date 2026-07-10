"use client";

import { CircleHelp } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatQty } from "@/lib/inventory-format";
import { INVENTORY_TOOLTIPS } from "@/lib/pricing-copy";
import type { BatchSettings, TrackBatchesMode } from "@/lib/lot-nomenclature";
import type { DashboardProductDetail } from "@/lib/product-detail";
import { resolveEffectiveTrackBatchesMode, type ProductFormValues } from "@/lib/product-form";

function StockRow({
  label,
  value,
  strong = false,
  tip,
}: Readonly<{ label: string; value: string; strong?: boolean; tip?: string }>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1 text-muted-foreground">
        {label}
        {tip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label={`Ayuda: ${label}`}
                className="inline-flex rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
              >
                <CircleHelp aria-hidden className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-sm">
              <p>{tip}</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </span>
      <span className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</span>
    </div>
  );
}

function ToggleRow({
  name,
  label,
  tooltip,
  readOnly,
}: Readonly<{
  name: "trackStock" | "manageMinimumStock" | "availableForCustomers";
  label: string;
  tooltip: string;
  readOnly?: boolean;
}>) {
  const { control } = useFormContext<ProductFormValues>();

  const labelNode = (
    <div className="flex min-w-0 items-center gap-1.5">
      <Label htmlFor={`${name}-toggle`}>{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label={`Ayuda: ${label}`}
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            type="button"
          >
            <CircleHelp aria-hidden className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64" side="top" sideOffset={6}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );

  if (name === "availableForCustomers") {
    return (
      <Controller
        name="availableForCustomers"
        control={control}
        render={({ field }) => (
          <div className="flex items-center justify-between gap-3">
            {labelNode}
            <Switch
              id={`${name}-toggle`}
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
          {labelNode}
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

function TrackBatchesModeRow({
  detail,
  batchSettings,
  readOnly,
}: Readonly<{
  detail: DashboardProductDetail;
  batchSettings: BatchSettings | null;
  readOnly?: boolean;
}>) {
  const { control } = useFormContext<ProductFormValues>();
  const globalDefault = batchSettings?.trackBatchesDefault ?? false;
  const globalLabel = globalDefault ? "ON" : "OFF";
  const hasLiveBatches = detail.batches.some(
    (batch) => batch.status === "active" && batch.onHand > 0,
  );
  const help =
    "Heredar usa el valor global. Sí/No anulan la configuración solo para este producto.";

  return (
    <Controller
      name="trackBatchesMode"
      control={control}
      render={({ field }) => {
        const currentEffective = resolveEffectiveTrackBatchesMode(
          field.value as TrackBatchesMode,
          globalDefault,
        );
        const blocksOff = hasLiveBatches && currentEffective;
        const inheritWouldDisable = !globalDefault && blocksOff;
        return (
          <div className="space-y-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <Label htmlFor="track-batches-mode">Rastrear lotes</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Ayuda: Rastrear lotes"
                    className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    type="button"
                  >
                    <CircleHelp aria-hidden className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-64" side="top" sideOffset={6}>
                  {help}
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              disabled={readOnly}
              value={field.value}
              onValueChange={(value) => field.onChange(value as TrackBatchesMode)}
            >
              <SelectTrigger id="track-batches-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem disabled={inheritWouldDisable} value="inherit">
                  Heredar (global: {globalLabel})
                </SelectItem>
                <SelectItem value="on">Sí</SelectItem>
                <SelectItem disabled={blocksOff} value="off">
                  No
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Efectivo: {detail.product.trackBatches ? "activado" : "desactivado"}.
              {blocksOff ? " No se puede desactivar: hay lotes con existencias." : ""}
            </p>
          </div>
        );
      }}
    />
  );
}

export function ProductSidebar({
  detail,
  readOnly = false,
  batchSettings,
}: Readonly<{
  detail: DashboardProductDetail;
  readOnly?: boolean;
  batchSettings: BatchSettings | null;
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
          <StockRow label="Reservado" tip={INVENTORY_TOOLTIPS.reserved} value={formatQty(stock.reserved)} />
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
          <ToggleRow
            name="trackStock"
            label="Rastrear stock"
            tooltip="Controla existencias físicas, disponibilidad y movimientos de inventario para este producto."
            readOnly={readOnly}
          />
          <TrackBatchesModeRow
            detail={detail}
            batchSettings={batchSettings}
            readOnly={readOnly}
          />
          <ToggleRow
            name="manageMinimumStock"
            label="Gestionar stock mínimo"
            tooltip="Activa alertas y sugerencias de compra cuando la existencia disponible baja del mínimo configurado."
            readOnly={readOnly}
          />
          <ToggleRow
            name="availableForCustomers"
            label="Activo / Vendible"
            tooltip="Define si el producto está disponible para venderse y aparecer en flujos de pedidos."
            readOnly={readOnly}
          />
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
