/** Types + fetch helpers for /dashboard/matches. */

export type MatchBucket = "needs_review" | "with_multipliers" | "correct";

export type DashboardMatchItem = Readonly<{
  aliasId: string;
  supplierId: number;
  customerId: number | null;
  customerName: string | null;
  aliasText: string;
  product: {
    productId: number;
    name: string;
    sku: string | null;
    unit: string;
  };
  quantityMultiplier: number;
  confidence: number;
  matchScore: number | null;
  usageCount: number;
  lastUsedAt: string | null;
  updatedAt: string;
  lastEditedBy: string | null;
  active: boolean;
  buckets: MatchBucket[];
}>;

export type MatchesSummary = Readonly<{
  buckets: Record<MatchBucket, number>;
  recentlyEditedCount: number;
  totalAliases: number;
}>;

export type MatchAuditItem = Readonly<{
  auditId: string;
  action: string;
  changedBy: string;
  createdAt: string;
}>;

function backendPath(path: string): string {
  return `/api/backend${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseJson(res: Response): Promise<unknown> {
  return res.json().catch(() => ({}));
}

export async function fetchMatchesSummary(): Promise<MatchesSummary | null> {
  const res = await fetch(backendPath("/dashboard/matches/summary"), {
    credentials: "include",
    cache: "no-store",
  });
  const data = await parseJson(res);
  if (!res.ok || !data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const buckets = o.buckets as Record<string, unknown> | undefined;
  if (!buckets) return null;
  return {
    buckets: {
      needs_review: Number(buckets.needs_review ?? 0),
      with_multipliers: Number(buckets.with_multipliers ?? 0),
      correct: Number(buckets.correct ?? 0),
    },
    recentlyEditedCount: Number(o.recentlyEditedCount ?? 0),
    totalAliases: Number(o.totalAliases ?? 0),
  };
}

function parseMatchItem(raw: unknown): DashboardMatchItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const aliasId = typeof o.aliasId === "string" ? o.aliasId : "";
  if (!aliasId) return null;
  const productRaw = o.product;
  if (!productRaw || typeof productRaw !== "object") return null;
  const p = productRaw as Record<string, unknown>;
  const productId = typeof p.productId === "number" ? p.productId : Number(p.productId);
  if (!Number.isFinite(productId)) return null;

  const bucketsRaw = Array.isArray(o.buckets) ? o.buckets : [];
  const buckets = bucketsRaw.filter(
    (b): b is MatchBucket =>
      b === "needs_review" || b === "with_multipliers" || b === "correct",
  );

  return {
    aliasId,
    supplierId: Number(o.supplierId ?? 0),
    customerId:
      o.customerId === null || o.customerId === undefined
        ? null
        : Number(o.customerId),
    customerName:
      typeof o.customerName === "string" ? o.customerName : null,
    aliasText: typeof o.aliasText === "string" ? o.aliasText : "",
    product: {
      productId,
      name: typeof p.name === "string" ? p.name : "",
      sku: typeof p.sku === "string" ? p.sku : null,
      unit: typeof p.unit === "string" ? p.unit : "unidad",
    },
    quantityMultiplier: Number(o.quantityMultiplier ?? 1),
    confidence: Number(o.confidence ?? 0),
    matchScore: o.matchScore == null ? null : Number(o.matchScore),
    usageCount: Number(o.usageCount ?? 0),
    lastUsedAt: typeof o.lastUsedAt === "string" ? o.lastUsedAt : null,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : "",
    lastEditedBy: typeof o.lastEditedBy === "string" ? o.lastEditedBy : null,
    active: o.active !== false,
    buckets,
  };
}

export async function fetchMatchesList(input: {
  bucket: MatchBucket;
  recentlyEdited?: boolean;
  q?: string;
  cursor?: string;
}): Promise<{ items: DashboardMatchItem[]; nextCursor: string | null }> {
  const params = new URLSearchParams({ bucket: input.bucket });
  if (input.recentlyEdited) params.set("recentlyEdited", "true");
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.cursor) params.set("cursor", input.cursor);

  const res = await fetch(backendPath(`/dashboard/matches/list?${params}`), {
    credentials: "include",
    cache: "no-store",
  });
  const data = await parseJson(res);
  if (!res.ok || !data || typeof data !== "object") {
    return { items: [], nextCursor: null };
  }
  const o = data as { items?: unknown[]; nextCursor?: unknown };
  const items: DashboardMatchItem[] = [];
  for (const row of o.items ?? []) {
    const parsed = parseMatchItem(row);
    if (parsed) items.push(parsed);
  }
  const nextCursor =
    typeof o.nextCursor === "string" && o.nextCursor.length > 0
      ? o.nextCursor
      : null;
  return { items, nextCursor };
}

export async function patchDashboardMatch(
  aliasId: string,
  body: Record<string, unknown>,
): Promise<DashboardMatchItem | null> {
  const res = await fetch(backendPath(`/dashboard/matches/${encodeURIComponent(aliasId)}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) return null;
  const match = (data as { match?: unknown }).match;
  return parseMatchItem(match);
}

export async function createDashboardMatch(
  body: Record<string, unknown>,
): Promise<DashboardMatchItem | null> {
  const res = await fetch(backendPath("/dashboard/matches"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) return null;
  const match = (data as { match?: unknown }).match;
  return parseMatchItem(match);
}

export async function deleteDashboardMatch(aliasId: string): Promise<boolean> {
  const res = await fetch(backendPath(`/dashboard/matches/${encodeURIComponent(aliasId)}`), {
    method: "DELETE",
    credentials: "include",
  });
  return res.ok || res.status === 204;
}

export async function fetchMatchAudit(aliasId: string): Promise<MatchAuditItem[]> {
  const res = await fetch(
    backendPath(`/dashboard/matches/${encodeURIComponent(aliasId)}/audit`),
    { credentials: "include", cache: "no-store" },
  );
  const data = await parseJson(res);
  if (!res.ok || !data || typeof data !== "object") return [];
  const items = (data as { items?: unknown[] }).items ?? [];
  return items
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      if (typeof o.auditId !== "string") return null;
      return {
        auditId: o.auditId,
        action: typeof o.action === "string" ? o.action : "",
        changedBy: typeof o.changedBy === "string" ? o.changedBy : "",
        createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
      };
    })
    .filter((r): r is MatchAuditItem => r != null);
}

export function resolveChangedByLabel(changedBy: string): string {
  if (changedBy === "ai") return "Asistente AI";
  if (changedBy === "mining") return "Aprendizaje automático";
  return changedBy.length > 12 ? `${changedBy.slice(0, 8)}…` : changedBy;
}
