import { joinApiGatewayPath } from "@/lib/api";
import type { SupplierSettings } from "@/lib/dashboard-types";
import { DEFAULT_SUPPLIER_TIMEZONE } from "@/lib/supplier-timezone";
import { parseWorkspaceLocale, setWorkspaceLocaleCookie } from "@/lib/workspace-locale";

function uniqBearerCandidates(idToken?: string | null, accessToken?: string | null): string[] {
  return [
    ...new Set([idToken, accessToken].filter((t): t is string => typeof t === "string" && t.length > 0)),
  ];
}

export type DraftExpirationHours = 24 | 48 | 72 | 168;

export const DRAFT_EXPIRATION_OPTIONS: ReadonlyArray<{
  value: DraftExpirationHours;
  label: string;
}> = [
  { value: 24, label: "24 horas" },
  { value: 48, label: "48 horas" },
  { value: 72, label: "72 horas" },
  { value: 168, label: "1 semana" },
];

export type DashboardSellerRow = Readonly<{
  sellerId: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
}>;

function parseExpirationHours(value: unknown): DraftExpirationHours {
  const n = typeof value === "number" ? value : Number(value);
  if (n === 24 || n === 48 || n === 72 || n === 168) return n;
  return 72;
}

export function parseSupplierSettings(data: unknown): SupplierSettings | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;

  const businessRaw =
    root.business && typeof root.business === "object" && !Array.isArray(root.business)
      ? (root.business as Record<string, unknown>)
      : null;
  const aiRaw =
    root.ai && typeof root.ai === "object" && !Array.isArray(root.ai)
      ? (root.ai as Record<string, unknown>)
      : null;

  if (!businessRaw || !aiRaw) return null;

  const businessName =
    typeof businessRaw.businessName === "string" ? businessRaw.businessName.trim() : "";
  const businessEmail =
    typeof businessRaw.businessEmail === "string" ? businessRaw.businessEmail.trim() : "";

  const whatsappPhoneE164 =
    businessRaw.whatsappPhoneE164 === null || businessRaw.whatsappPhoneE164 === undefined
      ? null
      : typeof businessRaw.whatsappPhoneE164 === "string" && businessRaw.whatsappPhoneE164.trim()
        ? businessRaw.whatsappPhoneE164.trim()
        : null;

  const whatsappConnectedAt =
    businessRaw.whatsappConnectedAt === null || businessRaw.whatsappConnectedAt === undefined
      ? null
      : typeof businessRaw.whatsappConnectedAt === "string" && businessRaw.whatsappConnectedAt.trim()
        ? businessRaw.whatsappConnectedAt.trim()
        : null;

  const defaultLocale = parseWorkspaceLocale(businessRaw.defaultLocale);

  const timezoneRaw =
    typeof businessRaw.timezone === "string" ? businessRaw.timezone.trim() : "";
  const timezone = timezoneRaw || DEFAULT_SUPPLIER_TIMEZONE;

  return {
    business: {
      businessName: businessName || "—",
      businessEmail: businessEmail || "—",
      whatsappPhoneE164,
      whatsappConnectedAt,
      defaultLocale,
      timezone,
    },
    ai: {
      autoCommitEnabled: aiRaw.autoCommitEnabled === true,
      chatbotEnabled: aiRaw.chatbotEnabled !== false,
      draftExpirationHours: parseExpirationHours(aiRaw.draftExpirationHours),
    },
  };
}

function parseSellerRow(raw: unknown): DashboardSellerRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const sellerId = typeof o.sellerId === "number" ? o.sellerId : Number(o.sellerId);
  if (!Number.isFinite(sellerId) || sellerId <= 0) return null;

  const name = typeof o.name === "string" ? o.name.trim() : "";
  const email = typeof o.email === "string" ? o.email.trim() : "";
  const role = typeof o.role === "string" ? o.role.trim() : "seller";
  const active = o.active !== false;

  const lastLoginAt =
    o.lastLoginAt === null || o.lastLoginAt === undefined
      ? null
      : typeof o.lastLoginAt === "string" && o.lastLoginAt.trim()
        ? o.lastLoginAt.trim()
        : null;

  return {
    sellerId,
    name: name || "—",
    email: email || "—",
    role,
    active,
    lastLoginAt,
  };
}

