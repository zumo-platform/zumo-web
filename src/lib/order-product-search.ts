import type { DashboardProductRow } from "@/lib/dashboard-products";

const MAX_SEARCH_RESULTS = 20;

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

/** Active catalog products only (not deleted, status active). */
export function selectableCatalogProducts(
  rows: readonly DashboardProductRow[],
): DashboardProductRow[] {
  return rows.filter(
    (p) =>
      (p.deletedAt == null || p.deletedAt === "") &&
      p.status === "active",
  );
}

/** Search by product name or SKU (min 2 chars), max 20 results. */
export function searchCatalogProducts(
  products: readonly DashboardProductRow[],
  query: string,
  maxResults = MAX_SEARCH_RESULTS,
): DashboardProductRow[] {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];

  const matches: DashboardProductRow[] = [];
  for (const p of products) {
    const name = p.name.toLowerCase();
    const sku = (p.sku ?? "").toLowerCase();
    if (name.includes(q) || (sku.length > 0 && sku.includes(q))) {
      matches.push(p);
      if (matches.length >= maxResults) break;
    }
  }
  return matches;
}

export function parseProductPrice(price: string | null): number {
  if (price === null || price === "") return 0;
  const n = Number(price);
  return Number.isFinite(n) ? n : 0;
}

export function formatOrderMoney(value: number): string {
  return new Intl.NumberFormat("es", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
