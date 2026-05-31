"use client";

import {
  flowToFilterOptions,
  type EffectiveStatusItem,
} from "@/lib/order-status-flow";
import { cn } from "@/lib/utils";

export function OrderStatusFilterChips({
  flow,
  selected,
  onChange,
}: Readonly<{
  flow: EffectiveStatusItem[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
}>) {
  const selectedSet = new Set(selected);
  const options = flowToFilterOptions(flow);
  const linear = options.filter((o) => o.value !== "cancelled");
  const cancelled = options.find((o) => o.value === "cancelled");

  function toggle(value: string) {
    if (selectedSet.has(value)) {
      const next = selected.filter((s) => s !== value);
      onChange(next.length > 0 ? next : [value]);
      return;
    }
    onChange([...selected, value]);
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
      {linear.map((opt) => {
        const active = selectedSet.has(opt.value);
        return (
          <button
            key={opt.value}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
            type="button"
            onClick={() => toggle(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
      {cancelled ? (
        <>
          <span aria-hidden className="mx-1 h-4 w-px bg-border" />
          <button
            aria-pressed={selectedSet.has(cancelled.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              selectedSet.has(cancelled.value)
                ? "border-destructive bg-destructive text-white"
                : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
            type="button"
            onClick={() => toggle(cancelled.value)}
          >
            {cancelled.label}
          </button>
        </>
      ) : null}
    </div>
  );
}
