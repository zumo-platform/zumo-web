import type { LegalDocument } from "@/content/marketing/types";
import type { MarketingLocale } from "@/lib/marketing-locale";

import { privacyEn } from "./privacy-en";
import { privacyEs } from "./privacy-es";
import { termsEn } from "./terms-en";
import { termsEs } from "./terms-es";

export const privacyDocument: Record<MarketingLocale, LegalDocument> = {
  en: privacyEn,
  es: privacyEs,
};

export const termsDocument: Record<MarketingLocale, LegalDocument> = {
  en: termsEn,
  es: termsEs,
};
