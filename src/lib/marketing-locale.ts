/** Spanish first — default marketing and auth locale. */
export const MARKETING_LOCALES = ["es", "en"] as const;

export type MarketingLocale = (typeof MARKETING_LOCALES)[number];

export type MarketingPageSegment = "home" | "privacy" | "terms";

export function isMarketingLocale(value: string): value is MarketingLocale {
  return (MARKETING_LOCALES as readonly string[]).includes(value);
}

export function marketingHref(locale: MarketingLocale, segment: MarketingPageSegment): string {
  if (segment === "home") {
    return `/${locale}`;
  }
  return `/${locale}/${segment}`;
}

/** Localized login route (`/es/login`, `/en/login`). */
export function authLoginPath(
  locale: MarketingLocale,
  options?: Readonly<{ tab?: "signup" }>,
): string {
  const base = `/${locale}/login`;
  return options?.tab === "signup" ? `${base}?tab=signup` : base;
}

export function resolveMarketingSegment(pathname: string): MarketingPageSegment {
  const parts = pathname.split("/").filter(Boolean);
  const segment = parts[1];
  if (segment === "privacy") return "privacy";
  if (segment === "terms") return "terms";
  return "home";
}
