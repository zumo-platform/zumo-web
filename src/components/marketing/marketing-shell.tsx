"use client";

import type { ReactNode } from "react";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import type { MarketingMessages } from "@/content/marketing/types";
import type { MarketingLocale } from "@/lib/marketing-locale";
import { resolveMarketingSegment } from "@/lib/marketing-locale";

/** Reserve layout while header loads (avoids CLS; no React hydration for real header — see below). */
function MarketingHeaderSkeleton() {
  return (
    <header
      aria-hidden
      className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-6">
        <div className="h-8 w-28 shrink-0 rounded bg-muted/50" />
        <div className="flex items-center gap-2 md:gap-3">
          <div className="h-8 w-[4.5rem] rounded-full bg-muted/50" />
          <div className="hidden h-8 w-52 rounded bg-muted/50 md:block" />
          <div className="h-8 w-28 rounded-md bg-muted/50 md:hidden" />
        </div>
      </div>
    </header>
  );
}

function MarketingFooterSkeleton() {
  return (
    <footer aria-hidden className="mt-24 border-t border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="h-8 w-28 rounded bg-muted/50" />
            <div className="h-10 max-w-xs rounded bg-muted/40" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-16 rounded bg-muted/50" />
            <div className="h-4 w-24 rounded bg-muted/40" />
            <div className="h-4 w-20 rounded bg-muted/40" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-20 rounded bg-muted/50" />
            <div className="h-4 w-40 rounded bg-muted/40" />
          </div>
        </div>
        <div className="mt-12 h-4 max-w-md rounded bg-muted/30 pt-6" />
      </div>
    </footer>
  );
}

const SiteHeaderDynamic = dynamic(
  () => import("@/components/marketing/site-header").then((m) => ({ default: m.SiteHeader })),
  { ssr: false, loading: MarketingHeaderSkeleton },
);

const SiteFooterDynamic = dynamic(
  () => import("@/components/marketing/site-footer").then((m) => ({ default: m.SiteFooter })),
  { ssr: false, loading: MarketingFooterSkeleton },
);

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
      <SiteHeaderDynamic locale={locale} messages={messages} segment={segment} />
      {/* Cursor IDE browser injects data-cursor-ref before hydrate; suppress subtree mismatches for RSC pages */}
      <main className="flex-1" suppressHydrationWarning>
        {children}
      </main>
      <SiteFooterDynamic locale={locale} messages={messages} />
    </>
  );
}
