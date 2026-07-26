"use client";

import { parseWazeCoordinates } from "@/lib/waze-url";

export type MarketProspectState =
  | "new"
  | "interested"
  | "assigned"
  | "converted"
  | "hidden";

export type MarketCategory =
  | "restaurant"
  | "cafe"
  | "hotel"
  | "bakery"
  | "bar"
  | "other";

/** A business as returned by the backend (coords are strings over the Data API). */
type MarketBusinessRaw = Readonly<{
  id: string;
  name: string;
  category: string;
  lat: string | null;
  lng: string | null;
  address: string | null;
  provincia: string | null;
  canton: string | null;
  distrito: string | null;
  phone: string | null;
  website: string | null;
  prospectState: MarketProspectState | null;
  assignedSellerId: number | null;
  convertedLeadId: number | null;
  convertedCustomerId: number | null;
}>;

/** Parsed, UI-friendly business (coords are numbers, or null if missing). */
export type MarketBusiness = Omit<MarketBusinessRaw, "lat" | "lng"> & {
  lat: number | null;
  lng: number | null;
};

export type Bbox = Readonly<{
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}>;

function parseBusiness(r: MarketBusinessRaw | null | undefined): MarketBusiness | null {
  if (!r) return null;
  return {
    ...r,
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) {
    const reason = (await res.json().catch(() => ({}))) as { reason?: string };
    throw new Error(
      `market request failed (${res.status})${reason.reason ? `: ${reason.reason}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

export async function fetchBusinessesInBbox(
  bbox: Bbox,
  filters?: Readonly<{ category?: MarketCategory | null; canton?: string | null }>,
): Promise<MarketBusiness[]> {
  const p = new URLSearchParams({
    minLat: String(bbox.minLat),
    maxLat: String(bbox.maxLat),
    minLng: String(bbox.minLng),
    maxLng: String(bbox.maxLng),
  });
  if (filters?.category) p.set("category", filters.category);
  if (filters?.canton) p.set("canton", filters.canton);
  const { data } = await getJson<{ data: MarketBusinessRaw[] | null }>(
    `/api/backend/dashboard/market/businesses?${p.toString()}`,
  );
  return (data ?? [])
    .map(parseBusiness)
    .filter((b): b is MarketBusiness => b != null);
}

export async function fetchBusinessesInRadius(
  center: Readonly<{ lat: number; lng: number; radiusKm: number }>,
  filters?: Readonly<{ category?: MarketCategory | null; canton?: string | null }>,
): Promise<MarketBusiness[]> {
  const p = new URLSearchParams({
    lat: String(center.lat),
    lng: String(center.lng),
    radiusKm: String(center.radiusKm),
  });
  if (filters?.category) p.set("category", filters.category);
  if (filters?.canton) p.set("canton", filters.canton);
  const { data } = await getJson<{ data: MarketBusinessRaw[] | null }>(
    `/api/backend/dashboard/market/businesses?${p.toString()}`,
  );
  return (data ?? [])
    .map(parseBusiness)
    .filter((b): b is MarketBusiness => b != null);
}

export async function setProspect(input: {
  marketBusinessId: string;
  state: MarketProspectState;
  assignedSellerId?: number | null;
  notes?: string;
}): Promise<void> {
  const res = await fetch("/api/backend/dashboard/market/prospects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`setProspect failed (${res.status})`);
}

export async function convertProspect(input: {
  marketBusinessId: string;
  assignedSellerId?: number | null;
}): Promise<{ leadId: number }> {
  const res = await fetch("/api/backend/dashboard/market/prospects/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`convert failed (${res.status})`);
  const { data } = (await res.json()) as { data: { leadId: number } };
  return data;
}

/** Supplier's own customers that carry coordinates — the private green overlay. */
export type MarketCustomerPin = Readonly<{
  id: number;
  name: string;
  lat: number;
  lng: number;
}>;

function parseCustomerPinRows(
  rows: Array<Record<string, unknown>>,
): MarketCustomerPin[] {
  return rows
    .map((c) => {
      const id = Number(c.customerId ?? c.id);
      const name = String(c.name ?? "");
      let lat = c.lat != null ? Number(c.lat) : Number.NaN;
      let lng = c.lng != null ? Number(c.lng) : Number.NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        const waze = typeof c.wazeAddress === "string" ? c.wazeAddress : null;
        const parsed = parseWazeCoordinates(waze);
        if (parsed) {
          lat = parsed.lat;
          lng = parsed.lng;
        }
      }
      return { id, name, lat, lng };
    })
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng) && c.id > 0);
}

export async function fetchMyCustomerPins(): Promise<MarketCustomerPin[]> {
  const res = await fetch("/api/backend/dashboard/market/customers", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!res.ok) return [];
  const body = (await res.json().catch(() => ({}))) as {
    data?: Array<Record<string, unknown>>;
  };
  return parseCustomerPinRows(body.data ?? []);
}

/** Pin color bucket for a market business in the supplier pipeline. */
export type PinBucket = "prospect" | "engaged" | "lead" | "customer";
export function pinBucket(b: MarketBusiness): PinBucket {
  if (b.convertedCustomerId != null) return "customer";
  if (b.convertedLeadId != null || b.prospectState === "converted") return "lead";
  if (b.prospectState === "interested" || b.prospectState === "assigned") return "engaged";
  // Default: published market business with no supplier workflow yet (`prospect` id is legacy).
  return "prospect";
}
