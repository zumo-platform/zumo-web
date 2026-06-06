/** Parse YYYY-MM-DD as a local calendar date (no UTC midnight drift). */
export function dateInputToLocalDate(dateInput: string): Date {
  const [y, m, d] = dateInput.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a local calendar date as YYYY-MM-DD. */
export function localDateToDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${String(y)}-${m}-${d}`;
}
