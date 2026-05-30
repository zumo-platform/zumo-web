import type { ReactNode } from "react";

import { TypographyH2 } from "@/components/typography/typography-h2";
import { TypographyH3 } from "@/components/typography/typography-h3";
import { TypographyP } from "@/components/typography/typography-p";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LegalBlock, LegalDocument } from "@/content/marketing/types";
import { cn } from "@/lib/utils";

import { LegalRichText } from "./legal-rich-text";

export function LegalDocumentView({
  document,
}: Readonly<{
  document: LegalDocument;
}>) {
  return (
    <article className="space-y-14 pt-12">
      {document.sections.map((section) => (
        <section className="scroll-mt-24 space-y-4" id={section.id} key={section.id}>
          <TypographyH2 className="border-t border-foreground/15 pb-0 pt-5 font-semibold text-2xl">
            {section.heading}
          </TypographyH2>
          {section.blocks.map((block, index) =>
            renderLegalBlock(block, `${section.id}-${index}`),
          )}
        </section>
      ))}
    </article>
  );
}

function renderLegalBlock(block: LegalBlock, blockKey: string): ReactNode {
  if (block.kind === "h3") {
    return (
      <TypographyH3 className="mt-6 mb-2 font-medium text-base" key={blockKey}>
        {block.text}
      </TypographyH3>
    );
  }

  if (block.kind === "ul" || block.kind === "ol") {
    const ListTag = block.kind === "ol" ? "ol" : "ul";
    return (
      <ListTag
        className={cn(
          "my-0 ml-6 text-muted-foreground [&>li]:mt-2",
          block.kind === "ol" ? "list-decimal" : "list-disc",
        )}
        key={blockKey}
      >
        {block.items.map((item) => (
          <li key={item}>
            <LegalRichText text={item} />
          </li>
        ))}
      </ListTag>
    );
  }

  if (block.kind === "callout") {
    const isWarning = block.variant === "warning";
    return (
      <div
        className={cn(
          "rounded-md border-l-[3px] px-5 py-4 text-sm leading-relaxed",
          isWarning
            ? "border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-50"
            : "border-primary bg-primary/5 text-foreground",
        )}
        key={blockKey}
      >
        {block.title ? (
          <p className="mb-1 font-medium">
            <LegalRichText text={block.title} />
          </p>
        ) : null}
        <p className={block.title ? "text-muted-foreground" : undefined}>
          <LegalRichText text={block.text} />
        </p>
      </div>
    );
  }

  if (block.kind === "table") {
    return (
      <div className="overflow-x-auto rounded-md border border-border/60" key={blockKey}>
        <Table>
          <TableHeader>
            <TableRow>
              {block.headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.rows.map((row) => (
              <TableRow key={row.join("|")}>
                {row.map((cell) => (
                  <TableCell key={cell}>
                    <LegalRichText text={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <TypographyP className="text-muted-foreground" key={blockKey}>
      <LegalRichText text={block.text} />
    </TypographyP>
  );
}
