import { marketingMessagesEn } from "@/content/marketing/en";
import { marketingMessagesEs } from "@/content/marketing/es";
import type { MarketingMessages } from "@/content/marketing/types";
import type { MarketingLocale } from "@/lib/marketing-locale";

const catalog: Record<MarketingLocale, MarketingMessages> = {
  en: marketingMessagesEn,
  es: marketingMessagesEs,
};

export function getMarketingMessages(locale: MarketingLocale): MarketingMessages {
  return catalog[locale];
}
