import type { SellerMe, WhatsappStatusResult } from "@/lib/dashboard-types";
import { parseSupplierSettings } from "@/lib/dashboard-settings";
import { DEFAULT_SUPPLIER_TIMEZONE } from "@/lib/supplier-timezone";
import type { WorkspacePreferences } from "@/lib/workspace-preferences-context";
import {
  dedupeSessionLoad,
  invalidateSessionCache,
  readSessionCache,
  writeSessionCache,
  WORKSPACE_CACHE_KEYS,
  WORKSPACE_CACHE_TTL_MS,
} from "@/lib/workspace-session-cache";

export type WorkspaceBootstrap = Readonly<{
  seller: SellerMe["seller"];
  supplier: SellerMe["supplier"] | null;
  whatsappStatus: WhatsappStatusResult | null;
  preferences: WorkspacePreferences;
}>;

export const fallbackSeller: SellerMe["seller"] = {
  sellerId: 0,
  email: "",
  name: "Usuario",
  phone: null,
  role: "owner",
  active: true,
};

export const defaultPreferences: WorkspacePreferences = {
  timeZone: DEFAULT_SUPPLIER_TIMEZONE,
  autoCommitEnabled: false,
};

export const defaultBootstrap: WorkspaceBootstrap = {
  seller: fallbackSeller,
  supplier: null,
  whatsappStatus: null,
  preferences: defaultPreferences,
};

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

function buildPreferences(
  settings: ReturnType<typeof parseSupplierSettings>,
  supplier: SellerMe["supplier"] | null,
): WorkspacePreferences {
  if (settings) {
    return {
      timeZone: settings.business.timezone,
      autoCommitEnabled: settings.ai.autoCommitEnabled,
    };
  }
  const tz = supplier?.timezone?.trim();
  return {
    timeZone: tz && tz.length > 0 ? tz : DEFAULT_SUPPLIER_TIMEZONE,
    autoCommitEnabled: false,
  };
}

async function fetchBootstrapPayload(): Promise<WorkspaceBootstrap> {
  const [sellerPayload, settingsPayload, whatsappPayload] = await Promise.all([
    fetchJson("/api/backend/sellers/me"),
    fetchJson("/api/backend/dashboard/settings"),
    fetchJson("/api/backend/dashboard/whatsapp/status"),
  ]);

  const sellerData = sellerPayload as SellerMe | null;
  const seller = sellerData?.seller ?? fallbackSeller;
  const supplier = sellerData?.supplier ?? null;
  const settings = parseSupplierSettings(settingsPayload);
  const whatsappStatus = whatsappPayload as WhatsappStatusResult | null;

  const bootstrap: WorkspaceBootstrap = {
    seller,
    supplier,
    whatsappStatus,
    preferences: buildPreferences(settings, supplier),
  };

  writeSessionCache(WORKSPACE_CACHE_KEYS.bootstrap, bootstrap, WORKSPACE_CACHE_TTL_MS.bootstrap);
  return bootstrap;
}

export async function loadWorkspaceBootstrap(options?: {
  force?: boolean;
}): Promise<WorkspaceBootstrap> {
  if (!options?.force) {
    const cached = readSessionCache<WorkspaceBootstrap>(WORKSPACE_CACHE_KEYS.bootstrap);
    if (cached) return cached;
  }

  return dedupeSessionLoad(WORKSPACE_CACHE_KEYS.bootstrap, fetchBootstrapPayload);
}

export function readCachedWorkspaceBootstrap(): WorkspaceBootstrap | null {
  return readSessionCache<WorkspaceBootstrap>(WORKSPACE_CACHE_KEYS.bootstrap);
}

export function invalidateWorkspaceBootstrapCache(): void {
  invalidateSessionCache(WORKSPACE_CACHE_KEYS.bootstrap);
}
