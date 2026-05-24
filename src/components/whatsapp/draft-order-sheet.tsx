"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MatchCoverageIndicator } from "@/components/workspace/match-coverage-indicator";
import { OrderLifecycleActions } from "@/components/workspace/order-lifecycle-actions";
import type { Conversation, Order } from "@/lib/dashboard-types";
import { parseMatchCoverage } from "@/lib/match-coverage";
import { formatOrderDisplayCode } from "@/lib/order-display-code";

import {
  conversationPocName,
  formatAiConfidencePct,
  formatOrderCreatedDateTime,
} from "./whatsapp-helpers";

export type DraftOrderSheetVariant = "active" | "blocked";

function statusBadgeLabel(status: string): string {
  switch (status) {
    case "draft":
      return "borrador";
    case "pending":
      return "pendiente";
    case "confirmed":
      return "confirmado";
    default:
      return status.replaceAll("_", " ");
  }
}

function DraftOrderSheetContent({
  order,
  conversation,
  onOpenChange,
  variant,
  confirmDisabledTitle,
  onAfterChange,
  onOrderRemoved,
}: Readonly<{
  order: Order;
  conversation: Conversation | null;
  onOpenChange: (open: boolean) => void;
  variant: DraftOrderSheetVariant;
  confirmDisabledTitle?: string;
  onAfterChange?: () => void;
  onOrderRemoved?: (orderId: string) => void;
}>) {
  const blocked = variant === "blocked";
  const [localStatus, setLocalStatus] = useState(order.status);
  const [localDisplayCode, setLocalDisplayCode] = useState(order.displayCode ?? null);

  const pocName = conversation ? conversationPocName(conversation) : "Contacto";
  const confidence = formatAiConfidencePct(order);
  const code = formatOrderDisplayCode(order.orderId, localDisplayCode);
  const showActions = localStatus === "draft" || localStatus === "pending";

  return (
    <>
      <SheetHeader className="shrink-0 space-y-2 border-b px-6 py-4 pr-12 text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <SheetTitle className="font-mono text-base">{code}</SheetTitle>
          <Badge variant="outline">{statusBadgeLabel(localStatus)}</Badge>
        </div>
        <SheetDescription className="text-left">
          {pocName} · {formatOrderCreatedDateTime(order.createdAt)}
        </SheetDescription>
        <MatchCoverageIndicator
          className="text-left"
          lineCount={order.lines?.length ?? 0}
          matchCoverage={parseMatchCoverage(order.matchCoverage)}
          isTouchless={Boolean(order.isTouchless)}
          size="md"
        />
        {confidence ? (
          <p className="text-left text-muted-foreground text-xs">{confidence}</p>
        ) : null}
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <ul className="space-y-1.5">
          {(order.lines ?? []).map((line, i) => (
            <li
              className="flex flex-wrap items-baseline gap-x-1 text-sm"
              key={`${order.orderId}-${i}`}
            >
              <span className="font-semibold tabular-nums">{line.quantity}</span>
              <span className="text-muted-foreground">{line.unit}</span>
              <span>{line.productName}</span>
            </li>
          ))}
          {!order.lines || order.lines.length === 0 ? (
            <li className="text-muted-foreground text-sm">Sin líneas.</li>
          ) : null}
        </ul>
        {order.deliveryNotes ? (
          <p className="mt-4 rounded-md border bg-muted/30 px-3 py-2 text-muted-foreground text-xs leading-relaxed">
            <span className="font-medium text-foreground">Nota:</span> {order.deliveryNotes}
          </p>
        ) : null}
      </div>

      {showActions ? (
        <div className="shrink-0 border-t bg-muted/10 px-6 py-4">
          <OrderLifecycleActions
            blocked={blocked}
            blockedTitle={confirmDisabledTitle}
            orderId={order.orderId}
            status={localStatus}
            onDone={() => onOpenChange(false)}
            onRemoved={(id) => {
              onOrderRemoved?.(id);
              onAfterChange?.();
              onOpenChange(false);
            }}
            onStatusChange={(_id, status, patch) => {
              setLocalStatus(status);
              if (patch?.displayCode) setLocalDisplayCode(patch.displayCode);
              onAfterChange?.();
            }}
          />
        </div>
      ) : null}
    </>
  );
}

export function DraftOrderSheet({
  order,
  conversation,
  open,
  onOpenChange,
  variant,
  confirmDisabledTitle,
  onAfterChange,
  onOrderRemoved,
}: Readonly<{
  order: Order | null;
  conversation: Conversation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: DraftOrderSheetVariant;
  confirmDisabledTitle?: string;
  onAfterChange?: () => void;
  onOrderRemoved?: (orderId: string) => void;
}>) {
  if (!order) return null;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg">
        <DraftOrderSheetContent
          key={order.orderId}
          confirmDisabledTitle={confirmDisabledTitle}
          conversation={conversation}
          order={order}
          variant={variant}
          onAfterChange={onAfterChange}
          onOpenChange={onOpenChange}
          onOrderRemoved={onOrderRemoved}
        />
      </SheetContent>
    </Sheet>
  );
}
