export type EffectiveStatusItem = {
  kind: "system" | "custom";
  key: string;
  label: string;
  color: string | null;
  isMandatory: boolean;
  isFloating: boolean;
  position: number;
  statusId?: string;
  retired?: boolean;
};

export type SupplierCustomStatus = {
  statusId: string;
  key: string;
  label: string;
  color: string | null;
  description: string | null;
  deletedAt: string | null;
};

export const SYSTEM_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending: "En Revisión",
  confirmed: "Confirmado",
  in_progress: "En preparación",
  in_route: "En ruta",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const DEFAULT_STATUS_FILTER_KEYS = ["draft", "pending", "confirmed"];

export const DEFAULT_SYSTEM_STATUS_CATALOG: ReadonlyArray<{
  key: string;
  label: string;
  isMandatory: boolean;
  isFloating: boolean;
}> = [
  { key: "draft", label: "Borrador", isMandatory: true, isFloating: false },
  { key: "pending", label: "En Revisión", isMandatory: true, isFloating: false },
  { key: "confirmed", label: "Confirmado", isMandatory: true, isFloating: false },
  { key: "in_progress", label: "En preparación", isMandatory: false, isFloating: false },
  { key: "in_route", label: "En ruta", isMandatory: false, isFloating: false },
  { key: "delivered", label: "Entregado", isMandatory: false, isFloating: false },
  { key: "cancelled", label: "Cancelado", isMandatory: false, isFloating: true },
];

export function buildDefaultFlowItems(): EffectiveStatusItem[] {
  const linear = DEFAULT_SYSTEM_STATUS_CATALOG.filter((s) => !s.isFloating);
  const items: EffectiveStatusItem[] = linear.map((status, index) => ({
    kind: "system",
    key: status.key,
    label: status.label,
    color: null,
    isMandatory: status.isMandatory,
    isFloating: false,
    position: index,
  }));
  const cancelled = DEFAULT_SYSTEM_STATUS_CATALOG.find((s) => s.key === "cancelled");
  if (cancelled) {
    items.push({
      kind: "system",
      key: cancelled.key,
      label: cancelled.label,
      color: null,
      isMandatory: false,
      isFloating: true,
      position: items.length,
    });
  }
  return items;
}

function parseSystemStatusLabels(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "string") continue;
    const label = value.trim();
    if (!label) continue;
    out[key] = label;
  }
  return out;
}

export function statusLabel(item: EffectiveStatusItem | undefined, fallbackKey?: string): string {
  if (item) return item.label;
  if (fallbackKey && SYSTEM_STATUS_LABELS[fallbackKey]) return SYSTEM_STATUS_LABELS[fallbackKey]!;
  return fallbackKey ? fallbackKey.replaceAll("_", " ") : "—";
}

export function statusBadgeVariant(
  key: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (key) {
    case "delivered":
      return "secondary";
    case "cancelled":
      return "destructive";
    case "pending":
    case "draft":
    case "confirmed":
      return "outline";
    default:
      return "default";
  }
}

function parseFlowItem(raw: unknown): EffectiveStatusItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const key = typeof o.key === "string" ? o.key.trim() : "";
  if (!key) return null;
  const kind = o.kind === "custom" ? "custom" : "system";
  return {
    kind,
    key,
    label: typeof o.label === "string" ? o.label : statusLabel(undefined, key),
    color: typeof o.color === "string" ? o.color : null,
    isMandatory: o.isMandatory === true,
    isFloating: o.isFloating === true,
    position: typeof o.position === "number" ? o.position : 0,
    statusId: typeof o.statusId === "string" ? o.statusId : undefined,
    retired: o.retired === true,
  };
}

function parseCustomStatus(raw: unknown): SupplierCustomStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const statusId = typeof o.statusId === "string" ? o.statusId : "";
  const key = typeof o.key === "string" ? o.key : "";
  const label = typeof o.label === "string" ? o.label : "";
  if (!statusId || !key || !label) return null;
  return {
    statusId,
    key,
    label,
    color: typeof o.color === "string" ? o.color : null,
    description: typeof o.description === "string" ? o.description : null,
    deletedAt: typeof o.deletedAt === "string" ? o.deletedAt : null,
  };
}

export function parseSupplierFlowPayload(data: unknown): EffectiveStatusItem[] {
  if (!data || typeof data !== "object") return [];
  const flowRaw = (data as Record<string, unknown>).flow;
  if (!Array.isArray(flowRaw)) return [];
  const items: EffectiveStatusItem[] = [];
  for (const item of flowRaw) {
    const parsed = parseFlowItem(item);
    if (parsed) items.push(parsed);
  }
  return items.sort((a, b) => a.position - b.position);
}

export function parseCustomStatusesPayload(data: unknown): SupplierCustomStatus[] {
  if (!data || typeof data !== "object") return [];
  const raw = (data as Record<string, unknown>).customStatuses;
  if (!Array.isArray(raw)) return [];
  const items: SupplierCustomStatus[] = [];
  for (const item of raw) {
    const parsed = parseCustomStatus(item);
    if (parsed) items.push(parsed);
  }
  return items;
}

