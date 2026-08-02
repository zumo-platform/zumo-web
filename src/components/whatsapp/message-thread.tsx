"use client";

import { useEffect, useRef } from "react";

import type { LucideIcon } from "lucide-react";
import { MessageSquare } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { Message } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";
import { useWorkspacePreferences } from "@/lib/workspace-preferences-context";

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

const CHAT_BG = "#F1F5F9";

const THREAD_SKELETON_BUBBLES: ReadonlyArray<{
  align: "start" | "end";
  bodyClass: string;
}> = [
  { align: "start", bodyClass: "h-[4.5rem] w-52" },
  { align: "end", bodyClass: "h-14 w-44" },
  { align: "end", bodyClass: "h-20 w-56" },
  { align: "start", bodyClass: "h-14 w-40" },
  { align: "end", bodyClass: "h-[4.5rem] w-48" },
  { align: "end", bodyClass: "h-16 w-36" },
  { align: "start", bodyClass: "h-12 w-44" },
  { align: "end", bodyClass: "h-14 w-52" },
];

function MessageThreadSkeleton() {
  return (
    <div
      aria-label="Cargando mensajes"
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      role="status"
      style={{ backgroundColor: CHAT_BG }}
    >
      <span className="sr-only">Cargando mensajes…</span>
      <WhatsappScrollPane className="bg-[#F1F5F9]">
        <div className="flex flex-col gap-2 px-4 py-4">
          {THREAD_SKELETON_BUBBLES.map((bubble, index) => (
            <div
              className={cn(
                "flex max-w-[min(75%,28rem)] flex-col gap-1",
                bubble.align === "start" ? "self-start" : "self-end",
              )}
              key={index}
            >
              <Skeleton
                aria-hidden
                className={cn(
                  "rounded-2xl motion-reduce:animate-none",
                  bubble.bodyClass,
                  bubble.align === "end" ? "bg-primary/15" : "bg-muted",
                )}
              />
              <Skeleton
                aria-hidden
                className="h-3 w-9 self-end rounded-md motion-reduce:animate-none"
              />
            </div>
          ))}
        </div>
      </WhatsappScrollPane>
    </div>
  );
}

function ThreadEmpty({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6"
      style={{ backgroundColor: CHAT_BG }}
    >
      {children}
    </div>
  );
}

export function MessageThread({
  conversationId,
  messages,
  loading,
  awaitingAiReply = false,
}: Readonly<{
  conversationId: string | null;
  messages: Message[];
  loading: boolean;
  awaitingAiReply?: boolean;
}>) {
  const { timeZone } = useWorkspacePreferences();
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

  const items = buildMessageThreadItems(messages, timeZone);
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
    return <MessageThreadSkeleton />;
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
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: CHAT_BG }}
    >
      <WhatsappScrollPane ref={scrollPaneRef} className="bg-[#F1F5F9]">
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
          {awaitingAiReply ? (
            <div
              aria-label="El asistente está escribiendo"
              className="flex max-w-[min(75%,28rem)] items-center gap-1 rounded-2xl bg-[#334155] px-3 py-2.5 text-sm shadow-sm"
            >
              <span className="size-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:300ms]" />
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </WhatsappScrollPane>
    </div>
  );
}
