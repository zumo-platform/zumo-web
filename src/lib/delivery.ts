/** Delivery settings, zones, and per-customer logistics API client. */

export type DeliveryCutoffType = "strict" | "flexible";

export type DeliverySettingsRow = Readonly<{
  defaultDeliveryWeekdays: number[];
  autoAssignNextDeliveryDate: boolean;
  cutoffType: DeliveryCutoffType;
  cutoffTime: string;
  timezone: string;
  defaultSameDayEnabled: boolean;
  defaultSameDayCutoffTime: string | null;
}>;

export type DeliveryZoneRow = Readonly<{
  zoneId: number;
  name: string;
  deliveryWeekdays: number[] | null;
  isActive: boolean;
}>;

export type ResolvedDeliverySchedule = Readonly<{
  weekdays: number[];
  weekdaysSource: "customer" | "zone" | "global";
  autoAssign: boolean;
  cutoffType: DeliveryCutoffType;
  cutoffTime: string;
  timezone: string;
  sameDayEnabled: boolean;
  sameDayCutoffTime: string | null;
}>;

export type CustomerDeliveryOverrides = Readonly<{
  deliveryZoneId: number | null;
  deliveryDaysOverride: number[] | null;
  sameDayEnabled: boolean | null;
  sameDayCutoffTime: string | null;
}>;

export type AvailableDeliveryDateRow = Readonly<{
  date: string;
  isSameDay: boolean;
  isLate: boolean;
  requiresConfirmation: boolean;
}>;

export type AvailableDeliveryDatesResponse = Readonly<{
  dates: AvailableDeliveryDateRow[];
  timezone: string;
}>;

export const ISO_WEEKDAY_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];

type ApiErrorBody = { error?: string; code?: string; message?: string };

function readApiErrorBody(body: ApiErrorBody, status: number): string {
  if (typeof body.message === "string" && body.message.trim().length > 0) {
    return body.message.trim();
  }
  if (typeof body.error === "string" && body.error.trim().length > 0) {
    return body.error.trim();
  }
  return `Error ${status}`;
}

async function readApiError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  return readApiErrorBody(body, res.status);
}

function parseSettings(raw: unknown): DeliverySettingsRow | null {
  if (!raw || typeof raw !== "object") return null;
  const settings = (raw as { settings?: unknown }).settings ?? raw;
  if (!settings || typeof settings !== "object") return null;
  const o = settings as Record<string, unknown>;
  const weekdays = Array.isArray(o.defaultDeliveryWeekdays)
    ? o.defaultDeliveryWeekdays
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
    : [1, 2, 3, 4, 5];
  return {
    defaultDeliveryWeekdays: weekdays,
    autoAssignNextDeliveryDate: o.autoAssignNextDeliveryDate !== false,
    cutoffType: o.cutoffType === "flexible" ? "flexible" : "strict",
    cutoffTime: typeof o.cutoffTime === "string" ? o.cutoffTime : "17:00",
    timezone: typeof o.timezone === "string" ? o.timezone : "America/Costa_Rica",
    defaultSameDayEnabled: o.defaultSameDayEnabled === true,
    defaultSameDayCutoffTime:
      typeof o.defaultSameDayCutoffTime === "string" ? o.defaultSameDayCutoffTime : null,
  };
}

function parseZone(raw: unknown): DeliveryZoneRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const zoneId = typeof o.zoneId === "number" ? o.zoneId : Number(o.zoneId);
  if (!Number.isFinite(zoneId) || zoneId <= 0) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) return null;
  const deliveryWeekdays = Array.isArray(o.deliveryWeekdays)
    ? o.deliveryWeekdays
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
    : null;
  return {
    zoneId,
    name,
    deliveryWeekdays,
    isActive: o.isActive !== false,
  };
}

