import "server-only";

import { joinApiGatewayPath } from "@/lib/api";

export type VendorOption = Readonly<{
  vendorId: number;
  name: string;
  leadTimeDays: number | null;
  defaultCurrency: string | null;
}>;

export type WarehouseOption = Readonly<{ warehouseId: number; name: string }>;

function uniqBearerCandidates(idToken?: string | null, accessToken?: string | null): string[] {
  return [
    ...new Set(
      [idToken, accessToken].filter((t): t is string => typeof t === "string" && t.length > 0),
    ),
  ];
}

function parseVendorOption(raw: unknown): VendorOption | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const vendorId = typeof o.vendorId === "number" ? o.vendorId : Number(o.vendorId);
  if (!Number.isFinite(vendorId) || vendorId <= 0) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) return null;
  if (o.isActive === false) return null;
  const lead =
    o.leadTimeDays === null || o.leadTimeDays === undefined
      ? null
      : Number.isFinite(Number(o.leadTimeDays))
        ? Number(o.leadTimeDays)
        : null;
  const defaultCurrency =
    typeof o.defaultCurrency === "string" && o.defaultCurrency.trim()
      ? o.defaultCurrency.trim()
      : null;
  return { vendorId, name, leadTimeDays: lead, defaultCurrency };
}

function parseWarehouseOption(raw: unknown): WarehouseOption | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const warehouseId = typeof o.warehouseId === "number" ? o.warehouseId : Number(o.warehouseId);
  if (!Number.isFinite(warehouseId) || warehouseId <= 0) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) return null;
  if (o.isActive === false) return null;
  return { warehouseId, name };
}

async function fetchEnvelope<T>(
  apiUrl: string,
  path: string,
  idToken: string | undefined,
  accessToken: string | undefined,
  key: string,
  parse: (raw: unknown) => T | null,
): Promise<T[]> {
  const base = apiUrl.replace(/\/+$/, "");
  if (!base) return [];

  const bearerCandidates = uniqBearerCandidates(idToken, accessToken);
  if (bearerCandidates.length === 0) return [];

  const upstreamUrl = joinApiGatewayPath(base, path);

  try {
    for (let i = 0; i < bearerCandidates.length; i++) {
      const res = await fetch(upstreamUrl, {
        headers: { Authorization: `Bearer ${bearerCandidates[i]}` },
        cache: "no-store",
      });

      const text = await res.text();
      if (!res.ok) {
        const retriable = res.status === 401 || res.status === 403;
        if (!retriable || i === bearerCandidates.length - 1) return [];
        continue;
      }

      let data: unknown;
      try {
        data = text.trim() === "" ? {} : (JSON.parse(text) as unknown);
      } catch {
        return [];
      }

      const envelope = data as Record<string, unknown>;
      const rowsRaw = envelope[key];
      if (!Array.isArray(rowsRaw)) return [];

      const rows: T[] = [];
      for (const item of rowsRaw) {
        const row = parse(item);
        if (row) rows.push(row);
      }
      return rows;
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchVendorsServer(
  apiUrl: string,
  idToken: string | undefined,
  accessToken: string | undefined,
): Promise<VendorOption[]> {
  const rows = await fetchEnvelope(
    apiUrl,
    "dashboard/vendors",
    idToken,
    accessToken,
    "vendors",
    parseVendorOption,
  );
  return rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function fetchWarehousesServer(
  apiUrl: string,
  idToken: string | undefined,
  accessToken: string | undefined,
): Promise<WarehouseOption[]> {
  const rows = await fetchEnvelope(
    apiUrl,
    "dashboard/warehouses",
    idToken,
    accessToken,
    "warehouses",
    parseWarehouseOption,
  );
  return rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
}
