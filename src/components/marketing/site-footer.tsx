import Link from "next/link";

import type { MarketingMessages } from "@/content/marketing/types";
import type { MarketingLocale } from "@/lib/marketing-locale";
import { marketingHref } from "@/lib/marketing-locale";

export function SiteFooter({
  locale,
  messages,
}: Readonly<{
  locale: MarketingLocale;
  messages: MarketingMessages;
}>) {
  const privacyHref = marketingHref(locale, "privacy");
  const termsHref = marketingHref(locale, "terms");

  return (
    <footer className="mt-24 border-t border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <p className="font-semibold text-lg tracking-tight">Zumo</p>
            <p className="mt-2 text-muted-foreground text-sm">{messages.footer.tagline}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              {messages.footer.legalHeading}
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                  href={privacyHref}
                >
                  {messages.footer.privacy}
                </Link>
              </li>
              <li>
                <Link
                  className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                  href={termsHref}
                >
                  {messages.footer.terms}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              {messages.footer.contactHeading}
            </p>
            <p className="mt-3">
              <a
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="mailto:hello@zumob2b.com"
              >
                hello@zumob2b.com
              </a>
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-border/40 pt-6 text-muted-foreground text-xs">
          {messages.footer.rights}
        </div>
      </div>
    </footer>
  );
}
