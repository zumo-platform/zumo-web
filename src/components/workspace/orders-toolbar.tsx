"use client";

import { memo } from "react";

import { LayoutGrid, List, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderStatusFilterDropdown } from "@/components/workspace/order-status-filter-dropdown";
import {
  ordersBoardViewLabel,
  type OrderStatusFilterLogic,
  type OrdersViewMode,
} from "@/lib/dashboard-orders";
import type { EffectiveStatusItem } from "@/lib/order-status-flow";
import { useWorkspaceLocale } from "@/lib/use-workspace-locale";
import { cn } from "@/lib/utils";

export const OrdersToolbar = memo(function OrdersToolbar({
  view,
  searchQuery,
  deliveryDateFilter,
  resultCount,
  flow,
  statusFilter,
  statusLogic,
  onViewChange,
  onSearchChange,
  onDeliveryDateChange,
  onClearSearch,
  onStatusFilterChange,
}: Readonly<{
  view: OrdersViewMode;
  searchQuery: string;
  deliveryDateFilter: string;
  resultCount: number;
  flow: EffectiveStatusItem[];
  statusFilter: readonly string[];
  statusLogic: OrderStatusFilterLogic;
  onViewChange: (view: OrdersViewMode) => void;
  onSearchChange: (value: string) => void;
  onDeliveryDateChange: (value: string) => void;
  onClearSearch: () => void;
  onStatusFilterChange: (next: readonly string[], logic: OrderStatusFilterLogic) => void;
}>) {
  const locale = useWorkspaceLocale();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Buscar pedidos"
            className="h-9 pr-8 pl-9"
            placeholder="Buscar por cliente, productos, pedido"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery ? (
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
          <OrderStatusFilterDropdown
            flow={flow}
            logic={statusLogic}
            selected={statusFilter}
            onChange={onStatusFilterChange}
          />

          <label className="sr-only" htmlFor="orders-delivery-filter">
            Fecha de entrega
          </label>
          <Input
            className="h-9 w-[10.5rem]"
            id="orders-delivery-filter"
            type="date"
            value={deliveryDateFilter}
            onChange={(e) => onDeliveryDateChange(e.target.value)}
          />
        </div>

        <div
          className="inline-flex rounded-lg border bg-muted/40 p-0.5"
          role="group"
          aria-label="Vista de pedidos"
        >
          <Button
            aria-pressed={view === "list"}
            className={cn("h-8 gap-1.5 px-3", view === "list" && "shadow-sm")}
            size="sm"
            type="button"
            variant={view === "list" ? "default" : "ghost"}
            onClick={() => onViewChange("list")}
          >
            <List aria-hidden className="size-4" />
            Lista
          </Button>
          <Button
            aria-pressed={view === "board"}
            className={cn("h-8 gap-1.5 px-3", view === "board" && "shadow-sm")}
            size="sm"
            type="button"
            variant={view === "board" ? "default" : "ghost"}
            onClick={() => onViewChange("board")}
          >
            <LayoutGrid aria-hidden className="size-4" />
            {ordersBoardViewLabel(locale)}
          </Button>
        </div>
      </div>

      {searchQuery.trim() ? (
        <p className="text-muted-foreground text-xs">
          {resultCount === 1 ? "1 pedido" : `${resultCount} pedidos`}
        </p>
      ) : null}
    </div>
  );
});
