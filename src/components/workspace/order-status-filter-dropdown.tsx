"use client";

import { useMemo, useState } from "react";

import { ChevronDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DEFAULT_ORDER_STATUS_FILTER,
  formatOrderStatusFilterSummary,
  type OrderStatusFilterLogic,
} from "@/lib/dashboard-orders";
import { flowToFilterOptions, type EffectiveStatusItem } from "@/lib/order-status-flow";
import { cn } from "@/lib/utils";

export function OrderStatusFilterDropdown({
  flow,
  selected,
  logic,
  onChange,
}: Readonly<{
  flow: EffectiveStatusItem[];
  selected: readonly string[];
  logic: OrderStatusFilterLogic;
  onChange: (next: readonly string[], nextLogic: OrderStatusFilterLogic) => void;
}>) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => flowToFilterOptions(flow), [flow]);
  const labelByKey = useMemo(
    () => new Map(options.map((opt) => [opt.value, opt.label])),
    [options],
  );
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const orderedSelected = useMemo(
    () => options.map((opt) => opt.value).filter((value) => selectedSet.has(value)),
    [options, selectedSet],
  );
  const summary = formatOrderStatusFilterSummary(orderedSelected, labelByKey);
  const hasSelection = selected.length > 0;

  function toggleStatus(value: string) {
    if (selectedSet.has(value)) {
      const next = selected.filter((s) => s !== value);
      onChange(next, logic);
      return;
    }
    onChange([...selected, value], logic);
  }

  function clearFilter() {
    onChange([], logic);
    setOpen(false);
  }

  function resetToDefault() {
    onChange([...DEFAULT_ORDER_STATUS_FILTER], logic);
    setOpen(false);
  }

  function setLogic(next: OrderStatusFilterLogic) {
    onChange(selected, next);
  }

  const trigger = hasSelection ? (
    <div className="inline-flex h-9 max-w-[14rem] items-stretch overflow-hidden rounded-full border bg-background text-sm shadow-xs">
      <PopoverTrigger asChild>
        <button
          className="inline-flex min-w-0 flex-1 items-stretch hover:bg-muted/50"
          type="button"
        >
          <span className="shrink-0 px-3 font-medium">Estado</span>
          <span className="min-w-0 flex-1 truncate border-l px-3 text-left">{summary}</span>
        </button>
      </PopoverTrigger>
      <button
        aria-label="Quitar filtro de estado"
        className="shrink-0 border-l px-2.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          clearFilter();
        }}
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </div>
  ) : (
    <PopoverTrigger asChild>
      <Button className="h-9 gap-1.5 px-3" type="button" variant="outline">
        Estado
        <ChevronDown aria-hidden className="size-3.5 opacity-60" />
      </Button>
    </PopoverTrigger>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {trigger}
      <PopoverContent align="start" className="w-64 p-0">
        <div className="border-b px-3 py-2.5">
          <p className="font-medium text-sm">Estado</p>
          {selected.length > 1 ? (
            <div
              className="mt-2 inline-flex rounded-md border bg-muted/40 p-0.5"
              role="group"
              aria-label="Lógica del filtro"
            >
              <button
                aria-pressed={logic === "or"}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  logic === "or"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                type="button"
                onClick={() => setLogic("or")}
              >
                OR
              </button>
              <button
                aria-pressed={logic === "and"}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  logic === "and"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                type="button"
                onClick={() => setLogic("and")}
              >
                AND
              </button>
            </div>
          ) : (
            <p className="mt-1 text-muted-foreground text-xs">
              Seleccioná uno o más estados para filtrar.
            </p>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {options.map((opt) => {
            const checked = selectedSet.has(opt.value);
            const isCancelled = opt.value === "cancelled";
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                  isCancelled && "text-destructive",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleStatus(opt.value)}
                />
                <span className={cn(isCancelled && checked && "font-medium")}>{opt.label}</span>
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t px-3 py-2">
          <button
            className="text-muted-foreground text-xs hover:text-foreground"
            type="button"
            onClick={resetToDefault}
          >
            Predeterminado
          </button>
          <button
            className="text-muted-foreground text-xs hover:text-foreground"
            type="button"
            onClick={clearFilter}
          >
            Limpiar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
