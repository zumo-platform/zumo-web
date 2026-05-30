import type { LegalDocument } from "@/content/marketing/types";
import type { MarketingLocale } from "@/lib/marketing-locale";

import { LegalDocumentView } from "./legal-document-view";
import { LegalTableOfContents } from "./legal-table-of-contents";

export function LegalPageLayout({
  document,
}: Readonly<{
  document: LegalDocument;
  locale: MarketingLocale;
}>) {
  return (
    <>
      <section className="border-b border-border/40 bg-foreground px-6 py-14 text-center text-background md:py-16">
        <p className="font-medium text-xs uppercase tracking-[0.2em] opacity-60">
          {document.label}
        </p>
        <h1 className="mt-3 text-balance font-semibold text-3xl tracking-tight md:text-4xl">
          {document.title}
        </h1>
        <p className="mt-4 text-sm opacity-70">
          {document.effectiveDate}
          <span aria-hidden className="mx-2">
            ·
          </span>
          {document.lastUpdated}
        </p>
      </section>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 pb-20 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
        <LegalTableOfContents sections={document.sections} title={document.tocTitle} />
        <LegalDocumentView document={document} />
      </div>
    </>
  );
}
