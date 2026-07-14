import { joinApiGatewayPath } from "@/lib/api";

export type OpportunityStatus =
  | "ordenando"
  | "no_calificado"
  | "calificado"
  | "cotizacion_enviada"
  | "esperando_por_pedido";

export const OPPORTUNITY_STATUS_LABEL: Record<OpportunityStatus, string> = {
  ordenando: "Ganado",
  no_calificado: "No calificado",
  calificado: "Calificado",
  cotizacion_enviada: "Cotización enviada",
  esperando_por_pedido: "Esperando por pedido",
};

/** System pipeline columns (kanban). Keys are stable; labels are defaults. */
export const DEFAULT_PIPELINE_STAGES: ReadonlyArray<{
  key: string;
  label: string;
  isTerminal: boolean;
}> = [
  { key: "backlog", label: "New", isTerminal: false },
  { key: "calificado", label: "En contacto", isTerminal: false },
  { key: "en_proceso", label: "En negociacion", isTerminal: false },
  { key: "pushing_for_close", label: "Approval check", isTerminal: false },
  { key: "won", label: "Ganado (won)", isTerminal: true },
];

export type PipelineStage = Readonly<{
  kind: "system" | "custom";
  key: string;
  label: string;
  color: string | null;
  isTerminal: boolean;
  position: number;
  stageId?: string;
}>;

export type OpportunityItem = Readonly<{
  opportunityItemId: string;
  lineNo: number;
  productId: number | null;
  productName: string | null;
  rawText: string;
  quantity: string;
  unit: string;
}>;

export type Opportunity = Readonly<{
  opportunityId: string;
  partyType: "customer" | "lead" | "none";
  customerId: number | null;
  leadId: number | null;
  name: string;
  stageKey: string;
  status: OpportunityStatus;
  boardOrder: string;
  businessTypeKey: string | null;
  location: string | null;
  ordersPerMonth: number;
  monthlyRecurringValue: string;
  currency: string;
  notes: string;
  assignedSellerId: number | null;
  assignedSellerName: string | null;
  items: OpportunityItem[];
  createdAt: string;
}>;

export type OpportunityWithItems = Opportunity & { items: OpportunityItem[] };

export type BusinessType = Readonly<{
  businessTypeId: string;
  key: string;
  label: string;
}>;

function optStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function apiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;
  const detail = typeof o.message === "string" && o.message.trim().length > 0 ? o.message.trim() : null;
  const error = typeof o.error === "string" && o.error.trim().length > 0 ? o.error.trim() : null;
  if (detail && error && detail !== error) return `${error}: ${detail}`;
  return detail ?? error ?? fallback;
}

function numStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "0";
}

function parseStage(raw: unknown): PipelineStage | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.key !== "string") return null;
  return {
    kind: o.kind === "custom" ? "custom" : "system",
    key: o.key,
    label: typeof o.label === "string" ? o.label : o.key,
    color: optStr(o.color),
    isTerminal: o.isTerminal === true,
    position: typeof o.position === "number" ? o.position : 0,
    stageId: typeof o.stageId === "string" ? o.stageId : undefined,
  };
}

