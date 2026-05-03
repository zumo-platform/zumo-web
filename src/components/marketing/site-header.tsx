import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { MarketingMessages } from "@/content/marketing/types";
import type { MarketingLocale, MarketingPageSegment } from "@/lib/marketing-locale";
import { marketingHref } from "@/lib/marketing-locale";
import { cn } from "@/lib/utils";

function NavAnchor({
  href,
  children,
  className,
}: Readonly<{
  href: string;
  children: string;
  className?: string;
}>) {
  return (
    <a
      className={cn(
        "text-sm text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
      href={href}
    >
      {children}
    </a>
  );
}

function LanguageToggle({
  locale,
  messages,
  segment,
}: Readonly<{
  locale: MarketingLocale;
  messages: MarketingMessages;
  segment: MarketingPageSegment;
}>) {
  const targetEn = marketingHref("en", segment);
  const targetEs = marketingHref("es", segment);

  return (
    <div
      aria-label={messages.header.langSwitcherAria}
      className="flex items-center rounded-full border border-border/50 bg-muted/40 p-0.5"
      role="group"
    >
      <Link
        aria-current={locale === "en" ? "true" : undefined}
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
          locale === "en"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        href={targetEn}
        lang="en"
      >
        {messages.header.langEn}
      </Link>
      <Link
        aria-current={locale === "es" ? "true" : undefined}
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
          locale === "es"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        href={targetEs}
        lang="es"
      >
        {messages.header.langEs}
      </Link>
    </div>
  );
}

export function SiteHeader({
  locale,
  messages,
  segment,
}: Readonly<{
  locale: MarketingLocale;
  messages: MarketingMessages;
  segment: MarketingPageSegment;
}>) {
  const homePath = marketingHref(locale, "home");
  const howHref = segment === "home" ? "#how-it-works" : `${homePath}#how-it-works`;
  const builtHref = segment === "home" ? "#built-for" : `${homePath}#built-for`;

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-6">
        <Link className="flex shrink-0 items-center gap-2 font-semibold text-lg tracking-tight" href={homePath}>
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500"
          />
          Zumo
        </Link>

        <div className="flex items-center gap-2 md:gap-3">
          <LanguageToggle locale={locale} messages={messages} segment={segment} />

          <nav
            aria-label={messages.header.navAriaLabel}
            className="hidden items-center gap-8 md:flex"
          >
            <NavAnchor href={howHref}>{messages.header.navHowItWorks}</NavAnchor>
            <NavAnchor href={builtHref}>{messages.header.navBuiltFor}</NavAnchor>
            <Button asChild size="sm">
              <Link href="/login">{messages.header.requestAccess}</Link>
            </Button>
          </nav>

          <div className="md:hidden">
            <Button asChild size="sm">
              <Link href="/login">{messages.header.requestAccess}</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
