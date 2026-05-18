import { useEffect, useRef } from "react";

import type { LucideIcon } from "lucide-react";
import { Loader2, MessageSquare } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/lib/dashboard-types";

import { buildMessageThreadItems } from "./inbox-helpers";
import { MessageBubble } from "./message-bubble";

function EmptyState({
  icon: Icon,
  title,
  description,
}: Readonly<{
  icon: LucideIcon;
  title: string;
  description: string;
}>) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/10 p-8 text-center">
      <Icon aria-hidden className="size-8 text-muted-foreground opacity-50" />
      <p className="font-medium text-sm">{title}</p>
      <p className="max-w-[260px] text-muted-foreground text-xs leading-relaxed">{description}</p>
    </div>
  );
}

export function MessageThread({
  conversationId,
  messages,
  loading,
}: Readonly<{
  conversationId: string | null;
  messages: Message[];
  loading: boolean;
}>) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const items = buildMessageThreadItems(messages);

  if (!conversationId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          description="Elegí un hilo de la lista para leer los mensajes."
          icon={MessageSquare}
          title="Seleccioná una conversación"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 aria-hidden className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          description="Cuando el cliente escriba, los mensajes van a aparecer acá."
          icon={MessageSquare}
          title="Sin mensajes todavía"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 px-4 py-4">
          {items.map((item) =>
            item.kind === "divider" ? (
              <div className="flex items-center gap-3 py-2" key={item.key}>
                <div className="h-px flex-1 bg-border" />
                <span className="shrink-0 text-muted-foreground text-xs capitalize">{item.label}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            ) : (
              <MessageBubble key={item.message.messageId} message={item.message} />
            ),
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
