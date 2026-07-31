"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ConversationFilterBar, type SellerOption } from "@/components/whatsapp/conversation-filter-bar";
import {
  applyClientPipeline,
  buildConversationsQuery,
  defaultConversationFilters,
  findNewerConversationForSameCustomer,
  type ConversationFilterState,
} from "@/components/whatsapp/conversation-filters";
import { ConversationList } from "@/components/whatsapp/conversation-list";
import { InformationPanel } from "@/components/whatsapp/information-panel";
import { MessageComposer } from "@/components/whatsapp/message-composer";
import { MessageThread } from "@/components/whatsapp/message-thread";
import {
  backendGet,
  backendPost,
  isEmailChannel,
  isUnknownConversationCustomer,
} from "@/components/whatsapp/whatsapp-helpers";
import { ErrorAlert } from "@/components/workspace/error-alert";
import type { Conversation, Message, Order } from "@/lib/dashboard-types";
import { loadOrdersCatalog } from "@/lib/orders-catalog-cache";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

const WHATSAPP_POLL_MS = 5_000;
const WHATSAPP_POLL_AWAITING_REPLY_MS = 2_000;
const WHATSAPP_POLL_ERROR_BACKOFF_MS = 15_000;
const WHATSAPP_POLL_ERROR_THRESHOLD = 3;

function PanelHeading({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="border-b bg-muted/30 px-3 py-2.5">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{children}</p>
    </div>
  );
}

