import { getApiBaseUrl, joinApiGatewayPath } from "@/lib/api";
import type { AssignableRole, PermissionKey, Role } from "@/lib/roles";

export type TeamMemberState = "pending" | "registered";

export type TeamMemberRow = Readonly<{
  kind: "invitation" | "seller";
  id: string;
  name: string;
  email: string;
  role: Role | string;
  state: TeamMemberState;
}>;

export type AssignableCustomer = Readonly<{
  customerId: number;
  name: string;
}>;

export type TeamPermissionsPayload = Readonly<{
  defaults: Readonly<Record<Role, Readonly<Record<PermissionKey, boolean>>>>;
  roleOverrides: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
  userOverrides: Readonly<
    Record<string, Readonly<Record<string, { granted: boolean; effective: boolean }>>>
  >;
  sellers: ReadonlyArray<{ sellerId: number; name: string; email: string; role: string }>;
}>;

export type InviteValidation = Readonly<{
  valid: boolean;
  supplierName?: string;
  inviterName?: string;
  email?: string;
  name?: string;
  role?: string;
  message?: string;
}>;

type ApiErrorBody = { error?: string; message?: string };

async function readErrorMessage(res: Response, body: ApiErrorBody, fallback: string): Promise<string> {
  const msg =
    (typeof body.error === "string" && body.error.trim() ? body.error.trim() : null) ??
    (typeof body.message === "string" && body.message.trim() ? body.message.trim() : null);
  return msg ?? fallback;
}