function parseOpportunity(raw: unknown): Opportunity | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.opportunityId !== "string") return null;
  const assignedSellerIdRaw = o.assignedSellerId;
  const assignedSellerId =
    assignedSellerIdRaw == null || assignedSellerIdRaw === ""
      ? null
      : Number(assignedSellerIdRaw);
  return {
    opportunityId: o.opportunityId,
    partyType: o.partyType === "customer" ? "customer" : o.partyType === "lead" ? "lead" : "none",
    customerId: o.customerId == null ? null : Number(o.customerId),
    leadId: o.leadId == null ? null : Number(o.leadId),
    name: typeof o.name === "string" ? o.name : "",
    stageKey: typeof o.stageKey === "string" ? o.stageKey : "backlog",
    status: (typeof o.status === "string" ? o.status : "no_calificado") as OpportunityStatus,
    boardOrder: numStr(o.boardOrder),
    businessTypeKey: optStr(o.businessTypeKey),
    location: optStr(o.location),
    ordersPerMonth:
      typeof o.ordersPerMonth === "number"
        ? Math.max(1, Math.trunc(o.ordersPerMonth))
        : Math.max(1, Math.trunc(Number(o.ordersPerMonth)) || 1),
    monthlyRecurringValue: numStr(o.monthlyRecurringValue),
    currency: typeof o.currency === "string" ? o.currency : "CRC",
    notes: typeof o.notes === "string" ? o.notes : "",
    assignedSellerId:
      assignedSellerId != null && Number.isFinite(assignedSellerId) && assignedSellerId > 0
        ? assignedSellerId
        : null,
    assignedSellerName: optStr(o.assignedSellerName),
    items: Array.isArray(o.items)
      ? o.items.map(parseItem).filter((i): i is OpportunityItem => i != null)
      : [],
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
  };
}

function parseItem(raw: unknown): OpportunityItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.opportunityItemId !== "string") return null;
  return {
    opportunityItemId: o.opportunityItemId,
    lineNo: typeof o.lineNo === "number" ? o.lineNo : Number(o.lineNo) || 1,
    productId: o.productId == null ? null : Number(o.productId),
    productName: optStr(o.productName),
    rawText: typeof o.rawText === "string" ? o.rawText : "",
    quantity: numStr(o.quantity),
    unit: typeof o.unit === "string" ? o.unit : "unit",
  };
}

function parseOppWithItems(raw: unknown): OpportunityWithItems | null {
  const base = parseOpportunity(raw);
  if (!base) return null;
  const o = raw as Record<string, unknown>;
  const items = Array.isArray(o.items)
    ? o.items.map(parseItem).filter((i): i is OpportunityItem => i != null)
    : [];
  return { ...base, items };
}

export type PipelineBoard = { stages: PipelineStage[]; opportunities: Opportunity[] };

export async function fetchPipelineViaProxy(): Promise<PipelineBoard> {
  const res = await fetch(`/api/backend/dashboard/pipeline`, {
    cache: "no-store",
    credentials: "include",
  });
  const body = (await res.json().catch(() => ({}))) as {
    stages?: unknown[];
    opportunities?: unknown[];
  };
  if (!res.ok) return { stages: [], opportunities: [] };
  return {
    stages: Array.isArray(body.stages)
      ? body.stages.map(parseStage).filter((s): s is PipelineStage => s != null)
      : [],
    opportunities: Array.isArray(body.opportunities)
      ? body.opportunities.map(parseOpportunity).filter((o): o is Opportunity => o != null)
      : [],
  };
}

export type OpportunityPayload = {
  partyType: "customer" | "lead" | "none";
  customerId?: number | null;
  leadId?: number | null;
  name?: string;
  stageKey?: string;
  businessTypeKey?: string | null;
  location?: string | null;
  ordersPerMonth?: number;
  monthlyRecurringValue?: number;
  notes?: string;
  assignedSellerId?: number | null;
  items?: Array<{
    productId: number | null;
    productName: string | null;
    rawText: string;
    quantity: number;
    unit: string;
  }>;
};

export async function fetchOpportunityViaProxy(id: string): Promise<OpportunityWithItems | null> {
  const res = await fetch(`/api/backend/dashboard/opportunities/${id}`, {
    cache: "no-store",
    credentials: "include",
  });
  const body = (await res.json().catch(() => ({}))) as { opportunity?: unknown };
  if (!res.ok) return null;
  return parseOppWithItems(body.opportunity);
}