export function parseDashboardSellersEnvelope(data: unknown): DashboardSellerRow[] {
  const o = data as { sellers?: unknown[] };
  if (!Array.isArray(o.sellers)) return [];
  const rows: DashboardSellerRow[] = [];
  for (const item of o.sellers) {
    const row = parseSellerRow(item);
    if (row) rows.push(row);
  }
  return rows;
}

export async function fetchSettingsDashboard(
  apiUrl: string,
  idToken?: string | null,
  accessToken?: string | null,
): Promise<SupplierSettings | null> {
  const base = apiUrl.replace(/\/+$/, "");
  if (!base) return null;

  const bearerCandidates = uniqBearerCandidates(idToken, accessToken);
  if (bearerCandidates.length === 0) return null;

  const url = joinApiGatewayPath(base, "dashboard/settings");

  for (const bearer of bearerCandidates) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${bearer}` },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const body = (await res.json()) as unknown;
      return parseSupplierSettings(body);
    } catch {
      /* try next bearer */
    }
  }

  return null;
}

export async function fetchSellersDashboard(
  apiUrl: string,
  idToken?: string | null,
  accessToken?: string | null,
): Promise<DashboardSellerRow[] | null> {
  const base = apiUrl.replace(/\/+$/, "");
  if (!base) return null;

  const bearerCandidates = uniqBearerCandidates(idToken, accessToken);
  if (bearerCandidates.length === 0) return null;

  const url = joinApiGatewayPath(base, "dashboard/sellers");

  for (const bearer of bearerCandidates) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${bearer}` },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const body = (await res.json()) as unknown;
      return parseDashboardSellersEnvelope(body);
    } catch {
      /* try next bearer */
    }
  }

  return null;
}

export type PatchSupplierSettingsInput = Readonly<{
  aiAutoCommitEnabled?: boolean;
  aiChatbotEnabled?: boolean;
  draftExpirationHours?: DraftExpirationHours;
  defaultLocale?: "es" | "en";
}>;

export type PatchSupplierSettingsResult = Readonly<{
  ai?: SupplierSettings["ai"];
  business?: Pick<SupplierSettings["business"], "defaultLocale">;
}>;

/** Browser / Route Handler: PATCH `/api/backend/dashboard/settings`. */
export async function patchDashboardSettingsViaProxy(
  input: PatchSupplierSettingsInput,
): Promise<PatchSupplierSettingsResult> {
  const res = await fetch("/api/backend/dashboard/settings", {
    method: "PATCH",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const msg =
      typeof body.error === "string" && body.error.trim().length > 0
        ? body.error.trim()
        : "No se pudo guardar la configuración.";
    throw new Error(msg);
  }

  const aiRaw =
    body.ai && typeof body.ai === "object" && !Array.isArray(body.ai)
      ? (body.ai as Record<string, unknown>)
      : null;

  const businessRaw =
    body.business && typeof body.business === "object" && !Array.isArray(body.business)
      ? (body.business as Record<string, unknown>)
      : null;

  const result: {
    ai?: SupplierSettings["ai"];
    business?: Pick<SupplierSettings["business"], "defaultLocale">;
  } = {};

  if (aiRaw) {
    result.ai = {
      autoCommitEnabled: aiRaw.autoCommitEnabled === true,
      chatbotEnabled: aiRaw.chatbotEnabled !== false,
      draftExpirationHours: parseExpirationHours(aiRaw.draftExpirationHours),
    };
  }

  if (businessRaw && businessRaw.defaultLocale !== undefined) {
    const defaultLocale = parseWorkspaceLocale(businessRaw.defaultLocale);
    result.business = { defaultLocale };
    setWorkspaceLocaleCookie(defaultLocale);
  }

  if (!result.ai && !result.business) {
    throw new Error("Respuesta de configuración inválida.");
  }

  return result;
}

export function sellerCanEditSettings(role: string): boolean {
  const r = role.trim().toLowerCase();
  return r === "owner" || r === "admin";
}

export async function fetchSellerCanEditDashboard(
  apiUrl: string,
  idToken?: string | null,
  accessToken?: string | null,
): Promise<boolean> {
  const base = apiUrl.replace(/\/+$/, "");
  if (!base) return false;

  const bearerCandidates = uniqBearerCandidates(idToken, accessToken);
  if (bearerCandidates.length === 0) return false;

  const url = joinApiGatewayPath(base, "sellers/me");

  for (const bearer of bearerCandidates) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${bearer}` },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { seller?: { role?: string } };
      return sellerCanEditSettings(data.seller?.role ?? "seller");
    } catch {
      /* try next bearer */
    }
  }

  return false;
}
