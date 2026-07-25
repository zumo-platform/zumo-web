/** Server-side permission resolution for route guards (RSC / layouts only). */
import { getServerApiBaseUrl, joinApiGatewayPath } from "@/lib/api";
import { permissionsFromRole } from "@/lib/roles";
import { getAuthSession } from "@/lib/session";
import { parseSellerPermissions } from "@/lib/team";

export type ServerPermissions = Readonly<{
  role: string;
  permissions: ReadonlySet<string>;
}>;

/**
 * Resolve the acting seller's role + effective permissions on the server.
 * Mirrors the client bootstrap (`sellers/me` → `parseSellerPermissions`, role fallback),
 * so a layout can authorize before rendering instead of only hiding nav.
 * Returns null when there is no session or the API is unreachable.
 */
export async function fetchServerPermissions(): Promise<ServerPermissions | null> {
  const { idToken, accessToken } = await getAuthSession();
  // Prefer id_token (tenant claims), fall back to access_token — same order as the proxy.
  const bearers = [
    ...new Set([idToken, accessToken].filter((t): t is string => Boolean(t))),
  ];
  if (bearers.length === 0) return null;

  const base = getServerApiBaseUrl();
  if (!base) return null;
  const url = joinApiGatewayPath(base, "sellers/me");

  for (const bearer of bearers) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${bearer}` },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const payload = (await res.json()) as { seller?: { role?: string } };
      const role = payload.seller?.role ?? "seller";
      const parsed = parseSellerPermissions(payload);
      const permissions = parsed.length > 0 ? parsed : [...permissionsFromRole(role)];
      return { role, permissions: new Set(permissions) };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Gate for the internal Zumo staff tooling.
 *
 * Uses an explicit key check rather than `canWithRole`, whose `owner` short-circuit would
 * admit every supplier owner to the GLOBAL market directory. Note this only closes the
 * role-bypass half: `market.admin` is still part of the owner default permission set on the
 * backend, so removing it there is required to fully restrict this to Zumo staff.
 */
export function hasMarketAdmin(resolved: ServerPermissions | null): boolean {
  return resolved?.permissions.has("market.admin") ?? false;
}
