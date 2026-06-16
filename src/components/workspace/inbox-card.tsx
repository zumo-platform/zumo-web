"use client";

import { AlertTriangle, Clock, User } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  intentLabel,
  type InboxCard as InboxCardData,
} from "@/lib/dashboard-inbox";
import { inboxCardHref } from "@/lib/inbox-columns";
import { cn } from "@/lib/utils";

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InboxCard({ card }: Readonly<{ card: InboxCardData }>) {
  const title = card.isUnknownCustomer
    ? card.customerPhone || "Contacto sin registrar"
    : card.customerName;
  const isError = card.column === "errors";

  return (
    <Link
      className={cn(
        "block rounded-lg border bg-card px-3 py-2.5 shadow-sm transition-colors",
        "hover:border-primary/40 hover:bg-accent/40",
        isError ? "border-destructive/40" : "border-border/60",
      )}
      href={inboxCardHref(card)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground text-sm">{title}</p>
          {card.contactName ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-muted-foreground text-xs">
              <User aria-hidden className="size-3 shrink-0" />
              {card.contactName}
            </p>
          ) : null}
        </div>
        <Badge variant={isError ? "destructive" : "secondary"}>
          {isError && card.hasAiFailure ? (
            <>
              <AlertTriangle aria-hidden className="size-3" /> Error
            </>
          ) : (
            intentLabel(card.latestIntent)
          )}
        </Badge>
      </div>

      {card.summary ? (
        <p className="mt-2 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
          {card.summary}
        </p>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-2">
        {card.orderDisplayCode ? (
          <Badge variant="outline">{card.orderDisplayCode}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">{card.customerPhone}</span>
        )}
        {card.lastMessageAt ? (
          <span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
            <Clock aria-hidden className="size-3" />
            {formatWhen(card.lastMessageAt)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
