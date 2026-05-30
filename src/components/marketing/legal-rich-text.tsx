import { Fragment, type ReactNode } from "react";

import Link from "next/link";

import { cn } from "@/lib/utils";

const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+@zumob2b\.com)/;
const LINK_PATTERN = /^\[([^\]]+)\]\(([^)]+)\)/;
const BOLD_PATTERN = /^\*\*([^*]+)\*\*/;

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let index = 0;

  while (remaining.length > 0) {
    const linkMatch = remaining.match(LINK_PATTERN);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const isExternal = href.startsWith("http");
      nodes.push(
        isExternal ? (
          <a
            key={`${keyPrefix}-link-${index}`}
            className="text-primary underline underline-offset-4"
            href={href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {label}
          </a>
        ) : (
          <Link
            key={`${keyPrefix}-link-${index}`}
            className="text-primary underline underline-offset-4"
            href={href}
          >
            {label}
          </Link>
        ),
      );
      remaining = remaining.slice(linkMatch[0].length);
      index += 1;
      continue;
    }

    const boldMatch = remaining.match(BOLD_PATTERN);
    if (boldMatch) {
      nodes.push(
        <strong key={`${keyPrefix}-bold-${index}`} className="font-medium text-foreground">
          {boldMatch[1]}
        </strong>,
      );
      remaining = remaining.slice(boldMatch[0].length);
      index += 1;
      continue;
    }

    const emailMatch = remaining.match(EMAIL_PATTERN);
    if (emailMatch && emailMatch.index === 0) {
      const email = emailMatch[1];
      nodes.push(
        <a
          key={`${keyPrefix}-email-${index}`}
          className="text-primary underline underline-offset-4"
          href={`mailto:${email}`}
        >
          {email}
        </a>,
      );
      remaining = remaining.slice(email.length);
      index += 1;
      continue;
    }

    const nextSpecial = remaining.search(/\[|\*\*|[a-zA-Z0-9._%+-]+@zumob2b\.com/);
    const chunkEnd = nextSpecial === -1 ? remaining.length : nextSpecial;
    const chunk = remaining.slice(0, chunkEnd);
    if (chunk) {
      nodes.push(<Fragment key={`${keyPrefix}-text-${index}`}>{chunk}</Fragment>);
      index += 1;
    }
    remaining = remaining.slice(chunkEnd || 1);
    if (chunkEnd === 0 && remaining.length > 0) {
      nodes.push(<Fragment key={`${keyPrefix}-char-${index}`}>{remaining[0]}</Fragment>);
      remaining = remaining.slice(1);
      index += 1;
    }
  }

  return nodes;
}

export function LegalRichText({
  text,
  className,
}: Readonly<{
  text: string;
  className?: string;
}>) {
  return <span className={cn(className)}>{parseInline(text, "legal")}</span>;
}
