"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  CUSTOMER_PRICE_SOURCE_LABEL,
  fetchCustomerProductPricingViaProxy,
  type CustomerProductPricingRow,
} from "@/lib/customer-product-pricing";
import {
  fetchProductsViaProxy,
  type DashboardProductRow,
} from "@/lib/dashboard-products";
import { formatOrderMoney, selectableCatalogProducts } from "@/lib/order-product-search";
import { formatDiscountPct } from "@/lib/pricing-copy";
import { formatUnitAbbreviation } from "@/lib/product-unit";
import { cn } from "@/lib/utils";

const MAX_DROPDOWN_RESULTS = 20;

function productOptionSubtitle(product: DashboardProductRow): string {
  const parts = [
    product.sku,
    formatUnitAbbreviation(product.unit),
    product.presentation,
  ].filter((part): part is string => Boolean(part && part.trim()));
  return parts.join(" · ");
}

function searchProductsForPicker(
  products: readonly DashboardProductRow[],
  query: string,
  maxResults = MAX_DROPDOWN_RESULTS,
): DashboardProductRow[] {
  const q = query.trim().toLowerCase();
  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name, "es"));
  if (!q) return sorted.slice(0, maxResults);

  const matches: DashboardProductRow[] = [];
  for (const product of sorted) {
    const name = product.name.toLowerCase();
    const sku = (product.sku ?? "").toLowerCase();
    const presentation = (product.presentation ?? "").toLowerCase();
    const unit = product.unit.toLowerCase();
    if (
      name.includes(q) ||
      sku.includes(q) ||
      presentation.includes(q) ||
      unit.includes(q)
    ) {
      matches.push(product);
      if (matches.length >= maxResults) break;
    }
  }
  return matches;
}

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
  description = "Elegí un producto del catálogo para ver el precio de este cliente, no el general.",
  className,
}: Readonly<{
  customerId: number;
  title?: string;
  description?: string;
  className?: string;
}>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [catalog, setCatalog] = useState<DashboardProductRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [pricingRow, setPricingRow] = useState<CustomerProductPricingRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError(null);
    void fetchProductsViaProxy()
      .then((rows) => {
        if (!active) return;
        setCatalog(selectableCatalogProducts(rows));
        setCatalogLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setCatalogError("No se pudo cargar el catálogo de productos.");
        setCatalog([]);
        setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const results = useMemo(
    () => searchProductsForPicker(catalog, query),
    [catalog, query],
  );

  useEffect(() => {
    if (selectedProductId == null) {
      setPricingRow(null);
      setError(null);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    void fetchCustomerProductPricingViaProxy(customerId, {
      productIds: [selectedProductId],
      signal: ctrl.signal,
    })
      .then((items) => {
        setPricingRow(items[0] ?? null);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "No se pudo consultar el precio.");
        setPricingRow(null);
        setLoading(false);
      });

    return () => ctrl.abort();
  }, [customerId, selectedProductId]);

  function selectProduct(product: DashboardProductRow) {
    setSelectedProductId(product.productId);
    setQuery(product.name);
    setOpen(false);
    setError(null);
  }

  function onQueryChange(value: string) {
    setQuery(value);
    setOpen(true);
    if (selectedProductId != null) {
      const selected = catalog.find((p) => p.productId === selectedProductId);
      if (!selected || value.trim() !== selected.name) {
        setSelectedProductId(null);
        setPricingRow(null);
        setError(null);
      }
    }
  }

  return (
    <section className={cn("space-y-3 rounded-lg border bg-card p-4 shadow-sm", className)}>
      <div className="space-y-1">
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
      </div>

      <div className="relative" ref={rootRef}>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-autocomplete="list"
          aria-controls="customer-price-product-list"
          aria-expanded={open}
          aria-label="Buscar producto por nombre, SKU o presentación"
          className="pl-9"
          disabled={catalogLoading}
          placeholder="Nombre, SKU o presentación…"
          role="combobox"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        {open && !catalogLoading ? (
          <ul
            className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-md"
            id="customer-price-product-list"
            role="listbox"
          >
            {results.length === 0 ? (
              <li className="px-3 py-2 text-muted-foreground text-sm">
                {query.trim()
                  ? `No encontramos productos para “${query.trim()}”.`
                  : "No hay productos activos en el catálogo."}
              </li>
            ) : (
              results.map((product) => {
                const subtitle = productOptionSubtitle(product);
                const selected = product.productId === selectedProductId;
                return (
                  <li key={product.productId} role="option">
                    <button
                      aria-selected={selected}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted/60",
                        selected && "bg-muted/40",
                      )}
                      type="button"
                      onClick={() => selectProduct(product)}
                    >
                      <span className="font-medium leading-snug">{product.name}</span>
                      {subtitle ? (
                        <span className="text-muted-foreground text-xs">{subtitle}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>

      {catalogLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Cargando catálogo…
        </div>
      ) : null}

      {catalogError ? (
        <p className="text-destructive text-sm" role="alert">
          {catalogError}
        </p>
      ) : null}

      {loading && selectedProductId != null ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Consultando precio…
        </div>
      ) : null}

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {pricingRow && !loading ? <PriceResultCard row={pricingRow} /> : null}

      {selectedProductId != null && !loading && !error && pricingRow == null ? (
        <p className="text-muted-foreground text-sm">No hay precio disponible para este producto.</p>
      ) : null}
    </section>
  );
}
