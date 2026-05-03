import { Fragment, type ReactNode } from "react";

import { TypographyH2 } from "@/components/typography/typography-h2";
import { TypographyList } from "@/components/typography/typography-list";
import { TypographyMuted } from "@/components/typography/typography-muted";
import { TypographyP } from "@/components/typography/typography-p";
import type { LegalBlock, LegalDocument } from "@/content/marketing/types";

const EMAIL = "hello@zumob2b.com";

function LegalParagraph({ text }: Readonly<{ text: string }>) {
  const parts = text.split(EMAIL);

  if (parts.length === 1) {
    return <TypographyP className="text-muted-foreground">{text}</TypographyP>;
  }

  return (
    <TypographyP className="text-muted-foreground">
      {parts.map((part, index) => (
        <Fragment key={`email-split-${index}`}>
          {part}
          {index < parts.length - 1 ? (
            <a
              className="text-foreground underline underline-offset-4"
              href={`mailto:${EMAIL}`}
            >
              {EMAIL}
            </a>
          ) : null}
        </Fragment>
      ))}
    </TypographyP>
  );
}

export function LegalDocumentView({
  document,
}: Readonly<{
  document: LegalDocument;
}>) {
  return (
    <div className="space-y-6">
      <TypographyMuted>{document.updatedLabel}</TypographyMuted>

      {document.sections.map((section) => (
        <section className="space-y-4" key={section.heading}>
          <TypographyH2 className="border-0 pb-0 text-2xl">{section.heading}</TypographyH2>
          {section.blocks.map((block, index) =>
            renderLegalBlock(block, `${section.heading}-${index}`),
          )}
        </section>
      ))}
    </div>
  );
}

function renderLegalBlock(block: LegalBlock, blockKey: string): ReactNode {
  if (block.kind === "ul") {
    return (
      <TypographyList
        className="my-0 ml-6 mt-2 text-muted-foreground [&>li]:mt-2"
        key={blockKey}
      >
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </TypographyList>
    );
  }

  return <LegalParagraph key={blockKey} text={block.text} />;
}
