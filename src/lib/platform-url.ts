const DEFAULT_PLATFORM_APP_URL = "https://app.zumob2b.com";

/** Supplier dashboard origin from env. No trailing slash. */
export function platformAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_PLATFORM_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return "";
}

/** Platform origin for redirects/links — falls back on Vercel marketing deploys. */
export function resolvedPlatformAppOrigin(): string {
  return platformAppOrigin() || DEFAULT_PLATFORM_APP_URL;
}

/** Use for auth CTAs: absolute AWS URL on Vercel, relative paths in local dev. */
export function authPlatformOrigin(): string {
  const configured = platformAppOrigin();
  if (configured) return configured;
  if (process.env.VERCEL === "1") return DEFAULT_PLATFORM_APP_URL;
  return "";
}

/** Public marketing site origin (Vercel). No trailing slash. */
export function marketingSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://zumob2b.com"
  );
}

function normalizeHost(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

export function isMarketingSiteHost(host: string): boolean {
  const h = normalizeHost(host);
  return h === "zumob2b.com" || h === "www.zumob2b.com";
}

export function isPlatformAppHost(host: string): boolean {
  return normalizeHost(host) === "app.zumob2b.com";
}

/** True for locale home, privacy, and terms — not login/signup. */
export function isMarketingContentPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/privacy" || pathname === "/terms") return true;
  return /^\/(es|en)(\/privacy|\/terms)?\/?$/.test(pathname);
}

/** Workspace, auth, and dashboard API routes belong on the platform host. */
export function isPlatformAppPath(pathname: string): boolean {
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/backend")) return true;
  if (pathname === "/login" || pathname === "/register" || pathname === "/invite") return true;
  if (/^\/(es|en)\/login/.test(pathname)) return true;

  const platformPrefixes = [
    "/inbox",
    "/whatsapp",
    "/orders",
    "/clients",
    "/products",
    "/profile",
    "/settings",
    "/matches",
    "/market",
    "/admin",
    "/compras",
    "/quotes",
    "/sales",
    "/precios",
    "/vendedores",
    "/marketing",
  ];
  return platformPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function absolutePlatformPath(pathname: string, search = ""): string {
  const origin = platformAppOrigin() || marketingSiteOrigin();
  return `${origin}${pathname}${search}`;
}
