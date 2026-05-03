export const MARKETING_LOCALES = ["en", "es"] as const;

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

export function resolveMarketingSegment(pathname: string): MarketingPageSegment {
  const parts = pathname.split("/").filter(Boolean);
  const segment = parts[1];
  if (segment === "privacy") return "privacy";
  if (segment === "terms") return "terms";
  return "home";
}
