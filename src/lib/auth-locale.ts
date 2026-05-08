import type { MarketingLocale } from "@/lib/marketing-locale";

/** Locale for auth API responses (caller sends `X-Auth-Locale`). */
export function localeFromAuthHeader(header: string | null): MarketingLocale {
  const v = header?.trim().toLowerCase();
  return v === "en" ? "en" : "es";
}

/** Read locale from incoming auth POST (Next.js Route Handler). */
export function localeFromRequest(request: Request): MarketingLocale {
  return localeFromAuthHeader(request.headers.get("x-auth-locale"));
}