export async function createOpportunityViaProxy(
  payload: OpportunityPayload,
): Promise<OpportunityWithItems> {
  const res = await fetch(`/api/backend/dashboard/opportunities`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as { opportunity?: unknown; error?: string; message?: string };
  if (!res.ok) throw new Error(apiErrorMessage(body, "No se pudo crear la oportunidad."));
  const parsed = parseOppWithItems(body.opportunity);
  if (!parsed) throw new Error("Respuesta inválida.");
  return parsed;
}

export async function updateOpportunityViaProxy(
  id: string,
  payload: OpportunityPayload,
): Promise<OpportunityWithItems> {
  const res = await fetch(`/api/backend/dashboard/opportunities/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as { opportunity?: unknown; error?: string; message?: string };
  if (!res.ok) throw new Error(apiErrorMessage(body, "No se pudo guardar la oportunidad."));
  const parsed = parseOppWithItems(body.opportunity);
  if (!parsed) throw new Error("Respuesta inválida.");
  return parsed;
}

export async function moveOpportunityStageViaProxy(
  id: string,
  stageKey: string,
  boardOrder?: number,
): Promise<Opportunity | null> {
  const res = await fetch(`/api/backend/dashboard/opportunities/${id}/stage`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stageKey, boardOrder }),
  });
  const body = (await res.json().catch(() => ({}))) as { opportunity?: unknown; error?: string };
  if (!res.ok) throw new Error(body.error ?? "No se pudo mover la oportunidad.");
  return parseOpportunity(body.opportunity);
}

export async function deleteOpportunityViaProxy(id: string): Promise<void> {
  const res = await fetch(`/api/backend/dashboard/opportunities/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "No se pudo eliminar la oportunidad.");
  }
}

export async function createStageViaProxy(input: {
  label: string;
  color?: string | null;
}): Promise<void> {
  const res = await fetch(`/api/backend/dashboard/pipeline/stages`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error ?? "No se pudo crear la etapa.");
  }
}

export async function updateStageViaProxy(
  stageId: string,
  input: { label?: string; color?: string | null },
): Promise<void> {
  const res = await fetch(`/api/backend/dashboard/pipeline/stages/${stageId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("No se pudo actualizar la etapa.");
}

export async function deleteStageViaProxy(stageId: string): Promise<void> {
  const res = await fetch(`/api/backend/dashboard/pipeline/stages/${stageId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("No se pudo eliminar la etapa.");
}

export type PipelineFlowEntry =
  | { kind: "system"; key: string }
  | { kind: "custom"; stage_id: string };

export type PipelineSettings = {
  stages: PipelineStage[];
  systemStageLabels: Record<string, string>;
};

export function defaultSystemStageLabel(key: string): string {
  return DEFAULT_PIPELINE_STAGES.find((s) => s.key === key)?.label ?? key;
}

export function buildSystemStageLabelsFromPayload(
  overrides: Record<string, string>,
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const stage of DEFAULT_PIPELINE_STAGES) {
    labels[stage.key] = overrides[stage.key]?.trim() || stage.label;
  }
  return labels;
}

export function buildSystemStageLabelOverrides(
  labels: Record<string, string>,
): Record<string, string> {
  const overrides: Record<string, string> = {};
  for (const stage of DEFAULT_PIPELINE_STAGES) {
    const label = labels[stage.key]?.trim() || stage.label;
    if (label !== stage.label) {
      overrides[stage.key] = label;
    }
  }
  return overrides;
}

export function stagesToFlowEntries(stages: PipelineStage[]): PipelineFlowEntry[] {
  return stages.map((stage) =>
    stage.kind === "system"
      ? { kind: "system" as const, key: stage.key }
      : { kind: "custom" as const, stage_id: stage.stageId! },
  );
}

export async function fetchPipelineSettingsViaProxy(): Promise<PipelineSettings> {
  const res = await fetch(`/api/backend/dashboard/pipeline?settings=1`, {
    cache: "no-store",
    credentials: "include",
  });
  const body = (await res.json().catch(() => ({}))) as {
    stages?: unknown[];
    systemStageLabels?: Record<string, string>;
  };
  if (!res.ok) return { stages: [], systemStageLabels: {} };
  const overrides =
    body.systemStageLabels && typeof body.systemStageLabels === "object"
      ? body.systemStageLabels
      : {};
  return {
    stages: Array.isArray(body.stages)
      ? body.stages.map(parseStage).filter((s): s is PipelineStage => s != null)
      : [],
    systemStageLabels: buildSystemStageLabelsFromPayload(overrides),
  };
}

export async function savePipelineFlowViaProxy(
  flow: PipelineFlowEntry[],
  systemStageLabels: Record<string, string>,
): Promise<PipelineSettings> {
  const res = await fetch(`/api/backend/dashboard/pipeline/flow`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      flow,
      systemStageLabels: buildSystemStageLabelOverrides(systemStageLabels),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    stages?: unknown[];
    systemStageLabels?: Record<string, string>;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(body.error ?? "No se pudo guardar el flujo del pipeline.");
  }
  const overrides =
    body.systemStageLabels && typeof body.systemStageLabels === "object"
      ? body.systemStageLabels
      : {};
  return {
    stages: Array.isArray(body.stages)
      ? body.stages.map(parseStage).filter((s): s is PipelineStage => s != null)
      : [],
    systemStageLabels: buildSystemStageLabelsFromPayload(overrides),
  };
}

function parseBusinessType(raw: unknown): BusinessType | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.businessTypeId !== "string" || typeof o.key !== "string") return null;
  return {
    businessTypeId: o.businessTypeId,
    key: o.key,
    label: typeof o.label === "string" ? o.label : o.key,
  };
}

