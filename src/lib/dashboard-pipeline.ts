import { joinApiGatewayPath } from "@/lib/api";

export type OpportunityStatus =
  | "ordenando"
  | "no_calificado"
  | "calificado"
  | "cotizacion_enviada"
  | "esperando_por_pedido";

export const OPPORTUNITY_STATUS_LABEL: Record<OpportunityStatus, string> = {
  ordenando: "Ordenando",
  no_calificado: "No calificado",
  calificado: "Calificado",
  cotizacion_enviada: "Cotización enviada",
  esperando_por_pedido: "Esperando por pedido",
};

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
  monthlyRecurringValue: string;
  currency: string;
  notes: string;
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
    monthlyRecurringValue: numStr(o.monthlyRecurringValue),
    currency: typeof o.currency === "string" ? o.currency : "CRC",
    notes: typeof o.notes === "string" ? o.notes : "",
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
  monthlyRecurringValue?: number;
  notes?: string;
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
  const body = (await res.json().catch(() => ({}))) as { opportunity?: unknown; error?: string };
  if (!res.ok) throw new Error(body.error ?? "No se pudo crear la oportunidad.");
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
  const body = (await res.json().catch(() => ({}))) as { opportunity?: unknown; error?: string };
  if (!res.ok) throw new Error(body.error ?? "No se pudo guardar la oportunidad.");
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
