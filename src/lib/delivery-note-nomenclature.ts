export type DeliveryNoteNomenclature = Readonly<{
  enabled: boolean;
  pattern: string;
  seqPadding: number;
  nextSeq: number;
}>;

export const DELIVERY_NOTE_NOMENCLATURE_TOKENS = [
  "{YYYY}",
  "{YY}",
  "{MM}",
  "{DD}",
  "{SEQ}",
] as const;

export function previewDeliveryNoteCode(
  settings: Pick<DeliveryNoteNomenclature, "pattern" | "seqPadding" | "nextSeq">,
  date = new Date(),
): string {
  const p = date;
  const yyyy = String(p.getUTCFullYear());
  return settings.pattern
    .replaceAll("{YYYY}", yyyy)
    .replaceAll("{YY}", yyyy.slice(2))
    .replaceAll("{MM}", String(p.getUTCMonth() + 1).padStart(2, "0"))
    .replaceAll("{DD}", String(p.getUTCDate()).padStart(2, "0"))
    .replaceAll("{SEQ}", String(settings.nextSeq).padStart(Math.max(1, settings.seqPadding), "0"));
}

export async function fetchDeliveryNoteNomenclatureViaProxy(): Promise<DeliveryNoteNomenclature | null> {
  const res = await fetch("/api/backend/dashboard/settings/delivery-note-nomenclature", {
    cache: "no-store",
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return null;
  const s = data.settings;
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  return {
    enabled: o.enabled === true,
    pattern: typeof o.pattern === "string" ? o.pattern : "NE-{SEQ}",
    seqPadding:
      typeof o.seqPadding === "number" && Number.isFinite(o.seqPadding)
        ? Math.trunc(o.seqPadding)
        : 4,
    nextSeq:
      typeof o.nextSeq === "number" && Number.isFinite(o.nextSeq)
        ? Math.trunc(o.nextSeq)
        : 1,
  };
}

export async function updateDeliveryNoteNomenclatureViaProxy(
  input: Readonly<{ enabled: boolean; pattern: string; seqPadding: number }>,
): Promise<{ ok: true; settings: DeliveryNoteNomenclature } | { ok: false; error: string }> {
  const res = await fetch("/api/backend/dashboard/settings/delivery-note-nomenclature", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : "No se pudo guardar la nomenclatura.";
    return { ok: false, error: msg };
  }
  const settings = await fetchDeliveryNoteNomenclatureViaProxy();
  if (!settings) return { ok: false, error: "Respuesta inválida del servidor." };
  return { ok: true, settings };
}
