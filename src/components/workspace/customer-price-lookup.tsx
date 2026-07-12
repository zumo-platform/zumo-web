"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  CUSTOMER_PRICE_SOURCE_LABEL,
  fetchCustomerProductPricingViaProxy,
  type CustomerProductPricingRow,
} from "@/lib/customer-product-pricing";
import { formatOrderMoney } from "@/lib/order-product-search";
import { formatDiscountPct } from "@/lib/pricing-copy";
import { formatUnitAbbreviation } from "@/lib/product-unit";
import { cn } from "@/lib/utils";

function PriceResultCard({ row }: Readonly<{ row: CustomerProductPricingRow }>) {
  const hasDiscount = row.discountPct > 0 && row.basePrice != null && row.unitPrice != null;
  const sourceLabel =
    CUSTOMER_PRICE_SOURCE_LABEL[row.priceSource] ??
    CUSTOMER_PRICE_SOURCE_LABEL[row.layerSource] ??
    row.priceSource;

  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm leading-snug">{row.name}</p>
          <p className="text-muted-foreground text-xs">
            {[row.sku, formatUnitAbbreviation(row.unit)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {row.unitPrice != null ? (
            <p className="font-semibold text-sm tabular-nums">{formatOrderMoney(row.unitPrice)}</p>
          ) : (
            <p className="text-muted-foreground text-sm">Sin precio</p>
          )}
          {hasDiscount ? (
            <p className="text-muted-foreground text-xs line-through tabular-nums">
              {formatOrderMoney(row.basePrice!)}
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-1.5 text-muted-foreground text-xs">
        {sourceLabel}
        {hasDiscount ? (
          <>
            {" "}
            · {formatDiscountPct(String(row.discountPct))}
            {row.discountListName ? ` (${row.discountListName})` : ""}
          </>
        ) : null}
      </p>
    </div>
  );
}

export function CustomerPriceLookup({
  customerId,
  title = "Consultar precio de un producto",
  description = "Buscá por nombre o SKU para ver el precio de este cliente, no el catálogo general.",
  className,
}: Readonly<{
  customerId: number;
  title?: string;
  description?: string;
  className?: string;
}>) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<CustomerProductPricingRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();

  const activeQuery = trimmed.length >= 2 ? trimmed : "";

  useEffect(() => {
    if (!activeQuery) return;

    const ctrl = new AbortController();

    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      void fetchCustomerProductPricingViaProxy(customerId, { q: activeQuery, signal: ctrl.signal })
        .then((items) => {
          setRows(items);
          setLoading(false);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "No se pudo consultar el precio.");
          setRows([]);
          setLoading(false);
        });
    }, 300);

    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [activeQuery, customerId]);

  const emptyMessage = useMemo(() => {
    if (!activeQuery) return null;
    if (loading || rows == null) return null;
    if (rows.length > 0) return null;
    return `No encontramos productos para “${activeQuery}”.`;
  }, [activeQuery, loading, rows]);

  return (
    <section className={cn("space-y-3 rounded-lg border bg-card p-4 shadow-sm", className)}>
      <div className="space-y-1">
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
      </div>

      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Buscar producto por nombre o SKU"
          className="pl-9"
          placeholder="Ej. cebollas, ARR-PRE-1…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 2) {
              setRows(null);
              setLoading(false);
              setError(null);
            }
          }}
        />
      </div>

      {trimmed.length > 0 && trimmed.length < 2 ? (
        <p className="text-muted-foreground text-xs">Escribí al menos 2 caracteres.</p>
      ) : null}

      {loading && activeQuery ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Buscando precio…
        </div>
      ) : null}

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {emptyMessage ? <p className="text-muted-foreground text-sm">{emptyMessage}</p> : null}

      {rows != null && rows.length > 0 && activeQuery ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <PriceResultCard key={row.productId} row={row} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
