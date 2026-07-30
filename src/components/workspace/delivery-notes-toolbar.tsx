"use client";

import { memo } from "react";

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

export const DeliveryNotesToolbar = memo(function DeliveryNotesToolbar({
  searchQuery,
  dateFilter,
  resultCount,
  onSearchChange,
  onDateChange,
  onClearSearch,
}: Readonly<{
  searchQuery: string;
  dateFilter: string;
  resultCount: number;
  onSearchChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onClearSearch: () => void;
}>) {
  const hasQuery = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Buscar notas de entrega"
            className="h-9 pr-8 pl-9"
            placeholder="Buscar por cliente, productos, pedido o nota"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {hasQuery ? (
            <button
              aria-label="Limpiar búsqueda"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              type="button"
              onClick={onClearSearch}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="delivery-notes-date-filter">
            Fecha programada
          </label>
          <Input
            className="h-9 w-[10.5rem]"
            id="delivery-notes-date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
      </div>

      {hasQuery || dateFilter ? (
        <p className="text-muted-foreground text-xs">
          {resultCount === 1 ? "1 nota de entrega" : `${resultCount} notas de entrega`}
        </p>
      ) : null}
    </div>
  );
});