export function WhatsappClient() {
  const { can } = useWorkspacePermissions();
  const canViewAll = can("conversations.view_all");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sellers, setSellers] = useState<SellerOption[]>([]);

  const [filters, setFilters] = useState<ConversationFilterState>(() =>
    defaultConversationFilters(canViewAll),
  );

  const [convsLoading, setConvsLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [convsFetchError, setConvsFetchError] = useState<string | null>(null);
  const [msgsFetchError, setMsgsFetchError] = useState<string | null>(null);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const userTouchedFiltersRef = useRef(false);
  const convPollFailuresRef = useRef(0);
  const hasLoadedConversationsRef = useRef(false);

  const refreshOrders = useCallback(async (opts?: { force?: boolean }) => {
    try {
      const result = await loadOrdersCatalog(["draft", "pending"], opts);
      if (!result.ok) return;
      const byKey = new Map<string, Order>();
      for (const order of result.orders) {
        byKey.set(order.orderId, order as unknown as Order);
      }
      setOrders([...byKey.values()]);
    } catch {
      /* non-fatal */
    }
  }, []);

  const fetchConversations = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setConvsFetchError(null);
    try {
      const qs = buildConversationsQuery(filtersRef.current);
      const data = await backendGet<{ conversations?: Conversation[] }>(`dashboard/conversations${qs}`);
      setConversations(data.conversations ?? []);
      hasLoadedConversationsRef.current = true;
      convPollFailuresRef.current = 0;
      setConvsFetchError(null);
    } catch (err) {
      convPollFailuresRef.current += 1;
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar las conversaciones.";
      if (!opts?.silent || !hasLoadedConversationsRef.current) {
        setConvsFetchError(message);
      }
      if (!hasLoadedConversationsRef.current && !opts?.silent) {
        setConversations([]);
      }
    }
  }, []);

  const fetchSellers = useCallback(async () => {
    if (!canViewAll) {
      setSellers([]);
      return;
    }
    try {
      const data = await backendGet<{ team?: Array<{ kind?: string; sellerId?: number; id?: string; name?: string }> }>(
        "dashboard/team",
      );
      const rows = (data.team ?? [])
        .filter((m) => m.kind === "seller")
        .map((m) => ({
          sellerId: m.sellerId ?? Number.parseInt(m.id ?? "0", 10),
          name: (m.name ?? "").trim() || "Sin nombre",
        }))
        .filter((s) => Number.isFinite(s.sellerId) && s.sellerId > 0);
      setSellers(rows);
    } catch {
      setSellers([]);
    }
  }, [canViewAll]);

  const fetchMessages = useCallback(async (convId: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setMsgsLoading(true);
    setMsgsFetchError(null);
    try {
      const data = await backendGet<{ messages?: Message[] }>(
        `dashboard/conversations/${encodeURIComponent(convId)}/messages`,
      );
      setMessages(data.messages ?? []);
    } catch (err) {
      if (!opts?.silent) {
        setMessages([]);
        setMsgsFetchError(
          err instanceof Error ? err.message : "No se pudieron cargar los mensajes.",
        );
      }
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
    void (async () => {
      await Promise.all([refreshOrders(), fetchSellers()]);
    })();
  }, [refreshOrders, fetchSellers]);

  const serverQuery = buildConversationsQuery(filters);
  useEffect(() => {
    void (async () => {
      setConvsLoading(true);
      await fetchConversations();
      setConvsLoading(false);
    })();
  }, [serverQuery, fetchConversations]);

  const prevSelectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setMsgsFetchError(null);
      prevSelectedIdRef.current = null;
      return;
    }
    if (prevSelectedIdRef.current !== selectedId) setMessages([]);
    prevSelectedIdRef.current = selectedId;
    void fetchMessages(selectedId);
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    if (userTouchedFiltersRef.current) return;
    setFilters((prev) => ({
      ...prev,
      assigned: canViewAll ? { mode: "all" } : { mode: "me" },
    }));
  }, [canViewAll]);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      setMsgsFetchError(null);
      void (async () => {
        try {
          await backendPost(`dashboard/conversations/${encodeURIComponent(id)}/open`);
          void fetchConversations();
        } catch {
          /* non-fatal */
        }
      })();
    },
    [fetchConversations],
  );

  const visibleConversations = useMemo(
    () => applyClientPipeline(conversations, filters),
    [conversations, filters],
  );

  const hasActiveFilters = useMemo(() => {
    const d = defaultConversationFilters(canViewAll);
    return (
      filters.search.trim() !== "" ||
      filters.pedidoStates.length > 0 ||
      filters.assigned.mode !== d.assigned.mode ||
      filters.statuses.length !== d.statuses.length ||
      filters.kinds.length !== d.kinds.length
    );
  }, [filters, canViewAll]);

  // Email threads belong in Inbox — never select them in the WhatsApp tab.
  const selectedConversation = useMemo(() => {
    const found = conversations.find((c) => c.conversationId === selectedId) ?? null;
    if (found && isEmailChannel(found)) return null;
    return found;
  }, [conversations, selectedId]);

  const awaitingAiReply = useMemo(() => {
    const last = messages.at(-1);
    return last?.role === "customer";
  }, [messages]);

  useEffect(() => {
    let inFlight = false;
    let timeoutId: number | undefined;

    const tick = () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      void Promise.all([
        fetchConversations({ silent: true }),
        refreshOrders({ force: true }),
        selectedId ? fetchMessages(selectedId, { silent: true }) : Promise.resolve(),
      ]).finally(() => {
        inFlight = false;
        scheduleNext();
      });
    };

    const scheduleNext = () => {
      window.clearTimeout(timeoutId);
      const pollFailures = convPollFailuresRef.current;
      const delay =
        pollFailures >= WHATSAPP_POLL_ERROR_THRESHOLD
          ? WHATSAPP_POLL_ERROR_BACKOFF_MS
          : selectedId && awaitingAiReply
            ? WHATSAPP_POLL_AWAITING_REPLY_MS
            : WHATSAPP_POLL_MS;
      timeoutId = window.setTimeout(tick, delay);
    };

    scheduleNext();
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchConversations, fetchMessages, refreshOrders, selectedId, awaitingAiReply]);

  useEffect(() => {
    if (!selectedId) return;
    const found = conversations.find((c) => c.conversationId === selectedId);
    if (found && isEmailChannel(found)) {
      setSelectedId(null);
      return;
    }
    if (!found || isEmailChannel(found)) return;
    const newer = findNewerConversationForSameCustomer(found, conversations);
    if (newer && newer.conversationId !== selectedId) {
      setSelectedId(newer.conversationId);
    }
  }, [conversations, selectedId]);

  const threadTitle = !selectedConversation
    ? "Conversación"
    : isEmailChannel(selectedConversation) && selectedConversation.subject?.trim()
      ? selectedConversation.subject.trim()
      : isUnknownConversationCustomer(selectedConversation)
        ? selectedConversation.customerPhone.trim() || "Conversación"
        : selectedConversation.customerName.trim() || "Conversación";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,20rem)_minmax(0,calc((100%-20rem-22rem)*0.9))_minmax(22rem,calc(22rem+(100%-20rem-22rem)*0.1))] divide-x divide-border overflow-hidden">
        <aside className="flex min-h-0 flex-col overflow-hidden">
          <PanelHeading>Conversaciones</PanelHeading>
          <ConversationFilterBar
            canViewAll={canViewAll}
            filters={filters}
            onChange={(next) => {
              userTouchedFiltersRef.current = true;
              setFilters(next);
            }}
            sellers={sellers}
          />
          {convsFetchError ? (
            <div className="shrink-0 border-b p-3">
              <ErrorAlert
                code="WA-001"
                message={convsFetchError}
                onRetry={() => void fetchConversations()}
                title="No se pudieron cargar las conversaciones"
              />
            </div>
          ) : null}
          <ConversationList
            conversations={visibleConversations}
            hasActiveFilters={hasActiveFilters}
            loading={convsLoading}
            onSelect={handleSelect}
            selectedId={selectedId}
          />
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <PanelHeading>{threadTitle}</PanelHeading>
          {msgsFetchError && selectedId ? (
            <div className="shrink-0 border-b p-3">
              <ErrorAlert
                code="WA-002"
                message={msgsFetchError}
                onRetry={() => void fetchMessages(selectedId)}
                title="No se pudieron cargar los mensajes"
              />
            </div>
          ) : null}
          <MessageThread
            awaitingAiReply={awaitingAiReply}
            conversationId={selectedId}
            loading={msgsLoading}
            messages={messages}
          />
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
            onOrdersDirty={() => void refreshOrders()}
            orders={orders}
          />
        </aside>
      </div>
    </div>
  );
}