export async function fetchDeliverySettingsViaProxy(): Promise<DeliverySettingsRow | null> {
  const res = await fetch("/api/backend/dashboard/delivery/settings", {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = (await res.json()) as unknown;
  return parseSettings(body);
}

export async function patchDeliverySettingsViaProxy(
  payload: Partial<DeliverySettingsRow>,
): Promise<{ ok: true; settings: DeliverySettingsRow } | { ok: false; error: string }> {
  const res = await fetch("/api/backend/dashboard/delivery/settings", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(body as ApiErrorBody, res.status) };
  }
  const settings = parseSettings(body);
  if (!settings) return { ok: false, error: "Respuesta inválida del servidor." };
  return { ok: true, settings };
}

export async function fetchDeliveryZonesViaProxy(): Promise<DeliveryZoneRow[]> {
  const res = await fetch("/api/backend/dashboard/delivery/zones", {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = (await res.json()) as { zones?: unknown[] };
  return (body.zones ?? [])
    .map(parseZone)
    .filter((z): z is DeliveryZoneRow => z != null);
}

export async function createDeliveryZoneViaProxy(payload: {
  name: string;
  deliveryWeekdays?: number[] | null;
}): Promise<{ ok: true; zoneId: number } | { ok: false; error: string }> {
  const res = await fetch("/api/backend/dashboard/delivery/zones", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody & { zoneId?: number };
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(body, res.status) };
  }
  const zoneId = typeof body.zoneId === "number" ? body.zoneId : Number(body.zoneId);
  if (!Number.isFinite(zoneId)) {
    return { ok: false, error: "Respuesta inválida del servidor." };
  }
  return { ok: true, zoneId };
}

export async function patchDeliveryZoneViaProxy(
  zoneId: number,
  payload: Partial<{ name: string; deliveryWeekdays: number[] | null; isActive: boolean }>,
): Promise<{ ok: true; zone: DeliveryZoneRow } | { ok: false; error: string }> {
  const res = await fetch(`/api/backend/dashboard/delivery/zones/${zoneId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as { zone?: unknown } & ApiErrorBody;
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(body, res.status) };
  }
  const zone = parseZone(body.zone);
  if (!zone) return { ok: false, error: "Respuesta inválida del servidor." };
  return { ok: true, zone };
}

export async function deleteDeliveryZoneViaProxy(
  zoneId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/backend/dashboard/delivery/zones/${zoneId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(body, res.status) };
  }
  return { ok: true };
}

export async function fetchAvailableDeliveryDatesViaProxy(
  customerId?: number | null,
): Promise<AvailableDeliveryDatesResponse> {
  const params = new URLSearchParams();
  if (customerId != null && customerId > 0) {
    params.set("customerId", String(customerId));
  }
  const qs = params.toString();
  const res = await fetch(
    `/api/backend/dashboard/delivery/available-dates${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      credentials: "include",
    },
  );
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = (await res.json()) as {
    dates?: unknown[];
    timezone?: string;
  };
  const dates = (body.dates ?? [])
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const date = typeof o.date === "string" ? o.date.trim() : "";
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) return null;
      return {
        date,
        isSameDay: o.isSameDay === true,
        isLate: o.isLate === true,
        requiresConfirmation: o.requiresConfirmation === true,
      } satisfies AvailableDeliveryDateRow;
    })
    .filter((row): row is AvailableDeliveryDateRow => row != null);
  return {
    dates,
    timezone: typeof body.timezone === "string" ? body.timezone : "America/Costa_Rica",
  };
}

export function isAllowedDeliveryDateSelection(
  value: string | null | undefined,
  availableDates: readonly AvailableDeliveryDateRow[],
  preservedDate?: string | null,
): boolean {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/u.test(trimmed)) return false;
  if (availableDates.some((row) => row.date === trimmed)) return true;
  const preserved = preservedDate?.trim();
  return preserved === trimmed;
}

export function pickDefaultDeliveryDate(
  stored: string | null | undefined,
  availableDates: readonly AvailableDeliveryDateRow[],
): string {
  const trimmed = stored?.trim();
  if (trimmed && availableDates.some((row) => row.date === trimmed)) return trimmed;
  return availableDates[0]?.date ?? "";
}

export async function fetchCustomerDeliveryViaProxy(customerId: number): Promise<{
  overrides: CustomerDeliveryOverrides;
  resolvedSchedule: ResolvedDeliverySchedule;
} | null> {
  const res = await fetch(`/api/backend/dashboard/customers/${customerId}/delivery`, {
    method: "GET",
    credentials: "include",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = (await res.json()) as {
    overrides?: CustomerDeliveryOverrides;
    resolvedSchedule?: ResolvedDeliverySchedule;
  };
  if (!body.overrides || !body.resolvedSchedule) return null;
  return {
    overrides: body.overrides,
    resolvedSchedule: body.resolvedSchedule,
  };
}

export async function patchCustomerDeliveryViaProxy(
  customerId: number,
  payload: Partial<CustomerDeliveryOverrides>,
): Promise<
  | {
      ok: true;
      overrides: CustomerDeliveryOverrides;
      resolvedSchedule: ResolvedDeliverySchedule;
    }
  | { ok: false; error: string }
> {
  const res = await fetch(`/api/backend/dashboard/customers/${customerId}/delivery`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as {
    overrides?: CustomerDeliveryOverrides;
    resolvedSchedule?: ResolvedDeliverySchedule;
  } & ApiErrorBody;
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(body, res.status) };
  }
  if (!body.overrides || !body.resolvedSchedule) {
    return { ok: false, error: "Respuesta inválida del servidor." };
  }
  return {
    ok: true,
    overrides: body.overrides,
    resolvedSchedule: body.resolvedSchedule,
  };
}

export function formatWeekdayListEs(weekdays: readonly number[]): string {
  const labels = ISO_WEEKDAY_OPTIONS.filter((d) => weekdays.includes(d.value)).map(
    (d) => d.label.toLowerCase(),
  );
  if (labels.length === 0) return "—";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} y ${labels.at(-1)}`;
}

export const WEEKDAYS_SOURCE_LABEL: Readonly<Record<string, string>> = {
  customer: "Cliente",
  zone: "Zona",
  global: "Global",
};
