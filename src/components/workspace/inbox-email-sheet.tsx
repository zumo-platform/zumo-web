"use client";

import { useEffect, useState } from "react";

import {
  Clock,
  FileText,
  Mail,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchEmailConversation,
  SENDER_TRUST_LABELS,
  type EmailConversationDetail,
  type InboxCard as InboxCardData,
  type SenderTrust,
} from "@/lib/dashboard-inbox";
import { parseInstantIso } from "@/lib/supplier-timezone";
import { useWorkspacePreferences } from "@/lib/workspace-preferences-context";

function formatWhen(iso: string | null, tz: string): string {
  if (!iso) return "";
  const d = parseInstantIso(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(d);
}

function TrustBadge({ trust }: Readonly<{ trust: SenderTrust | null }>) {
  if (trust === "official") {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        <ShieldCheck aria-hidden className="size-3" />
        {SENDER_TRUST_LABELS.official}
      </Badge>
    );
  }
  if (trust === "known_contact") {
    return (
      <Badge className="gap-1" variant="secondary">
        <ShieldQuestion aria-hidden className="size-3" />
        {SENDER_TRUST_LABELS.known_contact}
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 border-amber-300 text-amber-700" variant="outline">
      <ShieldAlert aria-hidden className="size-3" />
      {SENDER_TRUST_LABELS.unknown}
    </Badge>
  );
}

export function InboxEmailSheet({
  card,
  open,
  onOpenChange,
  onOpenOrder,
}: Readonly<{
  card: InboxCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenOrder?: (card: InboxCardData) => void;
}>) {
  const { timeZone } = useWorkspacePreferences();
  const [detail, setDetail] = useState<EmailConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !card) return;
    let alive = true;
    setLoading(true);
    setDetail(null);
    void fetchEmailConversation(card.conversationId, {
      customerName: card.customerName,
      contactName: card.contactName,
      subject: card.subject,
      senderEmail: card.senderEmail,
      senderTrust: card.senderTrust,
    }).then((d) => {
      if (alive) {
        setDetail(d);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [open, card]);

  const subject = detail?.subject ?? card?.subject ?? "Correo sin asunto";
  const sender = detail?.senderEmail ?? card?.senderEmail ?? "";
  const trust = detail?.senderTrust ?? card?.senderTrust ?? "unknown";
  const original =
    detail?.messages.find((m) => m.role === "customer") ?? detail?.messages[0] ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-xl">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="pr-8 text-lg leading-snug">{subject}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <User aria-hidden className="size-4" />
                    Cliente
                  </dt>
                  <dd className="truncate font-medium">
                    {detail?.customerName ||
                      card?.customerName ||
                      detail?.contactName ||
                      card?.contactName ||
                      sender ||
                      "—"}
                  </dd>
                </div>
                {sender ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Mail aria-hidden className="size-4" />
                      De
                    </dt>
                    <dd className="truncate font-mono text-muted-foreground text-xs">{sender}</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Mail aria-hidden className="size-4" />
                    Para
                  </dt>
                  <dd className="truncate text-muted-foreground">Pedidos ZUMO</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Clock aria-hidden className="size-4" />
                    Fecha
                  </dt>
                  <dd className="text-muted-foreground">
                    {formatWhen(original?.createdAt ?? card?.lastMessageAt ?? null, timeZone) ||
                      "—"}
                  </dd>
                </div>
                <div className="pt-1">
                  <TrustBadge trust={trust} />
                </div>
              </dl>

              {card?.summary ? (
                <div className="mt-4 rounded-lg border bg-muted/40 p-3">
                  <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Resumen IA
                  </p>
                  <p className="text-sm leading-relaxed">{card.summary}</p>
                </div>
              ) : null}

              {card?.orderId && onOpenOrder ? (
                <button
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenOrder(card);
                  }}
                >
                  <FileText aria-hidden className="size-3.5" />
                  Ver pedido {card.orderDisplayCode ?? card.orderId}
                </button>
              ) : null}

              <div className="mt-4">
                <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Correo original
                </p>
                <div className="whitespace-pre-wrap rounded-lg border bg-card p-3 text-sm leading-relaxed">
                  {original?.content?.trim() || "Sin contenido"}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
