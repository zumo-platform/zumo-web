"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { ConversationList } from "@/components/inbox/conversation-list";
import { backendGet, isUnknownConversationCustomer } from "@/components/inbox/inbox-helpers";
import { InformationPanel } from "@/components/inbox/information-panel";
import { MessageThread } from "@/components/inbox/message-thread";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ErrorAlert } from "@/components/workspace/error-alert";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import type { Conversation, Message, Order } from "@/lib/dashboard-types";

function PanelHeading({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="border-b bg-muted/30 px-3 py-2.5">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{children}</p>
    </div>
  );
}

export function InboxClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [convsLoading, setConvsLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);

  const [convsFetchError, setConvsFetchError] = useState<string | null>(null);
  const [msgsFetchError, setMsgsFetchError] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    try {
      const [draftRes, pendingRes] = await Promise.all([
        backendGet<{ orders?: Order[] }>("dashboard/orders?status=draft"),
        backendGet<{ orders?: Order[] }>("dashboard/orders?status=pending"),
      ]);
      const merged = [...(draftRes.orders ?? []), ...(pendingRes.orders ?? [])];
      const byKey = new Map<string, Order>();
      for (const o of merged) {
        byKey.set(o.orderId, o);
      }
      setOrders([...byKey.values()]);
    } catch {
      /* non-fatal */
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    setConvsFetchError(null);
    try {
      const data = await backendGet<{ conversations?: Conversation[] }>("dashboard/conversations");
      setConversations(data.conversations ?? []);
    } catch (err) {
      setConversations([]);
      setConvsFetchError(err instanceof Error ? err.message : "No se pudieron cargar las conversaciones.");
    }
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    setMsgsLoading(true);
    setMsgsFetchError(null);
    try {
      const data = await backendGet<{ messages?: Message[] }>(
        `dashboard/conversations/${encodeURIComponent(convId)}/messages`,
      );
      setMessages(data.messages ?? []);
    } catch (err) {
      setMessages([]);
      setMsgsFetchError(err instanceof Error ? err.message : "No se pudieron cargar los mensajes.");
    } finally {
      setMsgsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setConvsLoading(true);
      await Promise.all([fetchConversations(), refreshOrders()]);
      setConvsLoading(false);
    }
    void init();
  }, [fetchConversations, refreshOrders]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setMsgsFetchError(null);
      return;
    }
    void fetchMessages(selectedId);
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetchConversations();
      if (selectedId) void fetchMessages(selectedId);
    }, 8000);
    return () => window.clearInterval(id);
  }, [fetchConversations, fetchMessages, selectedId]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMessages([]);
    setMsgsFetchError(null);
  }, []);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.conversationId === selectedId) ?? null,
    [conversations, selectedId],
  );

  const threadTitle = !selectedConversation
    ? "Conversación"
    : isUnknownConversationCustomer(selectedConversation)
      ? selectedConversation.customerPhone.trim() || "Conversación"
      : selectedConversation.customerName.trim() || "Conversación";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <WorkspacePageHeader
        description="Mensajes de WhatsApp y información del cliente en un solo lugar."
        title="Inbox"
      />

      <div className="flex min-h-0 flex-1 divide-x divide-border">
        <aside className="flex min-h-0 w-[min(100%,18rem)] shrink-0 flex-col sm:w-72">
          <PanelHeading>Conversaciones</PanelHeading>
          {convsFetchError ? (
            <div className="shrink-0 border-b p-3">
              <ErrorAlert
                code="INB-001"
                message={convsFetchError}
                title="No se pudieron cargar las conversaciones"
                onRetry={() => void fetchConversations()}
              />
            </div>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col">
            <ConversationList
              conversations={conversations}
              loading={convsLoading}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PanelHeading>{threadTitle}</PanelHeading>
          {msgsFetchError && selectedId ? (
            <div className="shrink-0 border-b p-3">
              <ErrorAlert
                code="INB-002"
                message={msgsFetchError}
                title="No se pudieron cargar los mensajes"
                onRetry={() => void fetchMessages(selectedId)}
              />
            </div>
          ) : null}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <MessageThread conversationId={selectedId} messages={messages} loading={msgsLoading} />
          </div>
          <Separator />
          <div className="shrink-0 bg-muted/20 px-4 py-3">
            <Input disabled placeholder="Responder (próximamente)" />
          </div>
        </main>

        <aside className="flex min-h-0 w-[min(100%,18rem)] shrink-0 flex-col sm:w-80">
          <PanelHeading>Información</PanelHeading>
          <ScrollArea className="min-h-0 flex-1">
            <InformationPanel
              conversation={selectedConversation}
              orders={orders}
              onOrdersDirty={() => void refreshOrders()}
            />
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
