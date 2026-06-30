/** Types + fetch helpers for /dashboard/discount-lists. */

export type DiscountListMode = "general" | "manual";

export type DiscountListSummary = Readonly<{
  discountListId: string;
  name: string;
  description: string | null;
  mode: DiscountListMode;
  generalDiscountPct: string | null;
  wholeCatalog: boolean;
  appliesToAll: boolean;
  isDefault: boolean;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdBySellerId: number | null;
  createdAt: string;
  updatedAt: string;
  productCount: number;
  customerCount: number | null;
}>;

export type DiscountListDetail = DiscountListSummary &
  Readonly<{
    categoryIds: number[];
    items: ReadonlyArray<{ productId: number; discountPct: string | null }>;
    customerIds: number[];
  }>;

export type DiscountListCustomerFilterRow = Readonly<{
  customerId: number;
  name: string;
  email: string | null;
  assignedSellerId: number | null;
  deliveryZoneId: number | null;
}>;

export type CreateDiscountListPayload = Readonly<{
  name: string;
  description?: string | null;
  mode: DiscountListMode;
  generalDiscountPct?: number | null;
  wholeCatalog?: boolean;
  appliesToAll?: boolean;
  isDefault?: boolean;
  active?: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  categoryIds?: number[];
  items?: ReadonlyArray<{ productId: number; discountPct?: number | null }>;
  customerIds?: number[];
}>;

