"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarIcon, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductsPageHeader } from "@/components/workspace/products-page-header";
import { AgingTableSkeleton } from "@/components/workspace/workspace-skeletons";
import { batchExpiryState, formatDateShort, formatMoneyCRC } from "@/lib/batch-format";
import { dateInputToLocalDate, localDateToDateInput } from "@/lib/date-input";
import {
  type AgingBatchRow,
  fetchAgingReportViaProxy,
  fetchVendorsViaProxy,
  type DashboardVendorRow,
} from "@/lib/inventory";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspaceTableCardClassName,
} from "@/lib/workspace-layout";

const DAYS_OPTIONS = [7, 14, 30, 60] as const;
const CUSTOM_DATE_FMT = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

type RangeMode = "preset" | "custom";

function daysFromToday(dateInput: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = dateInputToLocalDate(dateInput);
  const diff = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
  return Math.max(1, Math.min(365, diff));
}

function matchesQuery(value: string | null | undefined, query: string): boolean {
  if (!query) return true;
  return (value ?? "").toLowerCase().includes(query);
}

export function AgingReportView() {
  const [rangeMode, setRangeMode] = useState<RangeMode>("preset");
  const [presetDays, setPresetDays] = useState<number>(14);
  const [customEndDate, setCustomEndDate] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [rows, setRows] = useState<AgingBatchRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<readonly DashboardVendorRow[]>([]);

  const [productQuery, setProductQuery] = useState("");
  const [skuQuery, setSkuQuery] = useState("");
  const [vendorFilter, setVendorFilter] = useState<string>("all");

  const fetchDays = useMemo(() => {
    if (rangeMode === "preset") return presetDays;
    if (!customEndDate) return null;
    return daysFromToday(customEndDate);
  }, [customEndDate, presetDays, rangeMode]);

  const refresh = useCallback(async (days: number, signal?: AbortSignal) => {
    setError(null);
    try {
      const data = await fetchAgingReportViaProxy(days, { signal });
      setRows(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "No se pudo cargar el reporte.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void fetchVendorsViaProxy()
      .then(setVendors)
      .catch(() => setVendors([]));
  }, []);

  useEffect(() => {
    if (fetchDays == null) {
      setRows([]);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    setRows(null);
    void refresh(fetchDays, ctrl.signal);
    return () => ctrl.abort();
  }, [fetchDays, refresh]);

  const vendorOptions = useMemo(() => {
    const byId = new Map<number, string>();
    for (const vendor of vendors) {
      if (vendor.isActive) byId.set(vendor.vendorId, vendor.name);
    }
    for (const row of rows ?? []) {
      if (row.vendorId != null && row.vendorName) {
        byId.set(row.vendorId, row.vendorName);
      }
    }
    return [...byId.entries()]
      .map(([vendorId, name]) => ({ vendorId, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [rows, vendors]);

  const filteredRows = useMemo(() => {
    const productQ = productQuery.trim().toLowerCase();
    const skuQ = skuQuery.trim().toLowerCase();
    const vendorId =
      vendorFilter === "all" ? null : Number.isFinite(Number(vendorFilter)) ? Number(vendorFilter) : null;

    return (rows ?? []).filter((row) => {
      if (!matchesQuery(row.productName, productQ)) return false;
      if (!matchesQuery(row.sku, skuQ)) return false;
      if (vendorId != null && row.vendorId !== vendorId) return false;
      if (rangeMode === "custom" && customEndDate) {
        const end = dateInputToLocalDate(customEndDate);
        const expiry = dateInputToLocalDate(row.expiryDate.slice(0, 10));
        if (expiry.getTime() > end.getTime()) return false;
      }
      return true;
    });
  }, [customEndDate, productQuery, rangeMode, rows, skuQuery, vendorFilter]);

  const totalAtRisk = useMemo(
    () => filteredRows.reduce((s, r) => s + (r.valueAtRisk ?? 0), 0),
    [filteredRows],
  );

  const hasActiveFilters =
    productQuery.trim().length > 0 ||
    skuQuery.trim().length > 0 ||
    vendorFilter !== "all";

  const rangeLabel =
    rangeMode === "custom" && customEndDate
      ? `hasta el ${CUSTOM_DATE_FMT.format(dateInputToLocalDate(customEndDate))}`
      : `${fetchDays ?? presetDays} días`;

  function selectPreset(days: number) {
    setRangeMode("preset");
    setPresetDays(days);
    setCustomEndDate(null);
  }

  function selectCustomDate(date: Date) {
    setRangeMode("custom");
    setCustomEndDate(localDateToDateInput(date));
    setCalendarOpen(false);
  }

  const customSelectedDate = customEndDate ? dateInputToLocalDate(customEndDate) : undefined;
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const maxCustomDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 365);
    return d;
  }, [today]);

  return (
    <div className={workspaceContentOuterClassName}>
      <ProductsPageHeader
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/products">Volver a Inventario</Link>
          </Button>
        }
        description="Lotes activos próximos a vencer, con existencia disponible."
        subPage="Por vencer"
        title="Por vencer"
      />

      <div className={workspaceContentInnerClassName}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">Vencen en:</span>
            {DAYS_OPTIONS.map((d) => (
              <Button
                key={d}
                size="sm"
                type="button"
                variant={rangeMode === "preset" && presetDays === d ? "default" : "outline"}
                onClick={() => selectPreset(d)}
              >
                {d} días
              </Button>
            ))}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  className="gap-2"
                  size="sm"
                  type="button"
                  variant={rangeMode === "custom" ? "default" : "outline"}
                >
                  <CalendarIcon aria-hidden className="size-4" />
                  {rangeMode === "custom" && customEndDate
                    ? CUSTOM_DATE_FMT.format(dateInputToLocalDate(customEndDate))
                    : "Fecha personalizada"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  defaultMonth={customSelectedDate ?? today}
                  disabled={(day) => {
                    const t = day.getTime();
                    return t < today.getTime() || t > maxCustomDate.getTime();
                  }}
                  mode="single"
                  selected={customSelectedDate}
                  onSelect={(day) => {
                    if (!day) return;
                    selectCustomDate(day);
                  }}
                />
              </PopoverContent>
            </Popover>
            {filteredRows.length > 0 ? (
              <span className="ml-auto text-sm">
                Valor en riesgo:{" "}
                <span className="font-medium tabular-nums">{formatMoneyCRC(totalAtRisk)}</span>
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs" htmlFor="aging-product-search">
                Producto
              </Label>
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="pl-8"
                  id="aging-product-search"
                  placeholder="Buscar por nombre"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs" htmlFor="aging-sku-search">
                Código SKU
              </Label>
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="pl-8"
                  id="aging-sku-search"
                  placeholder="Buscar por SKU"
                  value={skuQuery}
                  onChange={(e) => setSkuQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label className="text-muted-foreground text-xs" htmlFor="aging-vendor-filter">
                Proveedor
              </Label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger id="aging-vendor-filter">
                  <SelectValue placeholder="Todos los proveedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  {vendorOptions.map((vendor) => (
                    <SelectItem key={vendor.vendorId} value={String(vendor.vendorId)}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {rangeMode === "custom" && !customEndDate ? (
          <p className="mt-4 text-muted-foreground text-sm">
            Elegí una fecha en el calendario para ver lotes que vencen hasta ese día.
          </p>
        ) : rows === null ? (
          <div className="mt-4">
            <AgingTableSkeleton />
          </div>
        ) : error ? (
          <div className="mt-4 flex flex-col items-start gap-2">
            <p className="text-destructive text-sm">{error}</p>
            {fetchDays != null ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRows(null);
                  void refresh(fetchDays);
                }}
              >
                Reintentar
              </Button>
            ) : null}
          </div>
        ) : filteredRows.length === 0 ? (
          <p className="mt-4 text-muted-foreground text-sm">
            {hasActiveFilters
              ? "Ningún lote coincide con los filtros aplicados."
              : `No hay lotes próximos a vencer en ${rangeLabel}.`}
          </p>
        ) : (
          <div className={cn("mt-4", workspaceTableCardClassName)}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">Costo unit.</TableHead>
                  <TableHead className="text-right">Valor en riesgo</TableHead>
                  <TableHead>Proveedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((r) => {
                  const exp = batchExpiryState(r.expiryDate, "active");
                  return (
                    <TableRow key={r.batchId}>
                      <TableCell className="font-medium">
                        <Link className="hover:underline" href={`/products/${r.productId}`}>
                          {r.productName}
                        </Link>
                        {r.sku ? (
                          <span className="block text-muted-foreground text-xs">{r.sku}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{r.batchNumber}</TableCell>
                      <TableCell className={exp.className}>
                        {formatDateShort(r.expiryDate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Badge variant={r.daysUntilExpiry <= 7 ? "destructive" : "outline"}>
                          {r.daysUntilExpiry}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.available.toLocaleString("es")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.unitCost != null ? formatMoneyCRC(r.unitCost) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.valueAtRisk != null ? formatMoneyCRC(r.valueAtRisk) : "—"}
                      </TableCell>
                      <TableCell>{r.vendorName ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredRows.length > 0 ? (
          <p className="mt-3 text-muted-foreground text-xs">
            {filteredRows.length.toLocaleString("es")} lote
            {filteredRows.length === 1 ? "" : "s"} · ventana: {rangeLabel}
            {hasActiveFilters ? " · filtros activos" : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
