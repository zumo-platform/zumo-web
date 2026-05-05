import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthForms, type AuthTabValue } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";
import { getAuthMessages } from "@/content/auth/index";
import type { AuthMessages } from "@/content/auth/types";
import {
  authLoginPath,
  isMarketingLocale,
  marketingHref,
  MARKETING_LOCALES,
  type MarketingLocale,
} from "@/lib/marketing-locale";
import { cn } from "@/lib/utils";

type LoginPageProps = Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}>;

export function generateStaticParams(): Array<{ locale: MarketingLocale }> {
  return MARKETING_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LoginPageProps): Promise<Metadata> {
  const { locale: raw } = await params;

  if (!isMarketingLocale(raw)) {
    return {};
  }

  const messages = getAuthMessages(raw);

  return {
    title: messages.metaTitle,
    description: messages.metaDescription,
  };
}

function AuthLocaleToggle({
  locale,
  messages,
  tab,
}: Readonly<{
  locale: MarketingLocale;
  messages: AuthMessages;
  tab: AuthTabValue;
}>) {
  const signupOpts = tab === "signup" ? ({ tab: "signup" as const }) : undefined;

  return (
    <div
      aria-label={messages.langSwitcherAria}
      className="flex items-center rounded-full border border-border/50 bg-muted/40 p-0.5"
      role="group"
    >
      <Link
        aria-current={locale === "es" ? "true" : undefined}
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
          locale === "es"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        href={authLoginPath("es", signupOpts)}
        hrefLang="es"
        lang="es"
      >
        {messages.langEs}
      </Link>
      <Link
        aria-current={locale === "en" ? "true" : undefined}
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
          locale === "en"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        href={authLoginPath("en", signupOpts)}
        hrefLang="en"
        lang="en"
      >
        {messages.langEn}
      </Link>
    </div>
  );
}

export default async function LocalizedLoginPage({ params, searchParams }: LoginPageProps) {
  const { locale: raw } = await params;

  if (!isMarketingLocale(raw)) {
    notFound();
  }

  const locale = raw;
  const { tab } = await searchParams;
  const defaultTab: AuthTabValue = tab === "signup" ? "signup" : "signin";
  const messages = getAuthMessages(locale);
  const landingHref = marketingHref(locale, "home");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button className="-ml-2 gap-2 px-2" size="sm" variant="ghost" asChild>
            <Link href={landingHref}>
              <ArrowLeft aria-hidden className="size-4 shrink-0" />
              {messages.backToLanding}
            </Link>
          </Button>

          <AuthLocaleToggle locale={locale} messages={messages} tab={defaultTab} />
        </div>

        <div className="space-y-2 text-center">
          <Link className="font-semibold text-lg tracking-tight" href={landingHref}>
            Zumo
          </Link>
          <p className="text-muted-foreground text-sm">{messages.subtitle}</p>
        </div>

        <AuthForms
          defaultTab={defaultTab}
          key={`${locale}-${defaultTab}`}
          locale={locale}
          messages={messages}
        />
      </div>
    </main>
  );
}
