"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ConversationList } from "@/components/whatsapp/conversation-list";
import { InformationPanel } from "@/components/whatsapp/information-panel";
import { MessageComposer } from "@/components/whatsapp/message-composer";
import { MessageThread } from "@/components/whatsapp/message-thread";
import { backendGet, isUnknownConversationCustomer } from "@/components/whatsapp/whatsapp-helpers";
import { ErrorAlert } from "@/components/workspace/error-alert";
import type { Conversation, Message, Order } from "@/lib/dashboard-types";

function PanelHeading({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="border-b bg-muted/30 px-3 py-2.5">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{children}</p>
    </div>
  );
}

export function WhatsappClient() {
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

  const fetchMessages = useCallback(async (convId: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setMsgsLoading(true);
    setMsgsFetchError(null);
    try {
      const data = await backendGet<{ messages?: Message[] }>(
        `dashboard/conversations/${encodeURIComponent(convId)}/messages`,
      );
      setMessages(data.messages ?? []);
    } catch (err) {
      if (!opts?.silent) setMessages([]);
      setMsgsFetchError(err instanceof Error ? err.message : "No se pudieron cargar los mensajes.");
    } finally {
      if (!opts?.silent) setMsgsLoading(false);
    }
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    async function init() {
      setConvsLoading(true);
      await Promise.all([fetchConversations(), refreshOrders()]);
      setConvsLoading(false);
    }
    void init();
  }, [fetchConversations, refreshOrders]);

  const prevSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setMsgsFetchError(null);
      prevSelectedIdRef.current = null;
      return;
    }
    if (prevSelectedIdRef.current !== selectedId) {
      setMessages([]);
    }
    prevSelectedIdRef.current = selectedId;
    void fetchMessages(selectedId);
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetchConversations();
      void refreshOrders();
      if (selectedId) void fetchMessages(selectedId, { silent: true });
    }, 8000);
    return () => window.clearInterval(id);
  }, [fetchConversations, fetchMessages, refreshOrders, selectedId]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
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
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,18rem)_minmax(0,calc((100%-18rem-22rem)*0.9))_minmax(22rem,calc(22rem+(100%-18rem-22rem)*0.1))] divide-x divide-border overflow-hidden">
        <aside className="flex min-h-0 flex-col overflow-hidden">
          <PanelHeading>Conversaciones</PanelHeading>
          {convsFetchError ? (
            <div className="shrink-0 border-b p-3">
              <ErrorAlert
                code="WA-001"
                message={convsFetchError}
                title="No se pudieron cargar las conversaciones"
                onRetry={() => void fetchConversations()}
              />
            </div>
          ) : null}
          <ConversationList
            conversations={conversations}
            loading={convsLoading}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <PanelHeading>{threadTitle}</PanelHeading>
          {msgsFetchError && selectedId ? (
            <div className="shrink-0 border-b p-3">
              <ErrorAlert
                code="WA-002"
                message={msgsFetchError}
                title="No se pudieron cargar los mensajes"
                onRetry={() => void fetchMessages(selectedId)}
              />
            </div>
          ) : null}
          <MessageThread conversationId={selectedId} messages={messages} loading={msgsLoading} />
          <MessageComposer
            conversationId={selectedId}
            onSent={(msg) => {
              setMessages((prev) => [...prev, msg]);
              void fetchConversations();
            }}
          />
        </main>

        <aside className="flex min-h-0 flex-col overflow-hidden">
          <PanelHeading>Información</PanelHeading>
          <InformationPanel
            conversation={selectedConversation}
            orders={orders}
            onOrdersDirty={() => void refreshOrders()}
          />
        </aside>
      </div>
    </div>
  );
}
