"use client";

import { AlertTriangle, Clock, Eye, PackageCheck, User } from "lucide-react";
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

export function InboxCard({
  card,
  onOpenOrder,
  onOpenError,
}: Readonly<{
  card: InboxCardData;
  onOpenOrder?: (card: InboxCardData) => void;
  onOpenError?: (card: InboxCardData) => void;
}>) {
  const title = card.isUnknownCustomer
    ? card.customerPhone || "Contacto sin registrar"
    : card.customerName;
  const isError = card.column === "errors";
  const isDraftOrder = card.orderStatus === "draft";
  const wasViewed = isDraftOrder && Boolean(card.orderSeenAt);
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-medium text-foreground text-sm",
              isDraftOrder && !wasViewed && "font-semibold",
            )}
          >
            {title}
          </p>
          {card.contactName ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-muted-foreground text-xs">
              <User aria-hidden className="size-3 shrink-0" />
              {card.contactName}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {wasViewed ? (
            <span
              aria-label="Borrador visto"
              className="inline-flex items-center text-muted-foreground"
              title="Borrador visto"
            >
              <Eye aria-hidden className="size-3.5" />
            </span>
          ) : null}
          <Badge variant={isError ? "destructive" : "secondary"}>
            {isError && card.hasAiFailure ? (
              <>
                <AlertTriangle aria-hidden className="size-3" /> Reclamo
              </>
            ) : isDraftOrder ? (
              <>
                <PackageCheck aria-hidden className="size-3" /> Borrador
              </>
            ) : (
              intentLabel(card.latestIntent)
            )}
          </Badge>
        </div>
      </div>

      {isError && card.errorTitle ? (
        <p className="mt-2 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
          {card.errorTitle}
        </p>
      ) : card.summary ? (
        <p className="mt-2 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
          {card.summary}
        </p>
      ) : card.orderLineCount != null ? (
        <p className="mt-2 text-muted-foreground text-xs">
          {card.orderLineCount} {card.orderLineCount === 1 ? "producto" : "productos"} en borrador
        </p>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-2">
        {isError && card.errorDisplayCode ? (
          <Badge variant="outline">{card.errorDisplayCode}</Badge>
        ) : card.orderDisplayCode || card.orderId ? (
          <Badge variant="outline">{card.orderDisplayCode ?? card.orderId}</Badge>
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
    </>
  );

  const className = cn(
    "block w-full rounded-lg border bg-card px-3 py-2.5 text-left shadow-sm transition-colors",
    "hover:border-primary/40 hover:bg-accent/40",
    isError ? "border-destructive/40" : "border-border/60",
  );

  if (card.orderId && onOpenOrder) {
    return (
      <button
        className={className}
        type="button"
        onClick={() => onOpenOrder(card)}
      >
        {content}
      </button>
    );
  }

  if (card.errorId && onOpenError) {
    return (
      <button
        className={className}
        type="button"
        onClick={() => onOpenError(card)}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      className={className}
      href={inboxCardHref(card)}
    >
      {content}
    </Link>
  );
}
