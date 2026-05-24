import type { MarketingLocale } from "@/lib/marketing-locale";
import { isMarketingLocale } from "@/lib/marketing-locale";

export const WORKSPACE_LOCALE_COOKIE = "zumo-locale";

export const WORKSPACE_LOCALE_OPTIONS: ReadonlyArray<{
  value: MarketingLocale;
  label: string;
}> = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

export function parseWorkspaceLocale(value: unknown): MarketingLocale {
  if (typeof value === "string" && isMarketingLocale(value)) return value;
  return "es";
}

/** Persist locale preference in the browser (dashboard UI). */
export function setWorkspaceLocaleCookie(locale: MarketingLocale): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${WORKSPACE_LOCALE_COOKIE}=${locale};path=/;max-age=${String(maxAge)};SameSite=Lax`;
}

export function readWorkspaceLocaleCookie(): MarketingLocale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${WORKSPACE_LOCALE_COOKIE}=([^;]+)`),
  );
  const raw = match?.[1]?.trim();
  return raw && isMarketingLocale(raw) ? raw : null;
}
