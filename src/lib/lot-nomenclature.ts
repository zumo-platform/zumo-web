export type LotNomenclature = Readonly<{
  enabled: boolean;
  pattern: string;
  seqPadding: number;
  nextSeq: number;
}>;

export type ExpiredStockPolicy = "warn" | "block";

export type BatchSettings = Readonly<{
  trackBatchesDefault: boolean;
  requireLotOnReceipt: boolean;
  trackExpiry: boolean;
  expiryWarningDays: number;
  expiredStockPolicy: ExpiredStockPolicy;
}>;

export type TrackBatchesMode = "inherit" | "on" | "off";

export const LOT_TOKENS = ["{YYYY}", "{YY}", "{MM}", "{DD}", "{VENDOR}", "{SKU}", "{SEQ}"] as const;

export type LotCodeContext = Readonly<{
  date: Date;
  vendorName: string | null;
  sku: string | null;
  seq: number;
  seqPadding: number;
}>;

function slugLotToken(s: string | null): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase()
    .slice(0, 8);
}

/** Pure: render a pattern into a concrete lot code (for live preview). */
export function renderLotCode(pattern: string, ctx: LotCodeContext): string {
  const p = ctx.date;
  const yyyy = String(p.getUTCFullYear());
  return pattern
    .replaceAll("{YYYY}", yyyy)
    .replaceAll("{YY}", yyyy.slice(2))
    .replaceAll("{MM}", String(p.getUTCMonth() + 1).padStart(2, "0"))
    .replaceAll("{DD}", String(p.getUTCDate()).padStart(2, "0"))
    .replaceAll("{VENDOR}", slugLotToken(ctx.vendorName))
    .replaceAll("{SKU}", slugLotToken(ctx.sku))
    .replaceAll("{SEQ}", String(ctx.seq).padStart(Math.max(1, ctx.seqPadding), "0"));
}

type ApiErrorBody = Readonly<{ error?: string; message?: string }>;

function readApiErrorBody(body: ApiErrorBody, status: number): string {
  if (typeof body.error === "string" && body.error.trim()) return body.error;
  if (typeof body.message === "string" && body.message.trim()) return body.message;
  return `Error ${status}`;
}

export async function fetchLotNomenclatureViaProxy(): Promise<LotNomenclature> {
  const res = await fetch("/api/backend/dashboard/settings/lot-nomenclature", {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as {
    settings?: LotNomenclature;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
  }
  const s = data.settings;
  if (!s) {
    return { enabled: true, pattern: "{YYYY}{MM}{DD}-{SEQ}", seqPadding: 4, nextSeq: 1 };
  }
  return s;
}

export async function updateLotNomenclatureViaProxy(
  input: Readonly<{ enabled: boolean; pattern: string; seqPadding: number }>,
): Promise<{ ok: true; settings: LotNomenclature } | { ok: false; error: string }> {
  const res = await fetch("/api/backend/dashboard/settings/lot-nomenclature", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody & {
    settings?: LotNomenclature;
  };
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(body, res.status) };
  }
  if (!body.settings) {
    return { ok: false, error: "Respuesta inválida del servidor." };
  }
  return { ok: true, settings: body.settings };
}

export async function fetchNextLotCodeViaProxy(
  vendorName: string,
  sku: string | null,
  productId: number,
): Promise<string | null> {
  const res = await fetch("/api/backend/dashboard/lot-nomenclature/next", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vendorName, sku, productId }),
  });
  const data = (await res.json().catch(() => ({}))) as { code?: string | null; error?: string };
  if (!res.ok) {
    console.warn("[lot-nomenclature] fetchNextLotCode failed:", data.error ?? res.status);
    return null;
  }
  return typeof data.code === "string" ? data.code : null;
}

function parseBatchSettings(raw: unknown): BatchSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const expiredStockPolicy = o.expiredStockPolicy === "block" ? "block" : "warn";
  const days = typeof o.expiryWarningDays === "number" ? o.expiryWarningDays : Number(o.expiryWarningDays);
  return {
    trackBatchesDefault: o.trackBatchesDefault !== false,
    requireLotOnReceipt: o.requireLotOnReceipt !== false,
    trackExpiry: o.trackExpiry !== false,
    expiryWarningDays: Number.isFinite(days) ? Math.max(1, Math.min(365, Math.trunc(days))) : 7,
    expiredStockPolicy,
  };
}

export async function fetchBatchSettingsViaProxy(): Promise<BatchSettings> {
  const res = await fetch("/api/backend/dashboard/settings/batch", {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as {
    settings?: unknown;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Error ${res.status}`);
  }
  return parseBatchSettings(data.settings);
}

export async function updateBatchSettingsViaProxy(
  input: Partial<BatchSettings>,
): Promise<{ ok: true; settings: BatchSettings } | { ok: false; error: string }> {
  const res = await fetch("/api/backend/dashboard/settings/batch", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody & {
    settings?: unknown;
  };
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(body, res.status) };
  }
  return { ok: true, settings: parseBatchSettings(body.settings) };
}

export async function updateProductTrackBatchesModeViaProxy(
  productId: number,
  mode: TrackBatchesMode,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/backend/dashboard/products/${productId}/track-batches`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  if (!res.ok) {
    return { ok: false, error: readApiErrorBody(body, res.status) };
  }
  return { ok: true };
}