export async function fetchSupplierFlow(): Promise<{
  flow: EffectiveStatusItem[];
  customStatuses: SupplierCustomStatus[];
  systemStatusLabels: Record<string, string>;
  fromApi: boolean;
}> {
  const res = await fetch("/api/backend/dashboard/order-status-flow", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      flow: buildDefaultFlowItems(),
      customStatuses: [],
      systemStatusLabels: {},
      fromApi: false,
    };
  }
  const flow = parseSupplierFlowPayload(body);
  return {
    flow: flow.length > 0 ? flow : buildDefaultFlowItems(),
    customStatuses: parseCustomStatusesPayload(body),
    systemStatusLabels: parseSystemStatusLabels(body.systemStatusLabels),
    fromApi: true,
  };
}

export async function saveSupplierFlow(
  flow: ReadonlyArray<{ kind: "system" | "custom"; key?: string; statusId?: string }>,
  systemStatusLabels: Record<string, string>,
): Promise<{
  flow: EffectiveStatusItem[];
  customStatuses: SupplierCustomStatus[];
  systemStatusLabels: Record<string, string>;
}> {
  const res = await fetch("/api/backend/dashboard/order-status-flow", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flow, systemStatusLabels }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof body.error === "string"
        ? body.error
        : "No se pudo guardar el flujo de pedidos.";
    throw new Error(msg);
  }
  return {
    flow: parseSupplierFlowPayload(body),
    customStatuses: parseCustomStatusesPayload(body),
    systemStatusLabels: parseSystemStatusLabels(body.systemStatusLabels),
  };
}

export async function createCustomStatusViaProxy(input: {
  key: string;
  label: string;
  color?: string | null;
  description?: string | null;
}): Promise<SupplierCustomStatus> {
  const res = await fetch("/api/backend/dashboard/order-statuses", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const validation = body.validation as Record<string, string[]> | undefined;
    const first =
      validation &&
      Object.values(validation)
        .flat()
        .find((m) => typeof m === "string");
    const apiMessage =
      typeof body.error === "string"
        ? body.error
        : typeof body.message === "string"
          ? body.message
          : null;
    if (res.status === 404) {
      throw new Error(
        "El servidor aún no tiene los endpoints de flujo de pedidos. Pedí un deploy del backend (migraciones incluidas).",
      );
    }
    throw new Error(
      (typeof first === "string" ? first : null) ??
        apiMessage ??
        "No se pudo crear el estado.",
    );
  }
  const parsed = parseCustomStatus(body.status);
  if (!parsed) throw new Error("Respuesta inválida del servidor.");
  return parsed;
}

export async function updateCustomStatusViaProxy(
  statusId: string,
  patch: Partial<{ label: string; color: string | null; description: string | null }>,
): Promise<SupplierCustomStatus> {
  const res = await fetch(
    `/api/backend/dashboard/order-statuses/${encodeURIComponent(statusId)}`,
    {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      cache: "no-store",
    },
  );
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : "No se pudo actualizar el estado.",
    );
  }
  const parsed = parseCustomStatus(body.status);
  if (!parsed) throw new Error("Respuesta inválida del servidor.");
  return parsed;
}

export async function deleteCustomStatusViaProxy(statusId: string): Promise<void> {
  const res = await fetch(
    `/api/backend/dashboard/order-statuses/${encodeURIComponent(statusId)}`,
    {
      method: "DELETE",
      credentials: "same-origin",
      cache: "no-store",
    },
  );
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : "No se pudo eliminar el estado.",
    );
  }
}

export function flowToFilterOptions(flow: EffectiveStatusItem[]): ReadonlyArray<{
  value: string;
  label: string;
}> {
  const linear = flow.filter((item) => !item.isFloating && !item.retired);
  const cancelled = flow.find((item) => item.key === "cancelled");
  const options = linear.map((item) => ({ value: item.key, label: item.label }));
  if (cancelled) {
    options.push({ value: cancelled.key, label: cancelled.label });
  }
  return options;
}

/** Board columns in flow order; cancelled last. */
export function flowToBoardColumns(flow: EffectiveStatusItem[]): EffectiveStatusItem[] {
  if (flow.length === 0) return buildDefaultFlowItems();
  const linear = flow
    .filter((item) => !item.isFloating && !item.retired)
    .sort((a, b) => a.position - b.position);
  const cancelled = flow.find((item) => item.key === "cancelled" && !item.retired);
  return cancelled ? [...linear, cancelled] : linear;
}

export function findFlowItem(
  flow: EffectiveStatusItem[],
  key: string,
): EffectiveStatusItem | undefined {
  return flow.find((item) => item.key === key);
}

export function slugifyStatusKey(label: string): string {
  let key = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "s_$1")
    .slice(0, 31);

  if (!key || key.length < 2) {
    key = `estado_${Date.now().toString(36).slice(-6)}`;
  }

  const systemKeys = new Set(DEFAULT_SYSTEM_STATUS_CATALOG.map((s) => s.key));
  if (systemKeys.has(key)) {
    key = `${key}_custom`.slice(0, 31);
  }

  return key;
}

export function validateCustomStatusKeyClient(key: string): string | null {
  const trimmed = key.trim();
  if (!/^[a-z][a-z0-9_]{1,30}$/.test(trimmed)) {
    return "La clave debe usar snake_case (2–31 caracteres, empezando con letra).";
  }
  if (DEFAULT_SYSTEM_STATUS_CATALOG.some((s) => s.key === trimmed)) {
    return "La clave no puede coincidir con un estado del sistema.";
  }
  return null;
}
