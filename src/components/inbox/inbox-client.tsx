"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CheckCircle, Loader2, LogOut, MessageSquare, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  Conversation,
  Message,
  Order,
  SellerMe,
} from "@/lib/dashboard-types";
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
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
        <MessageSquare className="size-8 opacity-40" />
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs">Messages will appear here once customers write via WhatsApp.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {conversations.map((conv) => (
        <li key={conv.conversationId}>
          <button
            className={cn(
              "w-full px-4 py-3 text-left transition-colors hover:bg-muted/60",
              selectedId === conv.conversationId && "bg-muted",
            )}
            type="button"
            onClick={() => onSelect(conv.conversationId)}
          >
            <p className="truncate font-medium text-sm">{conv.customerName || "Unknown"}</p>
            <p className="mt-0.5 flex items-center justify-between gap-2">
              <span className="truncate text-muted-foreground text-xs">
                {conv.status}
              </span>
              <span className="shrink-0 text-muted-foreground text-xs">
                {formatTime(conv.updatedAt ?? conv.createdAt)}
              </span>
            </p>
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
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a conversation</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">No messages yet.</p>
      </div>
    );
  }

  return (
          <div className="flex-1 overflow-y-auto px-4 py-3">
      <div className="flex flex-col gap-2">
        {messages.map((msg) => (
          <div
            key={msg.messageId}
            className={cn(
              "flex max-w-[75%] flex-col rounded-2xl px-3 py-2 text-sm",
              roleBubbleClass(msg.role),
            )}
          >
            <span>{msg.content}</span>
            <span className="mt-0.5 text-right text-xs opacity-60">
              {formatTime(msg.createdAt)}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Right panel ────────────────────────────────────────────────────────────

function DraftOrderPanel({
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
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a conversation</p>
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
        <CheckCircle className="size-8 opacity-40" />
        <p className="text-sm">No draft orders</p>
        <p className="text-xs">Pending orders for this conversation will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {pending.map((order) => (
        <div key={order.orderId} className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="mb-2 font-semibold text-sm">Draft Order</p>
          <ul className="mb-3 space-y-1">
            {(order.lines ?? []).map((line, i) => (
              <li key={i} className="flex items-center gap-1 text-sm">
                <span className="font-medium">{line.quantity}</span>
                <span className="text-muted-foreground">{line.unit}</span>
                <span>{line.productName}</span>
              </li>
            ))}
            {(!order.lines || order.lines.length === 0) && (
              <li className="text-muted-foreground text-sm">No line items</li>
            )}
          </ul>
          {order.deliveryNotes && (
            <p className="mb-3 text-muted-foreground text-xs">
              Note: {order.deliveryNotes}
            </p>
          )}
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
            Confirm Order
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── Root inbox component ────────────────────────────────────────────────────

export function InboxClient({ seller }: { seller: SellerMe["seller"] }) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convsLoading, setConvsLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function handleRefresh() {
    await Promise.all([
      fetchConversations(),
      fetchOrders(),
      ...(selectedId ? [fetchMessages(selectedId)] : []),
    ]);
    toast.success("Refreshed");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">Zumo</span>
          <Badge variant="secondary" className="text-xs">
            {seller.name}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            aria-label="Refresh"
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={loggingOut}
            onClick={handleLogout}
          >
            {loggingOut ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <LogOut aria-hidden className="mr-1.5 size-4" />
            )}
            Logout
          </Button>
        </div>
      </header>

      {/* Three-column body */}
      <div className="flex flex-1 overflow-hidden divide-x divide-border">
        {/* Left: conversation list */}
        <aside className="flex w-72 shrink-0 flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-2">
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
              Conversations
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              loading={convsLoading}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>
        </aside>

        {/* Center: message thread */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-2">
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
              {selectedId
                ? (conversations.find((c) => c.conversationId === selectedId)?.customerName ?? "Thread")
                : "Thread"}
            </p>
          </div>
          <MessageThread
            conversationId={selectedId}
            messages={messages}
            loading={msgsLoading}
          />
          <Separator />
          <div className="flex items-center gap-2 px-4 py-3">
            <input
              className="flex-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              disabled
              placeholder="Reply coming soon…"
            />
          </div>
        </main>

        {/* Right: draft order panel */}
        <aside className="flex w-72 shrink-0 flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-2">
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
              Draft Order
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DraftOrderPanel
              conversationId={selectedId}
              orders={orders}
              onConfirmed={() => void fetchOrders()}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
