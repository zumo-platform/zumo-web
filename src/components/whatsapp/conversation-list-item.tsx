import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

import { conversationListTimeLabel, isUnknownConversationCustomer } from "./whatsapp-helpers";

export function ConversationListItem({
  conversation,
  selectedId,
  onSelect,
}: Readonly<{
  conversation: Conversation;
  selectedId: string | null;
  onSelect: (id: string) => void;
}>) {
  const conv = conversation;
  const timeLabel = conversationListTimeLabel(conv.lastMessageAt ?? conv.createdAt ?? null);
  const unknown = isUnknownConversationCustomer(conv);
  const phone = conv.customerPhone.trim();
  const titlePrimary = unknown
    ? phone.length > 0
      ? phone
      : "Sin número"
    : conv.customerName.trim() ||
      (conv.customerId != null ? `Cliente #${String(conv.customerId)}` : "Cliente");

  return (
    <li>
      <Button
        className={cn(
          "h-auto min-h-[3rem] w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left font-normal transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selectedId === conv.conversationId && "bg-accent text-accent-foreground shadow-sm",
        )}
        variant="ghost"
        type="button"
        onClick={() => onSelect(conv.conversationId)}
      >
        <div className="flex w-full min-w-0 items-start gap-2">
          <span className="min-w-0 flex-1 text-left leading-tight">
            <span className="flex min-w-0 flex-wrap items-center gap-1">
              <span className="block truncate font-medium text-sm" title={titlePrimary}>
                {titlePrimary}
              </span>
              {unknown ? (
                <Badge className="shrink-0 text-[10px] font-normal capitalize" variant="outline">
                  Sin registrar
                </Badge>
              ) : null}
            </span>
            <span className="mt-1 flex min-w-0 items-center justify-between gap-2">
              <Badge
                className="max-w-[min(100%,10rem)] shrink truncate font-normal capitalize"
                title={conv.status}
                variant="outline"
              >
                {conv.status === "active" ? "activa" : conv.status.replaceAll("_", " ")}
              </Badge>
              <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{timeLabel}</span>
            </span>
          </span>
        </div>
      </Button>
    </li>
  );
}
