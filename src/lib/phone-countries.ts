import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

/**
 * US + continental Latin America + Dominican Republic & Puerto Rico only (no other islands).
 * Excludes Belize, Guyana, and Suriname per product rules.
 */
export const LATAM_AND_US_ISO = [
  "US",
  "MX",
  "GT",
  "HN",
  "SV",
  "NI",
  "CR",
  "PA",
  "DO",
  "PR",
  "AR",
  "BR",
  "CL",
  "CO",
  "EC",
  "PY",
  "PE",
  "UY",
  "VE",
] as const satisfies readonly CountryCode[];

/** First rows in the country dropdown; remaining countries follow A–Z by localized name. */
const DROPDOWN_PIN_FIRST = ["CR", "PA", "GT", "MX"] as const satisfies readonly CountryCode[];

const LATAM_AND_US_SET = new Set<string>(LATAM_AND_US_ISO);

export type CallingCountry = {
  iso: CountryCode;
  name: string;
  dial: string;
};

/** Flag emoji from ISO 3166-1 alpha-2. */
export function flagEmoji(iso2: string): string {
  if (iso2.length !== 2) return "";
  const upper = iso2.toUpperCase();
  return [...upper]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export function getSortedCallingCountries(locale: string): CallingCountry[] {
  const regionNames = new Intl.DisplayNames([locale], { type: "region" });
  const list = getCountries()
    .filter((iso) => LATAM_AND_US_SET.has(iso))
    .map((iso) => ({
      iso,
      name: regionNames.of(iso) ?? iso,
      dial: `+${getCountryCallingCode(iso)}`,
    }));

  const byIso = new Map(list.map((c) => [c.iso, c]));
  const pinSet = new Set<string>(DROPDOWN_PIN_FIRST);
  const pinned: CallingCountry[] = [];
  for (const iso of DROPDOWN_PIN_FIRST) {
    const row = byIso.get(iso);
    if (row) pinned.push(row);
  }
  const rest = list
    .filter((c) => !pinSet.has(c.iso))
    .sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: "base" }));

  return [...pinned, ...rest];
}
