"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ISO_WEEKDAY_OPTIONS } from "@/lib/delivery";
import { cn } from "@/lib/utils";

export function DeliveryWeekdaysPicker({
  value,
  onChange,
  disabled = false,
  className,
}: Readonly<{
  value: readonly number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
  className?: string;
}>) {
  const selected = new Set(value);

  function toggle(day: number, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(day);
    else next.delete(day);
    onChange([...next].sort((a, b) => a - b));
  }

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {ISO_WEEKDAY_OPTIONS.map((day) => {
        const id = `delivery-day-${day.value}`;
        return (
          <div key={day.value} className="flex items-center gap-2">
            <Checkbox
              checked={selected.has(day.value)}
              disabled={disabled}
              id={id}
              onCheckedChange={(checked) => toggle(day.value, checked === true)}
            />
            <Label className="font-normal" htmlFor={id}>
              {day.label}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
