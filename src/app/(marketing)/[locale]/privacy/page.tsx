import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalDocumentView } from "@/components/marketing/legal-document-view";
import { TypographyH1 } from "@/components/typography/typography-h1";
import { privacyDocument } from "@/content/marketing/legal";
import { isMarketingLocale } from "@/lib/marketing-locale";

type PageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;

  if (!isMarketingLocale(raw)) {
    return {};
  }

  const doc = privacyDocument[raw];

  return {
    title: doc.metaTitle,
    description: doc.metaDescription,
  };
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale: raw } = await params;

  if (!isMarketingLocale(raw)) {
    notFound();
  }

  const doc = privacyDocument[raw];

  return (
    <article suppressHydrationWarning className="mx-auto max-w-3xl space-y-6 px-6 py-20">
      <TypographyH1>{doc.title}</TypographyH1>
      <LegalDocumentView document={doc} />
    </article>
  );
}
