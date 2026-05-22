import { useEffect, useRef } from "react";

import type { LucideIcon } from "lucide-react";
import { Loader2, MessageSquare } from "lucide-react";

import type { Message } from "@/lib/dashboard-types";

import { MessageBubble } from "./message-bubble";
import { buildMessageThreadItems } from "./whatsapp-helpers";
import { WhatsappScrollPane } from "./whatsapp-scroll-pane";

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

function ThreadEmpty({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6">{children}</div>
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
  const scrollPaneRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    const last = messages.at(-1);
    const lastId = last?.messageId ?? null;
    const convChanged = conversationId !== lastConversationIdRef.current;
    const newMessage = lastId !== null && lastId !== lastMessageIdRef.current;

    if (convChanged || newMessage) {
      const pane = scrollPaneRef.current;
      if (pane) {
        pane.scrollTop = pane.scrollHeight;
      } else {
        bottomRef.current?.scrollIntoView({ behavior: convChanged ? "auto" : "smooth" });
      }
    }

    lastMessageIdRef.current = lastId;
    lastConversationIdRef.current = conversationId;
  }, [messages, conversationId]);

  const items = buildMessageThreadItems(messages);
  const showInitialLoader = loading && messages.length === 0;

  if (!conversationId) {
    return (
      <ThreadEmpty>
        <EmptyState
          description="Elegí un hilo de la lista para leer los mensajes."
          icon={MessageSquare}
          title="Seleccioná una conversación"
        />
      </ThreadEmpty>
    );
  }

  if (showInitialLoader) {
    return (
      <ThreadEmpty>
        <Loader2 aria-hidden className="size-6 animate-spin text-muted-foreground" />
      </ThreadEmpty>
    );
  }

  if (messages.length === 0) {
    return (
      <ThreadEmpty>
        <EmptyState
          description="Cuando el cliente escriba, los mensajes van a aparecer acá."
          icon={MessageSquare}
          title="Sin mensajes todavía"
        />
      </ThreadEmpty>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {loading ? (
        <div
          aria-hidden
          className="pointer-events-none absolute top-3 right-4 z-10 flex items-center gap-1.5 rounded-md bg-background/90 px-2 py-1 text-muted-foreground text-xs shadow-sm"
        >
          <Loader2 className="size-3.5 animate-spin" />
          Actualizando…
        </div>
      ) : null}
      <WhatsappScrollPane ref={scrollPaneRef}>
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
      </WhatsappScrollPane>
    </div>
  );
}
