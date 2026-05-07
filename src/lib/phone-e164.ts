import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

/** Trim leading/trailing whitespace, then digits only (no letters, spaces, hyphens, etc.). */
export function sanitizeNationalPhoneDigits(raw: string): string {
  return raw.trim().replace(/\D/g, "");
}

/** Normalize national digits (no country code) to E.164, or null if invalid. */
export function nationalToE164(national: string, country: CountryCode): string | null {
  const cleaned = sanitizeNationalPhoneDigits(national);
  if (!cleaned) return null;
  const pn = parsePhoneNumberFromString(cleaned, country);
  if (!pn?.isValid()) return null;
  return pn.format("E.164");
}
