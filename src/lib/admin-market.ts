"use client";

import type { MarketCategory } from "./dashboard-market";

export type MarketBusinessStatus = "draft" | "published" | "archived";
export type MarketBusinessSource = "osm" | "zumo_admin" | "google" | "csv";

/** A business row from the admin API. Coords/confidence are STRINGS over the Data API. */
export type AdminBusiness = Readonly<{
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
  status: MarketBusinessStatus;
  source: MarketBusinessSource;
  sourceRef: string | null;
  confidence: string | null;
  enrichedAt: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}>;

export type AdminListParams = Readonly<{
  status?: MarketBusinessStatus | "";
  canton?: string;
  category?: MarketCategory | "";
  source?: MarketBusinessSource | "";
  search?: string;
  limit?: number;
  offset?: number;
}>;

export type UpsertBusinessBody = Partial<{
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  provincia: string | null;
  canton: string | null;
  distrito: string | null;
  phone: string | null;
  website: string | null;
  status: MarketBusinessStatus;
}>;

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function listAdminBusinesses(
  params: AdminListParams,
): Promise<{ data: AdminBusiness[]; total: number }> {
  const p = new URLSearchParams();
  if (params.status) p.set("status", params.status);
  if (params.canton) p.set("canton", params.canton);
  if (params.category) p.set("category", params.category);
  if (params.source) p.set("source", params.source);
  if (params.search) p.set("search", params.search);
  p.set("limit", String(params.limit ?? 50));
  p.set("offset", String(params.offset ?? 0));
  return req(`/api/backend/admin/market/businesses?${p.toString()}`);
}

export async function getAdminBusiness(id: string): Promise<{ data: AdminBusiness }> {
  return req(`/api/backend/admin/market/businesses/${encodeURIComponent(id)}`);
}

export async function createAdminBusiness(
  body: UpsertBusinessBody,
): Promise<{ data: { id: string } }> {
  return req(`/api/backend/admin/market/businesses`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateAdminBusiness(
  id: string,
  body: UpsertBusinessBody,
): Promise<void> {
  await req(`/api/backend/admin/market/businesses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function publishAdminBusiness(id: string): Promise<void> {
  await req(`/api/backend/admin/market/businesses/${encodeURIComponent(id)}/publish`, {
    method: "POST",
  });
}

export async function archiveAdminBusiness(id: string): Promise<void> {
  await updateAdminBusiness(id, { status: "archived" });
}

export async function mergeAdminBusinesses(
  survivorId: string,
  duplicateId: string,
): Promise<void> {
  await req(`/api/backend/admin/market/businesses/merge`, {
    method: "POST",
    body: JSON.stringify({ survivorId, duplicateId }),
  });
}