function backendPath(path: string): string {
  return `/api/backend${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseJson(res: Response): Promise<unknown> {
  return res.json().catch(() => ({}));
}

function parseSummary(raw: unknown): DiscountListSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const discountListId = typeof o.discountListId === "string" ? o.discountListId : "";
  if (!discountListId) return null;
  return {
    discountListId,
    name: typeof o.name === "string" ? o.name : "",
    description: typeof o.description === "string" ? o.description : null,
    mode: o.mode === "manual" ? "manual" : "general",
    generalDiscountPct:
      typeof o.generalDiscountPct === "string" ? o.generalDiscountPct : null,
    wholeCatalog: Boolean(o.wholeCatalog),
    appliesToAll: Boolean(o.appliesToAll),
    isDefault: Boolean(o.isDefault),
    active: o.active !== false,
    startsAt: typeof o.startsAt === "string" ? o.startsAt : null,
    expiresAt: typeof o.expiresAt === "string" ? o.expiresAt : null,
    createdBySellerId:
      typeof o.createdBySellerId === "number" ? o.createdBySellerId : null,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : "",
    productCount: Number(o.productCount ?? 0),
    customerCount:
      o.customerCount === null || o.customerCount === undefined
        ? null
        : Number(o.customerCount),
  };
}

function parseDetail(raw: unknown): DiscountListDetail | null {
  const summary = parseSummary(raw);
  if (!summary || !raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const categoryIds = Array.isArray(o.categoryIds)
    ? o.categoryIds
        .map((id) => (typeof id === "number" ? id : Number(id)))
        .filter((id) => Number.isFinite(id) && id > 0)
    : [];
  const customerIds = Array.isArray(o.customerIds)
    ? o.customerIds
        .map((id) => (typeof id === "number" ? id : Number(id)))
        .filter((id) => Number.isFinite(id) && id > 0)
    : [];
  const items = Array.isArray(o.items)
    ? o.items
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const productId =
            typeof row.productId === "number" ? row.productId : Number(row.productId);
          if (!Number.isFinite(productId)) return null;
          return {
            productId,
            discountPct:
              typeof row.discountPct === "string" ? row.discountPct : null,
          };
        })
        .filter((item): item is { productId: number; discountPct: string | null } => item != null)
    : [];
  return { ...summary, categoryIds, customerIds, items };
}

function parseCustomerFilterRow(raw: unknown): DiscountListCustomerFilterRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const customerId = typeof o.customerId === "number" ? o.customerId : Number(o.customerId);
  if (!Number.isFinite(customerId)) return null;
  return {
    customerId,
    name: typeof o.name === "string" ? o.name : "",
    email: typeof o.email === "string" ? o.email : null,
    assignedSellerId:
      typeof o.assignedSellerId === "number" ? o.assignedSellerId : null,
    deliveryZoneId: typeof o.deliveryZoneId === "number" ? o.deliveryZoneId : null,
  };
}

export async function fetchDiscountListsViaProxy(): Promise<DiscountListSummary[]> {
  const res = await fetch(backendPath("/dashboard/discount-lists"), {
    credentials: "include",
    cache: "no-store",
  });
  const data = await parseJson(res);
  if (!res.ok) return [];
  const lists = (data as { lists?: unknown[] }).lists;
  if (!Array.isArray(lists)) return [];
  return lists
    .map(parseSummary)
    .filter((row): row is DiscountListSummary => row != null);
}

export async function fetchDiscountListViaProxy(
  discountListId: string,
): Promise<DiscountListDetail | null> {
  const res = await fetch(
    backendPath(`/dashboard/discount-lists/${encodeURIComponent(discountListId)}`),
    { credentials: "include", cache: "no-store" },
  );
  const data = await parseJson(res);
  if (!res.ok) return null;
  return parseDetail((data as { list?: unknown }).list);
}

export async function createDiscountListViaProxy(
  payload: CreateDiscountListPayload,
): Promise<{ ok: true; list: DiscountListDetail } | { ok: false; message: string }> {
  const res = await fetch(backendPath("/dashboard/discount-lists"), {
    credentials: "include",
    cache: "no-store",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    const issues = Array.isArray(data.issues) ? data.issues.join("; ") : "";
    const message =
      (typeof data.error === "string" ? data.error : null) ??
      issues ??
      "No pudimos crear la lista.";
    return { ok: false, message };
  }
  const list = parseDetail(data.list);
  if (!list) return { ok: false, message: "Respuesta inválida del servidor." };
  return { ok: true, list };
}

export async function updateDiscountListViaProxy(
  discountListId: string,
  payload: Partial<CreateDiscountListPayload>,
): Promise<{ ok: true; list: DiscountListDetail } | { ok: false; message: string }> {
  const res = await fetch(
    backendPath(`/dashboard/discount-lists/${encodeURIComponent(discountListId)}`),
    {
      credentials: "include",
      cache: "no-store",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    const issues = Array.isArray(data.issues) ? data.issues.join("; ") : "";
    const message =
      (typeof data.error === "string" ? data.error : null) ??
      issues ??
      "No pudimos actualizar la lista.";
    return { ok: false, message };
  }
  const list = parseDetail(data.list);
  if (!list) return { ok: false, message: "Respuesta inválida del servidor." };
  return { ok: true, list };
}

export async function deleteDiscountListViaProxy(
  discountListId: string,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(
    backendPath(`/dashboard/discount-lists/${encodeURIComponent(discountListId)}`),
    { credentials: "include", cache: "no-store", method: "DELETE" },
  );
  if (res.ok) return { ok: true };
  const data = (await parseJson(res)) as Record<string, unknown>;
  return {
    ok: false,
    message: typeof data.error === "string" ? data.error : "No pudimos eliminar la lista.",
  };
}

export async function duplicateDiscountListViaProxy(
  discountListId: string,
): Promise<{ ok: true; list: DiscountListDetail } | { ok: false; message: string }> {
  const res = await fetch(
    backendPath(
      `/dashboard/discount-lists/${encodeURIComponent(discountListId)}/duplicate`,
    ),
    { credentials: "include", cache: "no-store", method: "POST" },
  );
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      message: typeof data.error === "string" ? data.error : "No pudimos duplicar la lista.",
    };
  }
  const list = parseDetail(data.list);
  if (!list) return { ok: false, message: "Respuesta inválida del servidor." };
  return { ok: true, list };
}

export async function fetchCustomersByLabelViaProxy(
  label: string,
): Promise<DiscountListCustomerFilterRow[]> {
  const params = new URLSearchParams({ label });
  const res = await fetch(
    backendPath(`/dashboard/discount-lists/customers-by-label?${params}`),
    { credentials: "include", cache: "no-store" },
  );
  const data = await parseJson(res);
  if (!res.ok) return [];
  const customers = (data as { customers?: unknown[] }).customers;
  if (!Array.isArray(customers)) return [];
  return customers
    .map(parseCustomerFilterRow)
    .filter((row): row is DiscountListCustomerFilterRow => row != null);
}

export async function fetchCustomersBySellerViaProxy(
  sellerId: number,
): Promise<DiscountListCustomerFilterRow[]> {
  const params = new URLSearchParams({ sellerId: String(sellerId) });
  const res = await fetch(
    backendPath(`/dashboard/discount-lists/customers-by-seller?${params}`),
    { credentials: "include", cache: "no-store" },
  );
  const data = await parseJson(res);
  if (!res.ok) return [];
  const customers = (data as { customers?: unknown[] }).customers;
  if (!Array.isArray(customers)) return [];
  return customers
    .map(parseCustomerFilterRow)
    .filter((row): row is DiscountListCustomerFilterRow => row != null);
}

export async function fetchCustomersByZoneViaProxy(
  zoneId: number,
): Promise<DiscountListCustomerFilterRow[]> {
  const params = new URLSearchParams({ zoneId: String(zoneId) });
  const res = await fetch(
    backendPath(`/dashboard/discount-lists/customers-by-zone?${params}`),
    { credentials: "include", cache: "no-store" },
  );
  const data = await parseJson(res);
  if (!res.ok) return [];
  const customers = (data as { customers?: unknown[] }).customers;
  if (!Array.isArray(customers)) return [];
  return customers
    .map(parseCustomerFilterRow)
    .filter((row): row is DiscountListCustomerFilterRow => row != null);
}