async function proxyJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const res = await fetch(`/api/backend/${path.replace(/^\/+/, "")}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown> & ApiErrorBody;
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: await readErrorMessage(res, body, "No se pudo completar la solicitud."),
    };
  }
  return { ok: true, data: body as T };
}

function parseTeamMember(raw: unknown): TeamMemberRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const kind =
    o.kind === "invitation" || o.kind === "seller"
      ? o.kind
      : typeof o.invitationId === "string"
        ? "invitation"
        : o.sellerId != null
          ? "seller"
          : null;
  const idRaw =
    o.id ??
    o.invitationId ??
    o.sellerId ??
    "";
  const id = typeof idRaw === "string" ? idRaw.trim() : String(idRaw).trim();
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const email = typeof o.email === "string" ? o.email.trim() : "";
  const role = typeof o.role === "string" ? o.role.trim() : "seller";
  const state = o.state === "pending" || o.state === "registered" ? o.state : null;
  if (!kind || !id || !state) return null;
  return { kind, id, name: name || "—", email: email || "—", role, state };
}

export function parseTeamEnvelope(data: unknown): TeamMemberRow[] {
  const o = data as { team?: unknown[]; members?: unknown[] };
  const raw = Array.isArray(o.team) ? o.team : Array.isArray(o.members) ? o.members : [];
  const rows: TeamMemberRow[] = [];
  for (const item of raw) {
    const row = parseTeamMember(item);
    if (row) rows.push(row);
  }
  return rows;
}

function parseAssignableCustomer(raw: unknown): AssignableCustomer | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const customerId = typeof o.customerId === "number" ? o.customerId : Number(o.customerId);
  if (!Number.isFinite(customerId) || customerId <= 0) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  return { customerId, name: name || "—" };
}

export function parseAssignableCustomersEnvelope(data: unknown): AssignableCustomer[] {
  const o = data as { customers?: unknown[] };
  if (!Array.isArray(o.customers)) return [];
  const rows: AssignableCustomer[] = [];
  for (const item of o.customers) {
    const row = parseAssignableCustomer(item);
    if (row) rows.push(row);
  }
  return rows;
}

export function parsePermissionsPayload(data: unknown): TeamPermissionsPayload {
  const o = (data ?? {}) as Record<string, unknown>;
  const defaults = (o.defaults ?? {}) as TeamPermissionsPayload["defaults"];
  const roleOverrides = (o.roleOverrides ?? o.role ?? {}) as TeamPermissionsPayload["roleOverrides"];
  const userOverrides = (o.userOverrides ?? o.users ?? {}) as TeamPermissionsPayload["userOverrides"];
  const sellersRaw = o.sellers;
  const sellers: TeamPermissionsPayload["sellers"] = [];
  if (Array.isArray(sellersRaw)) {
    for (const item of sellersRaw) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const sellerId = typeof row.sellerId === "number" ? row.sellerId : Number(row.sellerId);
      if (!Number.isFinite(sellerId) || sellerId <= 0) continue;
      sellers.push({
        sellerId,
        name: typeof row.name === "string" ? row.name.trim() || "—" : "—",
        email: typeof row.email === "string" ? row.email.trim() || "—" : "—",
        role: typeof row.role === "string" ? row.role.trim() : "seller",
      });
    }
  }
  return { defaults, roleOverrides, userOverrides, sellers };
}

function parseInviteValidation(data: unknown): InviteValidation {
  const o = (data ?? {}) as Record<string, unknown>;
  return {
    valid: o.valid === true,
    supplierName: typeof o.supplierName === "string" ? o.supplierName : undefined,
    inviterName: typeof o.inviterName === "string" ? o.inviterName : undefined,
    email: typeof o.email === "string" ? o.email : undefined,
    name: typeof o.name === "string" ? o.name : undefined,
    role: typeof o.role === "string" ? o.role : undefined,
    message: typeof o.message === "string" ? o.message : undefined,
  };
}

export function parseSellerPermissions(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  const seller =
    o.seller && typeof o.seller === "object" ? (o.seller as Record<string, unknown>) : o;
  const raw = seller.permissions ?? o.permissions;
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is string => typeof p === "string" && p.trim().length > 0);
}

/** GET /dashboard/team */
export async function fetchTeamViaProxy(): Promise<TeamMemberRow[] | null> {
  const result = await proxyJson<{ team?: unknown[]; members?: unknown[] }>("dashboard/team");
  if (!result.ok) return null;
  return parseTeamEnvelope(result.data);
}

/** POST /dashboard/team/invitations */
export async function createTeamInvitationViaProxy(input: {
  name: string;
  email: string;
  role: AssignableRole;
  assignedCustomerIds?: number[];
}): Promise<{
  row: TeamMemberRow;
  acceptUrl?: string;
  emailSent: boolean;
  emailMessage?: string;
}> {
  const result = await proxyJson<{
    invitation?: unknown;
    member?: unknown;
    acceptUrl?: string;
    emailSent?: boolean;
    emailMessage?: string;
  }>("dashboard/team/invitations", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim(),
      role: input.role,
      assignedCustomerIds: input.assignedCustomerIds ?? [],
    }),
  });
  if (!result.ok) throw new Error(result.message);
  const raw = result.data.invitation ?? result.data.member ?? result.data;
  const row = parseTeamMember(raw);
  if (!row) throw new Error("Respuesta de invitación inválida.");
  return {
    row,
    acceptUrl:
      typeof result.data.acceptUrl === "string" ? result.data.acceptUrl : undefined,
    emailSent: result.data.emailSent === true,
    emailMessage:
      typeof result.data.emailMessage === "string" ? result.data.emailMessage : undefined,
  };
}

/** DELETE /dashboard/team/invitations/:invitationId */
export async function revokeTeamInvitationViaProxy(invitationId: string): Promise<void> {
  const result = await proxyJson<unknown>(
    `dashboard/team/invitations/${encodeURIComponent(invitationId)}`,
    { method: "DELETE" },
  );
  if (!result.ok) throw new Error(result.message);
}

/** PATCH /dashboard/team/sellers/:sellerId/role */
export async function patchTeamSellerRoleViaProxy(
  sellerId: number,
  role: AssignableRole,
): Promise<void> {
  const result = await proxyJson<unknown>(
    `dashboard/team/sellers/${encodeURIComponent(String(sellerId))}/role`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    },
  );
  if (!result.ok) throw new Error(result.message);
}

/** DELETE /dashboard/team/sellers/:sellerId */
export async function removeTeamSellerViaProxy(sellerId: number): Promise<void> {
  const result = await proxyJson<unknown>(
    `dashboard/team/sellers/${encodeURIComponent(String(sellerId))}`,
    { method: "DELETE" },
  );
  if (!result.ok) throw new Error(result.message);
}

/** GET /dashboard/team/permissions */
export async function fetchTeamPermissionsViaProxy(): Promise<TeamPermissionsPayload | null> {
  const result = await proxyJson<unknown>("dashboard/team/permissions");
  if (!result.ok) return null;
  return parsePermissionsPayload(result.data);
}

/** PUT /dashboard/team/permissions/role/:role */
export async function putTeamRolePermissionsViaProxy(
  role: Role,
  permissions: Readonly<Record<string, boolean>>,
): Promise<void> {
  const result = await proxyJson<unknown>(
    `dashboard/team/permissions/role/${encodeURIComponent(role)}`,
    {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    },
  );
  if (!result.ok) throw new Error(result.message);
}

/** PUT /dashboard/team/permissions/user/:sellerId */
export async function putTeamUserPermissionsViaProxy(
  sellerId: number,
  permissions: Readonly<Record<string, boolean>>,
): Promise<void> {
  const result = await proxyJson<unknown>(
    `dashboard/team/permissions/user/${encodeURIComponent(String(sellerId))}`,
    {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    },
  );
  if (!result.ok) throw new Error(result.message);
}

/** GET /dashboard/customers/assignable */
export async function fetchAssignableCustomersViaProxy(): Promise<AssignableCustomer[]> {
  const result = await proxyJson<{ customers?: unknown[] }>("dashboard/customers/assignable");
  if (!result.ok) return [];
  return parseAssignableCustomersEnvelope(result.data);
}

async function publicApiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  if (!base) {
    return new Response(JSON.stringify({ error: "MissingAPIUrl" }), { status: 503 });
  }
  const url = joinApiGatewayPath(base, path.replace(/^\/+/, ""));
  return fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}

/** GET /invite/validate?token=… (public) */
export async function validateInviteToken(token: string): Promise<InviteValidation> {
  const qs = new URLSearchParams({ token: token.trim() });
  const res = await publicApiFetch(`invite/validate?${qs.toString()}`);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      valid: false,
      message:
        typeof body.message === "string"
          ? body.message
          : "Esta invitación ya no es válida.",
    };
  }
  return parseInviteValidation(body);
}

/** POST /invite/accept (public) */
export async function acceptInvite(input: {
  token: string;
  name: string;
  password: string;
}): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  const res = await publicApiFetch("invite/accept", {
    method: "POST",
    body: JSON.stringify({
      token: input.token.trim(),
      name: input.name.trim(),
      password: input.password,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown> & ApiErrorBody;
  if (!res.ok) {
    return {
      ok: false,
      message: await readErrorMessage(res, body, "No se pudo completar el registro."),
    };
  }
  const emailFromBody =
    typeof body.email === "string" && body.email.trim() ? body.email.trim() : "";
  const emailFromSeller =
    body.seller && typeof body.seller === "object"
      ? String((body.seller as Record<string, unknown>).email ?? "").trim()
      : "";
  const resolvedEmail = emailFromBody || emailFromSeller;
  if (!resolvedEmail) {
    return { ok: false, message: "Respuesta de registro inválida." };
  }
  return { ok: true, email: resolvedEmail };
}

/** Browser: load effective permissions from sellers/me (when backend adds the field). */
export async function fetchEffectivePermissionsViaProxy(): Promise<{
  role: string;
  sellerId: number;
  permissions: string[];
} | null> {
  const res = await fetch("/api/backend/sellers/me", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return null;
  const seller =
    body.seller && typeof body.seller === "object"
      ? (body.seller as Record<string, unknown>)
      : null;
  if (!seller) return null;
  const sellerId = typeof seller.sellerId === "number" ? seller.sellerId : Number(seller.sellerId);
  if (!Number.isFinite(sellerId)) return null;
  const role = typeof seller.role === "string" ? seller.role : "seller";
  const permissions = parseSellerPermissions(body);
  return { role, sellerId, permissions };
}
