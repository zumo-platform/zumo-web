/**
 * Public client bundle base URL (SST sets `NEXT_PUBLIC_API_URL` on the dashboard static site).
 */
const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

export function getApiBaseUrl(): string {
  return normalizeApiGatewayBase(publicApiBaseUrl ?? "");
}

/**
 * Remove stray path suffixes copied by mistake (`…/dashboard` + route `dashboard/customers`).
 */
function normalizeApiGatewayBase(raw: string): string {
  let base = raw.trim().replace(/\/+$/, "");
  let prev = "";
  while (prev !== base) {
    prev = base;
    if (/\/dashboard$/i.test(base)) {
      base = base.replace(/\/dashboard$/i, "").replace(/\/+$/, "");
    }
  }
  return base.replace(/\/+$/, "");
}

/**
 * Base URL for server-side calls to API Gateway (workspace layout, Route Handlers proxy, RSC data).
 * Use `API_URL` when you want a server-only override; otherwise `NEXT_PUBLIC_API_URL` is reused so
 * `.env.local` only needs one variable.
 */
export function getServerApiBaseUrl(): string {
  return normalizeApiGatewayBase(
    process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "",
  );
}

/** Concatenate gateway base with a path segment (e.g. `dashboard/customers`). */
export function joinApiGatewayPath(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${base}/${p}`;
}

export function getWebhookEndpoint(): string {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return "";
  return joinApiGatewayPath(baseUrl, "webhook/whatsapp");
}
