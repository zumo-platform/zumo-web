"use client";

import { useMemo, useState } from "react";

import { CalendarIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAvailableDeliveryDates } from "@/hooks/use-available-delivery-dates";
import {
  isAllowedDeliveryDateSelection,
  type AvailableDeliveryDateRow,
} from "@/lib/delivery";
import { dateInputToLocalDate, localDateToDateInput } from "@/lib/date-input";
import { formatStoredDateOnly } from "@/lib/supplier-timezone";
import { cn } from "@/lib/utils";

function formatDisplayLabel(row: AvailableDeliveryDateRow | undefined, dateInput: string): string {
  const base = formatStoredDateOnly(dateInput);
  if (!row) return base;
  if (row.isSameDay) return `${base} (hoy)`;
  if (row.requiresConfirmation) return `${base} (requiere confirmación)`;
  return base;
}

export function mergePreservedDeliveryDate(
  dates: readonly AvailableDeliveryDateRow[],
  preservedDate?: string | null,
): AvailableDeliveryDateRow[] {
  const trimmed = preservedDate?.trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/u.test(trimmed)) return [...dates];
  if (dates.some((row) => row.date === trimmed)) return [...dates];
  return [
    {
      date: trimmed,
      isSameDay: false,
      isLate: false,
      requiresConfirmation: false,
    },
    ...dates,
  ];
}

type DeliveryDateFieldProps = Readonly<{
  dates: readonly AvailableDeliveryDateRow[];
  loading?: boolean;
  error?: string | null;
  value: string;
  onChange: (value: string) => void;
  preservedDate?: string | null;
  id?: string;
  label?: string;
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
}>;

export function DeliveryDateField({
  dates,
  loading = false,
  error = null,
  value,
  onChange,
  preservedDate,
  id = "delivery-date",
  label = "Fecha de entrega",
  showLabel = true,
  disabled = false,
  className,
}: DeliveryDateFieldProps) {
  const [open, setOpen] = useState(false);
  const options = mergePreservedDeliveryDate(dates, preservedDate ?? value);
  const valid = isAllowedDeliveryDateSelection(value, options, preservedDate ?? value);

  const allowedSet = useMemo(() => new Set(options.map((row) => row.date)), [options]);
  const optionsByDate = useMemo(
    () => new Map(options.map((row) => [row.date, row])),
    [options],
  );

  const selectedDate = value ? dateInputToLocalDate(value) : undefined;
  const firstDate = options[0]?.date;
  const lastDate = options.at(-1)?.date;
  const startMonth = firstDate ? dateInputToLocalDate(firstDate) : undefined;
  const endMonth = lastDate ? dateInputToLocalDate(lastDate) : undefined;
  const displayLabel = value
    ? formatDisplayLabel(optionsByDate.get(value), value)
    : "Seleccioná una fecha de entrega";

  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel ? <Label htmlFor={id}>{label}</Label> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-invalid={!valid && value ? true : undefined}
            className={cn(
              "h-9 w-full justify-between px-3 font-normal md:text-sm",
              !value && "text-muted-foreground",
            )}
            disabled={disabled || loading || options.length === 0}
            id={id}
            type="button"
            variant="outline"
          >
            {loading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Cargando fechas…
              </span>
            ) : (
              <span className="truncate">{displayLabel}</span>
            )}
            <CalendarIcon aria-hidden className="size-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            defaultMonth={selectedDate ?? startMonth}
            disabled={(day) => !allowedSet.has(localDateToDateInput(day))}
            endMonth={endMonth}
            mode="single"
            selected={selectedDate}
            startMonth={startMonth}
            onSelect={(day) => {
              if (!day) return;
              const next = localDateToDateInput(day);
              if (!allowedSet.has(next)) return;
              onChange(next);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      {!loading && !error && options.length === 0 ? (
        <p className="text-destructive text-xs">
          No hay fechas de entrega configuradas. Revisá la logística en Opciones.
        </p>
      ) : null}
      {!valid && value ? (
        <p className="text-destructive text-xs">
          Seleccioná una fecha de entrega disponible según la logística configurada.
        </p>
      ) : null}
    </div>
  );
}

export function DeliveryDateSelect({
  customerId,
  value,
  onChange,
  preservedDate,
  id,
  label,
  showLabel,
  disabled,
  className,
}: Readonly<{
  customerId?: number | null;
  value: string;
  onChange: (value: string) => void;
  preservedDate?: string | null;
  id?: string;
  label?: string;
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
}>) {
  const { dates, loading, error } = useAvailableDeliveryDates(customerId);

  return (
    <DeliveryDateField
      className={className}
      dates={dates}
      disabled={disabled}
      error={error}
      id={id}
      label={label}
      loading={loading}
      preservedDate={preservedDate}
      showLabel={showLabel}
      value={value}
      onChange={onChange}
    />
  );
}

export function useDeliveryDateSelectionState(
  customerId: number | null | undefined,
  storedDate: string | null | undefined,
) {
  const { dates, loading, error } = useAvailableDeliveryDates(customerId);
  const options = mergePreservedDeliveryDate(dates, storedDate);

  return {
    dates: options,
    loading,
    error,
    defaultDate: options[0]?.date ?? "",
    isValid: (value: string | null | undefined) =>
      isAllowedDeliveryDateSelection(value, options, storedDate),
  };
}
