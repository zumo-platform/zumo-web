import {
  calendarDateInTimezone,
  DEFAULT_SUPPLIER_TIMEZONE,
  nextBusinessDayInTimezone,
} from "@/lib/supplier-timezone";

/** YYYY-MM-DD in supplier calendar (no timezone drift for date-only fields). */
export function formatDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${String(y)}-${m}-${d}`;
}

/** Next Mon–Fri delivery date (skips Sat/Sun) in supplier timezone. */
export function nextBusinessDay(timeZone: string = DEFAULT_SUPPLIER_TIMEZONE): string {
  return nextBusinessDayInTimezone(timeZone);
}

/** Default delivery date when AI did not set one. */
export function defaultDeliveryDateForOrder(
  stored: string | null | undefined,
  timeZone: string = DEFAULT_SUPPLIER_TIMEZONE,
): string {
  const trimmed = stored?.trim();
  if (trimmed && /^\d{4}-\d{2}-\d{2}$/u.test(trimmed)) return trimmed;
  return nextBusinessDay(timeZone);
}

export function minDeliveryDateInput(timeZone: string = DEFAULT_SUPPLIER_TIMEZONE): string {
  return calendarDateInTimezone(timeZone);
}
