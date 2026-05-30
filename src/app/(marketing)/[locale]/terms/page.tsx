import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalPageLayout } from "@/components/marketing/legal-page-layout";
import { termsDocument } from "@/content/marketing/legal";
import { isMarketingLocale } from "@/lib/marketing-locale";

type PageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;

  if (!isMarketingLocale(raw)) {
    return {};
  }

  const doc = termsDocument[raw];

  return {
    title: doc.metaTitle,
    description: doc.metaDescription,
  };
}

export default async function TermsPage({ params }: PageProps) {
  const { locale: raw } = await params;

  if (!isMarketingLocale(raw)) {
    notFound();
  }

  const doc = termsDocument[raw];

  return (
    <div suppressHydrationWarning>
      <LegalPageLayout document={doc} locale={raw} />
    </div>
  );
}
