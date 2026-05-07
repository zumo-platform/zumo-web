"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LucideIcon } from "lucide-react";
import { CheckCircle, Info, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import type { Conversation, Message, Order } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

async function backendGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api/backend/${path}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function backendPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/backend/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function roleBubbleClass(role: Message["role"]): string {
  switch (role) {
    case "customer":
      return "self-start bg-muted text-foreground";
    case "assistant":
    case "seller":
      return "self-end bg-primary text-primary-foreground";
    default:
      return "self-center bg-muted/60 text-muted-foreground text-xs italic";
  }
}

function PanelHeading({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="border-b bg-muted/30 px-3 py-2.5">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {children}
      </p>
    </div>
  );
}

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
      <p className="max-w-[240px] text-muted-foreground text-xs leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Left panel ────────────────────────────────────────────────────────────

function ConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
}: {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3 p-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div className="space-y-2 rounded-lg border border-transparent px-2 py-2" key={i}>
            <Skeleton className="h-4 w-[85%]" />
            <div className="flex justify-between gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          description="Messages will appear here once customers write via WhatsApp."
          icon={MessageSquare}
          title="No conversations yet"
        />
      </div>
    );
  }

  return (
    <ul className="p-2">
      {conversations.map((conv) => (
        <li key={conv.conversationId}>
          <button
            className={cn(
              "flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedId === conv.conversationId && "bg-accent text-accent-foreground shadow-sm",
            )}
            type="button"
            onClick={() => onSelect(conv.conversationId)}
          >
            <span className="truncate font-medium text-sm">{conv.customerName || "Unknown"}</span>
            <span className="flex min-w-0 items-center justify-between gap-2">
              <Badge
                className="max-w-[min(100%,8rem)] shrink truncate font-normal capitalize"
                title={conv.status}
                variant="outline"
              >
                {conv.status}
              </Badge>
              <span className="shrink-0 text-muted-foreground text-xs">
                {formatTime(conv.updatedAt ?? conv.createdAt)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ─── Center panel ───────────────────────────────────────────────────────────

function MessageThread({
  conversationId,
  messages,
  loading,
}: {
  conversationId: string | null;
  messages: Message[];
  loading: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!conversationId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          description="Choose a thread from the list to read messages."
          icon={MessageSquare}
          title="Select a conversation"
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
          description="When the customer sends a message, it will show up here."
          icon={MessageSquare}
          title="No messages yet"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 px-4 py-4">
          {messages.map((msg) => (
            <div
              className={cn(
                "flex max-w-[min(75%,28rem)] flex-col rounded-2xl px-3 py-2 text-sm shadow-sm",
                roleBubbleClass(msg.role),
              )}
              key={msg.messageId}
            >
              <span>{msg.content}</span>
              <span className="mt-1 text-right text-xs opacity-70">{formatTime(msg.createdAt)}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Right panel (conversation information) ─────────────────────────────────

function InformationPanel({
  conversationId,
  orders,
  onConfirmed,
}: {
  conversationId: string | null;
  orders: Order[];
  onConfirmed: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);

  const pending = orders.filter(
    (o) => o.conversationId === conversationId && o.status === "pending",
  );

  async function confirm(orderId: string) {
    setConfirming(orderId);
    try {
      await backendPost(`dashboard/orders/${orderId}/confirm`);
      toast.success("Order confirmed!");
      onConfirmed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm order.");
    } finally {
      setConfirming(null);
    }
  }

  if (!conversationId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          description="Open a thread to see context and details for that conversation."
          icon={Info}
          title="Select a conversation"
        />
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          description="Nothing extra for this chat yet—summaries and items to review will appear here."
          icon={Info}
          title="No information yet"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {pending.map((order) => (
        <Card className="gap-0 overflow-hidden py-0 shadow-sm" key={order.orderId}>
          <CardHeader className="border-b bg-muted/20 px-4 py-3">
            <CardTitle className="text-sm">Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 py-4">
            <ul className="space-y-1.5">
              {(order.lines ?? []).map((line, i) => (
                <li className="flex flex-wrap items-baseline gap-x-1 text-sm" key={i}>
                  <span className="font-semibold tabular-nums">{line.quantity}</span>
                  <span className="text-muted-foreground">{line.unit}</span>
                  <span>{line.productName}</span>
                </li>
              ))}
              {(!order.lines || order.lines.length === 0) && (
                <li className="text-muted-foreground text-sm">No line items</li>
              )}
            </ul>
            {order.deliveryNotes ? (
              <p className="rounded-md border bg-muted/30 px-3 py-2 text-muted-foreground text-xs leading-relaxed">
                <span className="font-medium text-foreground">Note:</span> {order.deliveryNotes}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="border-t bg-muted/10 px-4 py-3">
            <Button
              className="w-full"
              disabled={confirming === order.orderId}
              size="sm"
              onClick={() => confirm(order.orderId)}
            >
              {confirming === order.orderId ? (
                <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
              ) : (
                <CheckCircle aria-hidden className="mr-2 size-4" />
              )}
              Confirm order
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// ─── Root inbox component ────────────────────────────────────────────────────

export function InboxClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convsLoading, setConvsLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await backendGet<{ conversations: Conversation[] }>(
        "dashboard/conversations",
      );
      setConversations(data.conversations ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load conversations.");
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await backendGet<{ orders: Order[] }>(
        "dashboard/orders?status=pending",
      );
      setOrders(data.orders ?? []);
    } catch {
      // non-fatal — new suppliers have no orders
    }
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    setMsgsLoading(true);
    try {
      const data = await backendGet<{ messages: Message[] }>(
        `dashboard/conversations/${convId}/messages`,
      );
      setMessages(data.messages ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load messages.");
    } finally {
      setMsgsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    async function init() {
      setConvsLoading(true);
      await Promise.all([fetchConversations(), fetchOrders()]);
      setConvsLoading(false);
    }
    void init();
  }, [fetchConversations, fetchOrders]);

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].conversationId);
    }
  }, [conversations, selectedId]);

  // Fetch messages when selected conversation changes
  useEffect(() => {
    if (selectedId) void fetchMessages(selectedId);
    else setMessages([]);
  }, [selectedId, fetchMessages]);

  // Polling — every 8 seconds
  useEffect(() => {
    const id = setInterval(async () => {
      await fetchConversations();
      if (selectedId) await fetchMessages(selectedId);
    }, 8000);
    return () => clearInterval(id);
  }, [fetchConversations, fetchMessages, selectedId]);

  function handleSelect(id: string) {
    setSelectedId(id);
    setMessages([]);
  }

  const threadTitle = selectedId
    ? (conversations.find((c) => c.conversationId === selectedId)?.customerName ?? "Thread")
    : "Thread";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <WorkspacePageHeader
        description="WhatsApp threads and conversation information in one place."
        title="Inbox"
      />

      <div className="flex min-h-0 flex-1 divide-x divide-border">
        {/* Left: conversation list */}
        <aside className="flex min-h-0 w-[min(100%,18rem)] shrink-0 flex-col sm:w-72">
          <PanelHeading>Conversations</PanelHeading>
          <ScrollArea className="min-h-0 flex-1">
            <ConversationList
              conversations={conversations}
              loading={convsLoading}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </ScrollArea>
        </aside>

        {/* Center: message thread */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PanelHeading>{threadTitle}</PanelHeading>
          <MessageThread
            conversationId={selectedId}
            messages={messages}
            loading={msgsLoading}
          />
          <Separator />
          <div className="shrink-0 bg-muted/20 px-4 py-3">
            <Input disabled placeholder="Reply coming soon…" />
          </div>
        </main>

        {/* Right: information */}
        <aside className="flex min-h-0 w-[min(100%,18rem)] shrink-0 flex-col sm:w-72">
          <PanelHeading>Information</PanelHeading>
          <ScrollArea className="min-h-0 flex-1">
            <InformationPanel
              conversationId={selectedId}
              orders={orders}
              onConfirmed={() => void fetchOrders()}
            />
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
