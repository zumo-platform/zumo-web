import type { ReactNode } from "react";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketingShell } from "@/components/marketing/marketing-shell";
import { getMarketingMessages } from "@/content/marketing/index";
import type { MarketingLocale } from "@/lib/marketing-locale";
import { MARKETING_LOCALES, isMarketingLocale } from "@/lib/marketing-locale";

type LayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams(): Array<{ locale: MarketingLocale }> {
  return MARKETING_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale: raw } = await params;

  if (!isMarketingLocale(raw)) {
    return {};
  }

  const messages = getMarketingMessages(raw);

  return {
    title: {
      default: "Zumo",
      template: "%s — Zumo",
    },
    description: messages.metaDescription,
  };
}

export default async function MarketingLocaleLayout({ children, params }: LayoutProps) {
  const { locale: raw } = await params;

  if (!isMarketingLocale(raw)) {
    notFound();
  }

  const locale = raw;
  const messages = getMarketingMessages(locale);

  return (
    <div
      className="flex min-h-screen flex-col bg-background text-foreground"
      lang={locale}
    >
      <MarketingShell locale={locale} messages={messages}>
        {children}
      </MarketingShell>
    </div>
  );
}
