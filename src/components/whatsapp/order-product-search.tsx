"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { DashboardProductRow } from "@/lib/dashboard-products";
import { formatOrderMoney, parseProductPrice, searchCatalogProducts } from "@/lib/order-product-search";
import { cn } from "@/lib/utils";

export function OrderProductSearch({
  products,
  orderProductIds,
  onSelectProduct,
  onOpenCatalog,
}: Readonly<{
  products: readonly DashboardProductRow[];
  orderProductIds: ReadonlySet<number>;
  onSelectProduct: (product: DashboardProductRow) => void;
  onOpenCatalog: () => void;
}>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => searchCatalogProducts(products, query),
    [products, query],
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="space-y-2" ref={rootRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar producto por nombre o SKU…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(e.target.value.trim().length >= 2);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
        />
        {open && results.length > 0 ? (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
            {results.map((product) => {
              const onOrder = orderProductIds.has(product.productId);
              const price = parseProductPrice(product.price);
              return (
                <li key={product.productId}>
                  <button
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60",
                      onOrder && "cursor-not-allowed text-muted-foreground opacity-50 hover:bg-transparent",
                    )}
                    disabled={onOrder}
                    type="button"
                    onClick={() => {
                      if (onOrder) return;
                      onSelectProduct(product);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 truncate">
                      {product.name}
                      {product.sku ? (
                        <span className="text-muted-foreground"> · {product.sku}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatOrderMoney(price)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      <button
        className="text-primary text-sm underline underline-offset-4"
        type="button"
        onClick={onOpenCatalog}
      >
        Ver todos
      </button>
    </div>
  );
}