export async function fetchBusinessTypesViaProxy(): Promise<BusinessType[]> {
  const res = await fetch(`/api/backend/dashboard/business-types`, {
    cache: "no-store",
    credentials: "include",
  });
  const body = (await res.json().catch(() => ({}))) as { businessTypes?: unknown[] };
  if (!res.ok || !Array.isArray(body.businessTypes)) return [];
  return body.businessTypes.map(parseBusinessType).filter((b): b is BusinessType => b != null);
}

export async function createBusinessTypeViaProxy(label: string): Promise<void> {
  const res = await fetch(`/api/backend/dashboard/business-types`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error ?? "No se pudo crear el tipo de negocio.");
  }
}

export async function updateBusinessTypeViaProxy(id: string, label: string): Promise<void> {
  const res = await fetch(`/api/backend/dashboard/business-types/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error("No se pudo actualizar el tipo de negocio.");
}

export async function deleteBusinessTypeViaProxy(id: string): Promise<void> {
  const res = await fetch(`/api/backend/dashboard/business-types/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("No se pudo eliminar el tipo de negocio.");
}

export function formatMoney(value: number | string, currency = "CRC"): string {
  const n = typeof value === "number" ? value : Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const symbol = currency === "USD" ? "$" : "\u20a1";
  return `${symbol}${safe.toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function fetchPipelineServer(
  apiUrl: string,
  idToken?: string | null,
  accessToken?: string | null,
): Promise<PipelineBoard> {
  const base = apiUrl.replace(/\/+$/, "");
  if (!base) return { stages: [], opportunities: [] };
  const bearers = [idToken, accessToken].filter(
    (t): t is string => typeof t === "string" && t.length > 0,
  );
  const url = joinApiGatewayPath(base, "dashboard/pipeline");
  for (const bearer of bearers) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${bearer}` },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const body = (await res.json()) as { stages?: unknown[]; opportunities?: unknown[] };
      return {
        stages: Array.isArray(body.stages)
          ? body.stages.map(parseStage).filter((s): s is PipelineStage => s != null)
          : [],
        opportunities: Array.isArray(body.opportunities)
          ? body.opportunities.map(parseOpportunity).filter((o): o is Opportunity => o != null)
          : [],
      };
    } catch {
      /* next bearer */
    }
  }
  return { stages: [], opportunities: [] };
}
