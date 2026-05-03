"use client";

import type { ReactNode } from "react";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import type { MarketingMessages } from "@/content/marketing/types";
import type { MarketingLocale } from "@/lib/marketing-locale";
import { resolveMarketingSegment } from "@/lib/marketing-locale";

export function MarketingShell({
  locale,
  messages,
  children,
}: Readonly<{
  locale: MarketingLocale;
  messages: MarketingMessages;
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const segment = resolveMarketingSegment(pathname);

  return (
    <>
      <SiteHeader locale={locale} messages={messages} segment={segment} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} messages={messages} />
    </>
  );
}
