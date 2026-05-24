"use client";

import {
  ORDER_STATUS_FILTER_OPTIONS,
  type DashboardOrderStatus,
} from "@/lib/dashboard-orders";
import { cn } from "@/lib/utils";

export function OrderStatusFilterChips({
  selected,
  onChange,
}: Readonly<{
  selected: readonly DashboardOrderStatus[];
  onChange: (next: DashboardOrderStatus[]) => void;
}>) {
  const selectedSet = new Set(selected);

  function toggle(value: DashboardOrderStatus) {
    if (selectedSet.has(value)) {
      const next = selected.filter((s) => s !== value);
      onChange(next.length > 0 ? next : [value]);
      return;
    }
    onChange([...selected, value]);
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
      {ORDER_STATUS_FILTER_OPTIONS.map((opt) => {
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
    </div>
  );
}
