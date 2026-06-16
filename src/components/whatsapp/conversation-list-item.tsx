"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";
import { useWorkspacePreferences } from "@/lib/workspace-preferences-context";

import { orderStatePill } from "./conversation-filters";
import { conversationListTimeLabel, isUnknownConversationCustomer } from "./whatsapp-helpers";

const PILL_TONE_CLASS: Record<string, string> = {
  review: "border-transparent bg-amber-100 text-amber-800",
  draft: "border-transparent bg-sky-100 text-sky-800",
  route: "border-transparent bg-indigo-100 text-indigo-800",
  rejected: "border-transparent bg-rose-100 text-rose-800",
};

export function ConversationListItem({
  conversation,
  selectedId,
  onSelect,
}: Readonly<{
  conversation: Conversation;
  selectedId: string | null;
  onSelect: (id: string) => void;
}>) {
  const { timeZone } = useWorkspacePreferences();
  const conv = conversation;
  const timeLabel = conversationListTimeLabel(conv.lastMessageAt ?? conv.createdAt ?? null, timeZone);
  const unknown = isUnknownConversationCustomer(conv);
  const phone = conv.customerPhone.trim();
  const titlePrimary = unknown
    ? phone.length > 0
      ? phone
      : "Sin número"
    : conv.customerName.trim() ||
      (conv.customerId != null ? `Cliente #${String(conv.customerId)}` : "Cliente");

  const pill = orderStatePill(conv.orderState);
  const isUnread = (conv.uiStatus ?? "sin_responder") === "sin_responder";
  const assignedName = conv.assignedSellerName?.trim() ?? "";

  return (
    <li>
      <Button
        className={cn(
          "h-auto min-h-[3rem] w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left font-normal transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selectedId === conv.conversationId && "bg-accent text-accent-foreground shadow-sm",
        )}
        onClick={() => onSelect(conv.conversationId)}
        type="button"
        variant="ghost"
      >
        <div className="flex w-full min-w-0 items-start gap-2">
          <span className="min-w-0 flex-1 text-left leading-tight">
            <span className="flex min-w-0 flex-wrap items-center gap-1">
              {isUnread ? (
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-emerald-500" />
              ) : null}
              <span
                className={cn("block truncate text-sm", isUnread ? "font-semibold" : "font-medium")}
                title={titlePrimary}
              >
                {titlePrimary}
              </span>
              {unknown ? (
                <Badge className="shrink-0 font-normal text-[10px] capitalize" variant="outline">
                  Sin registrar
                </Badge>
              ) : null}
            </span>

            {pill ? (
              <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
                <Badge
                  className={cn("font-normal text-[10px]", PILL_TONE_CLASS[pill.tone])}
                  variant="secondary"
                >
                  {pill.label}
                </Badge>
              </span>
            ) : null}

            <span className="mt-1 flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 truncate text-muted-foreground text-xs">
                {assignedName ? `Asignado: ${assignedName}` : "Sin asignar"}
              </span>
              <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{timeLabel}</span>
            </span>
          </span>
        </div>
      </Button>
    </li>
  );
}
