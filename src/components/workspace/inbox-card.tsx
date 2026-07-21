"use client";

import type { KeyboardEvent } from "react";

import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Mail,
  MessageCircle,
  PackageCheck,
  User,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  intentLabel,
  inboxCardIsUnseenForSeller,
  type InboxCard as InboxCardData,
} from "@/lib/dashboard-inbox";
import { inboxCardHref } from "@/lib/inbox-columns";
import { parseInstantIso } from "@/lib/supplier-timezone";
import { cn } from "@/lib/utils";
import { useWorkspacePreferences } from "@/lib/workspace-preferences-context";

function formatWhen(iso: string | null, timeZone: string): string {
  if (!iso) return "";
  const d = parseInstantIso(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(d);
}

function AssociatedOrderChip({
  card,
  onOpenOrder,
}: Readonly<{
  card: InboxCardData;
  onOpenOrder?: (card: InboxCardData) => void;
}>) {
  const label = card.orderDisplayCode ?? card.orderId;
  if (!label) return null;

  if (!onOpenOrder || !card.orderId) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground text-xs">
        <FileText aria-hidden className="size-3 shrink-0" />
        <span className="truncate">Pedido {label}</span>
      </span>
    );
  }

  return (
    <button
      className={cn(
        "group/order inline-flex min-w-0 items-center gap-1 rounded-full px-1.5 py-0.5",
        "text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-foreground",
      )}
      title={`Abrir pedido ${label}`}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpenOrder(card);
      }}
    >
      <FileText aria-hidden className="size-3 shrink-0" />
      <span className="truncate">Pedido {label}</span>
      <ExternalLink
        aria-hidden
        className="size-3 shrink-0 opacity-0 transition-opacity group-hover/order:opacity-100 group-focus-visible/order:opacity-100"
      />
    </button>
  );
}

export function InboxCard({
  card,
  onOpenOrder,
  onOpenError,
  onOpenEmail,
}: Readonly<{
  card: InboxCardData;
  onOpenOrder?: (card: InboxCardData) => void;
  onOpenError?: (card: InboxCardData) => void;
  onOpenEmail?: (card: InboxCardData) => void;
}>) {
  const { timeZone, sellerId } = useWorkspacePreferences();
  const isEmail = card.channel === "email";
  const title = isEmail
    ? card.subject?.trim() || card.customerName || "Correo sin asunto"
    : card.isUnknownCustomer
      ? card.customerPhone || "Contacto sin registrar"
      : card.customerName;
  const isError = card.column === "errors";
  const isDraftOrder = card.orderStatus === "draft";
  const isUnseen =
    isDraftOrder && inboxCardIsUnseenForSeller(card, sellerId);
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-medium text-foreground text-sm",
              isDraftOrder && isUnseen && "font-semibold",
            )}
          >
            {title}
          </p>
          {isEmail && card.senderEmail ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-muted-foreground text-xs">
              <Mail aria-hidden className="size-3 shrink-0" />
              {card.senderEmail}
            </p>
          ) : card.contactName ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-muted-foreground text-xs">
              <User aria-hidden className="size-3 shrink-0" />
              {card.contactName}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge
            className={cn(
              "gap-1 border-transparent font-normal",
              isEmail
                ? "bg-sky-100 text-sky-800 hover:bg-sky-100"
                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
            )}
            variant="secondary"
          >
            {isEmail ? (
              <>
                <Mail aria-hidden className="size-3" /> Correo
              </>
            ) : (
              <>
                <MessageCircle aria-hidden className="size-3" /> WhatsApp
              </>
            )}
          </Badge>
          {isDraftOrder && !isUnseen ? (
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
        <div className="flex min-w-0 items-center gap-1.5">
          {isError && card.errorDisplayCode ? (
            <Badge className="shrink-0" variant="outline">{card.errorDisplayCode}</Badge>
          ) : card.orderDisplayCode || card.orderId ? (
            <Badge className="shrink-0" variant="outline">{card.orderDisplayCode ?? card.orderId}</Badge>
          ) : !isEmail ? (
            <span className="truncate text-muted-foreground text-xs">{card.customerPhone}</span>
          ) : null}
          {isError ? (
            <AssociatedOrderChip card={card} onOpenOrder={onOpenOrder} />
          ) : null}
        </div>
        {card.lastMessageAt ? (
          <span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
            <Clock aria-hidden className="size-3" />
            {formatWhen(card.lastMessageAt, timeZone)}
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

  if (isError && card.errorId && onOpenError) {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onOpenError(card);
    };

    return (
      <div
        className={cn(className, "cursor-pointer")}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => onOpenError(card)}
      >
        {content}
      </div>
    );
  }

  if (isEmail && onOpenEmail) {
    return (
      <button className={className} type="button" onClick={() => onOpenEmail(card)}>
        {content}
      </button>
    );
  }

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

  return (
    <Link
      className={className}
      href={inboxCardHref(card)}
    >
      {content}
    </Link>
  );
}
