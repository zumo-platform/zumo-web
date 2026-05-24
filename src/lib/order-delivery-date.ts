/** YYYY-MM-DD in local calendar (no timezone drift for date-only fields). */
export function formatDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${String(y)}-${m}-${d}`;
}

/** Next Mon–Fri delivery date (skips Sat/Sun). */
export function nextBusinessDay(from: Date = new Date()): string {
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  cursor.setDate(cursor.getDate() + 1);
  while (cursor.getDay() === 0 || cursor.getDay() === 6) {
    cursor.setDate(cursor.getDate() + 1);
  }
  return formatDateInputValue(cursor);
}

/** Default delivery date when AI did not set one. */
export function defaultDeliveryDateForOrder(stored: string | null | undefined): string {
  const trimmed = stored?.trim();
  if (trimmed && /^\d{4}-\d{2}-\d{2}$/u.test(trimmed)) return trimmed;
  return nextBusinessDay();
}
