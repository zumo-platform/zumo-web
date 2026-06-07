export const DEFAULT_SUPPLIER_TIMEZONE = "America/Costa_Rica";

/** Parse DB/API instants as UTC when timezone suffix is missing. */
export function parseInstantIso(raw: string | null | undefined): Date | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  let normalized = trimmed.includes(" ") && !trimmed.includes("T")
    ? trimmed.replace(" ", "T")
    : trimmed;

  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/u.test(normalized);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/u.test(normalized) && !hasOffset) {
    normalized = `${normalized}Z`;
  }

  const d = new Date(normalized);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** YYYY-MM-DD in supplier timezone (en-CA locale). */
export function calendarDateInTimezone(
  timeZone: string = DEFAULT_SUPPLIER_TIMEZONE,
  instant: Date = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function calendarDayKeyInTimezone(
  instant: Date,
  timeZone: string = DEFAULT_SUPPLIER_TIMEZONE,
): string {
  return calendarDateInTimezone(timeZone, instant);
}

function parseDateInputToUtcNoon(dateInput: string): Date {
  const [y, m, d] = dateInput.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function utcDayOfWeek(dateInput: string): number {
  return parseDateInputToUtcNoon(dateInput).getUTCDay();
}

function addDaysToDateInput(dateInput: string, days: number): string {
  const dt = parseDateInputToUtcNoon(dateInput);
  dt.setUTCDate(dt.getUTCDate() + days);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${String(y)}-${m}-${d}`;
}

/** Next Mon–Fri on or after tomorrow in supplier timezone. */
export function nextBusinessDayInTimezone(
  timeZone: string = DEFAULT_SUPPLIER_TIMEZONE,
): string {
  let cursor = addDaysToDateInput(calendarDateInTimezone(timeZone), 1);
  for (let i = 0; i < 14; i++) {
    const dow = utcDayOfWeek(cursor);
    if (dow !== 0 && dow !== 6) return cursor;
    cursor = addDaysToDateInput(cursor, 1);
  }
  return cursor;
}

export function isValidDeliveryDateInput(
  value: string | null | undefined,
  timeZone: string = DEFAULT_SUPPLIER_TIMEZONE,
): boolean {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/u.test(trimmed)) return false;
  const today = calendarDateInTimezone(timeZone);
  return trimmed >= today;
}

/** Format stored YYYY-MM-DD without UTC midnight drift. */
export function formatStoredDateOnly(
  raw: string | null | undefined,
  locale = "es",
): string {
  const trimmed = raw?.trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/u.test(trimmed)) return "—";
  const [y, m, d] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return trimmed;
  }
}

export function formatInstantDateInTimezone(
  iso: string | null | undefined,
  timeZone: string = DEFAULT_SUPPLIER_TIMEZONE,
  locale = "es",
): string {
  if (!iso?.trim()) return "—";
  try {
    const d = parseInstantIso(iso);
    if (!d) return "—";
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone }).format(d);
  } catch {
    return "—";
  }
}

export function formatInstantTimeInTimezone(
  iso: string | null | undefined,
  timeZone: string = DEFAULT_SUPPLIER_TIMEZONE,
  locale = "es",
): string {
  if (!iso?.trim()) return "—";
  try {
    const d = parseInstantIso(iso);
    if (!d) return "—";
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).format(d);
  } catch {
    return "—";
  }
}

export function formatInstantDateTimeInTimezone(
  iso: string | null | undefined,
  timeZone: string = DEFAULT_SUPPLIER_TIMEZONE,
  locale = "es",
): string {
  if (!iso?.trim()) return "—";
  try {
    const d = parseInstantIso(iso);
    if (!d) return "—";
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).format(d);
  } catch {
    return "—";
  }
}

/** Catalog table style: `6 jun 2026 - 18:30`. */
export function formatInstantCreatedAtInTimezone(
  iso: string | null | undefined,
  timeZone: string = DEFAULT_SUPPLIER_TIMEZONE,
  locale = "es",
): string {
  const date = formatInstantDateInTimezone(iso, timeZone, locale);
  const time = formatInstantTimeInTimezone(iso, timeZone, locale);
  if (date === "—" || time === "—") return "—";
  return `${date} - ${time}`;
}
