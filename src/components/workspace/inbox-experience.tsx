"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Copy, Mail, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InboxFiltersBar, type InboxChannelFilter } from "@/components/workspace/inbox-filters";
import { InboxCard } from "@/components/workspace/inbox-card";
import { InboxEmailSheet } from "@/components/workspace/inbox-email-sheet";
import { InboxErrorSheet } from "@/components/workspace/inbox-error-sheet";
import { OrderDetailSheet } from "@/components/workspace/order-detail-sheet";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { InboxBoardSkeleton } from "@/components/workspace/workspace-skeletons";
import {
  INBOX_COLUMN_LABELS,
  INBOX_COLUMN_ORDER,
  draftOrderToInboxCard,
  mergeDraftInboxCardWithApiCard,
  fetchInboxBoardViaProxy,
  fetchSellerOptionsViaProxy,
  inboxCardIsUnseenForSeller,
  inboxCardMatchesQuery,
  inboxCardMatchesSellerFilter,
  searchInboxViaProxy,
  type InboxBoard,
  type InboxCard as InboxCardData,
  type InboxColumnKey,
  type InboxErrorDetail,
  type InboxSellerOption,
} from "@/lib/dashboard-inbox";
import type { DashboardOrderPatch } from "@/lib/dashboard-orders";
import { fetchEmailSettingsViaProxy } from "@/lib/dashboard-settings";
import { buildInboxColumns } from "@/lib/inbox-columns";
import { loadCustomersList, loadOrdersCatalog } from "@/lib/orders-catalog-cache";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

const EMPTY: InboxBoard = {
  columns: { orders: [], not_orders: [], errors: [] },
  counts: { orders: 0, not_orders: 0, errors: 0 },
};

const MIN_COLUMN_WIDTH = 260;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function InboxColumn({
  column,
  cards,
  onOpenOrder,
  onOpenError,
  onOpenEmail,
}: Readonly<{
  column: InboxColumnKey;
  cards: InboxCardData[];
  onOpenOrder: (card: InboxCardData) => void;
  onOpenError: (card: InboxCardData) => void;
  onOpenEmail: (card: InboxCardData) => void;
}>) {
  const isError = column === "errors";
  return (
    <section
      className="flex h-full min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-muted/50"
      style={{ minWidth: MIN_COLUMN_WIDTH }}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-muted/70 px-3 py-2.5">
        <h3 className="truncate font-medium text-sm">{INBOX_COLUMN_LABELS[column]}</h3>
        <Badge variant={isError ? "destructive" : "secondary"}>{cards.length}</Badge>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {cards.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-8 text-center text-muted-foreground text-xs">
            Sin conversaciones
          </div>
        ) : (
          cards.map((card) => (
            <InboxCard
              card={card}
              key={card.cardId ?? card.errorId ?? card.orderId ?? card.conversationId}
              onOpenEmail={onOpenEmail}
              onOpenError={onOpenError}
              onOpenOrder={onOpenOrder}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function InboxExperience() {
  const { sellerId, can } = useWorkspacePermissions();
  const canFilterBySeller = can("conversations.view_all");
  const [board, setBoard] = useState<InboxBoard>(EMPTY);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 300);
  const [searchResults, setSearchResults] = useState<InboxCardData[] | null>(null);
  const [draftOrderCards, setDraftOrderCards] = useState<InboxCardData[]>([]);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailErrorId, setDetailErrorId] = useState<string | null>(null);
  const [errorOpen, setErrorOpen] = useState(false);
  const [emailCard, setEmailCard] = useState<InboxCardData | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [channelFilter, setChannelFilter] = useState<InboxChannelFilter>("all");
  const [unseenOnly, setUnseenOnly] = useState(false);
  const [selectedSellerIds, setSelectedSellerIds] = useState<Set<number>>(() => new Set());
  const [sellers, setSellers] = useState<InboxSellerOption[]>([]);
  const [inboundEmailAddress, setInboundEmailAddress] = useState<string | null>(null);

  const refreshBoard = useCallback(async () => {
    const nextBoard = await fetchInboxBoardViaProxy();
    setBoard(nextBoard);
  }, []);

  const loadDraftOrderCards = useCallback(async (): Promise<InboxCardData[]> => {
    const draftResult = await loadOrdersCatalog(["draft"]);
    if (!draftResult.ok || draftResult.orders.length === 0) {
      return [];
    }

    const customers = await loadCustomersList();
    const customerById = new Map((customers ?? []).map((customer) => [customer.customerId, customer]));
    return draftResult.orders
      .filter((order) => order.status === "draft")
      .map((order) => draftOrderToInboxCard(order, customerById.get(order.customerId)));
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [nextBoard, emailSettings, sellerOptions] = await Promise.all([
          fetchInboxBoardViaProxy(),
          fetchEmailSettingsViaProxy(),
          canFilterBySeller ? fetchSellerOptionsViaProxy() : Promise.resolve([]),
        ]);
        if (!active) return;
        setBoard(nextBoard);
        setSellers(sellerOptions);
        const addr = emailSettings?.address?.trim() || null;
        setInboundEmailAddress(addr);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [canFilterBySeller]);

  const handleCopyInboundEmail = useCallback(async () => {
    const addr = inboundEmailAddress?.trim();
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      toast.success("Dirección copiada.");
    } catch {
      toast.error("No se pudo copiar la dirección.");
    }
  }, [inboundEmailAddress]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    void loadDraftOrderCards()
      .then((cards) => {
        if (active) setDraftOrderCards(cards);
      })
      .catch(() => {
        if (active) setDraftOrderCards([]);
      });
    return () => {
      active = false;
    };
  }, [ready, loadDraftOrderCards]);

  useEffect(() => {
    if (!ready) return;
    const POLL_MS = 15_000;
    let inFlight = false;

    const tick = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        await refreshBoard();
      } finally {
        inFlight = false;
      }
    };

    const interval = window.setInterval(tick, POLL_MS);
    const onFocus = () => void tick();
    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, refreshBoard]);

  useEffect(() => {
    let active = true;
    const q = debouncedQuery.trim();
    if (q.length === 0) {
      return () => {
        active = false;
      };
    }
    void searchInboxViaProxy(q).then((cards) => {
      if (active) setSearchResults(cards);
    });
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  const activeQuery = debouncedQuery.trim();
  const baseColumns = useMemo(() => {
    const draftIds = new Set(draftOrderCards.map((card) => card.orderId).filter(Boolean));
    const apiOrderByOrderId = new Map(
      board.columns.orders
        .filter((card) => card.orderId)
        .map((card) => [card.orderId!, card]),
    );
    return {
      ...board.columns,
      orders: [
        ...draftOrderCards.map((draft) =>
          draft.orderId
            ? mergeDraftInboxCardWithApiCard(draft, apiOrderByOrderId.get(draft.orderId))
            : draft,
        ),
        ...board.columns.orders.filter(
          (card) => !card.orderId || !draftIds.has(card.orderId),
        ),
      ],
    };
  }, [board.columns, draftOrderCards]);

  const applyInboxFilters = useCallback(
    (cards: InboxCardData[]) =>
      cards.filter((card) => {
        if (channelFilter !== "all" && card.channel !== channelFilter) return false;
        if (unseenOnly && !inboxCardIsUnseenForSeller(card, sellerId)) return false;
        if (canFilterBySeller && !inboxCardMatchesSellerFilter(card, selectedSellerIds)) {
          return false;
        }
        return true;
      }),
    [canFilterBySeller, channelFilter, selectedSellerIds, sellerId, unseenOnly],
  );

  const columns = useMemo(() => {
    if (activeQuery.length === 0) {
      return {
        orders: applyInboxFilters(baseColumns.orders),
        not_orders: applyInboxFilters(baseColumns.not_orders),
        errors: applyInboxFilters(baseColumns.errors),
      };
    }
    const draftMatches = draftOrderCards.filter((card) =>
      inboxCardMatchesQuery(card, activeQuery),
    );
    const draftIds = new Set(draftMatches.map((card) => card.orderId).filter(Boolean));
    const merged = buildInboxColumns(
      [
        ...draftMatches,
        ...(searchResults ?? []).filter(
          (card) => !card.orderId || !draftIds.has(card.orderId),
        ),
      ],
    );
    return {
      orders: applyInboxFilters(merged.orders),
      not_orders: applyInboxFilters(merged.not_orders),
      errors: applyInboxFilters(merged.errors),
    };
  }, [activeQuery, applyInboxFilters, baseColumns, draftOrderCards, searchResults]);

  const handleOpenOrder = useCallback((card: InboxCardData) => {
    if (!card.orderId) return;
    setDetailOrderId(card.orderId);
    setDetailOpen(true);
  }, []);

  const handleOpenOrderById = useCallback((orderId: string) => {
    setDetailOrderId(orderId);
    setDetailOpen(true);
  }, []);

  const handleOpenError = useCallback((card: InboxCardData) => {
    if (!card.errorId) return;
    setDetailErrorId(card.errorId);
    setErrorOpen(true);
  }, []);

  const handleOpenEmail = useCallback((card: InboxCardData) => {
    setEmailCard(card);
    setEmailOpen(true);
  }, []);

  const handleErrorResolved = useCallback((errorId: string) => {
    const removeError = (cards: InboxCardData[]) => cards.filter((card) => card.errorId !== errorId);
    setBoard((current) => ({
      ...current,
      columns: {
        orders: removeError(current.columns.orders),
        not_orders: removeError(current.columns.not_orders),
        errors: removeError(current.columns.errors),
      },
    }));
    setSearchResults((cards) => (cards ? removeError(cards) : cards));
  }, []);

  const handleErrorUpdated = useCallback((detail: InboxErrorDetail) => {
    const updateError = (card: InboxCardData): InboxCardData =>
      card.errorId === detail.errorId
        ? {
            ...card,
            errorStatus: detail.status,
            errorTitle: detail.title,
            orderId: detail.orderId,
            orderDisplayCode: detail.orderDisplayCode,
            orderStatus: detail.orderStatus,
            assignedSellerName: detail.assignedSellerName,
          }
        : card;
    setBoard((current) => ({
      ...current,
      columns: {
        orders: current.columns.orders.map(updateError),
        not_orders: current.columns.not_orders.map(updateError),
        errors: current.columns.errors.map(updateError),
      },
    }));
    setSearchResults((cards) => (cards ? cards.map(updateError) : cards));
  }, []);

  const handleOrderSeen = useCallback(
    (orderId: string) => {
      const seenAt = new Date().toISOString();
      const markSeen = (card: InboxCardData): InboxCardData =>
        card.orderId === orderId
          ? {
              ...card,
              orderSeenAt: card.orderSeenAt ?? seenAt,
              orderSeenBySellerId:
                card.orderSeenBySellerId ?? (sellerId > 0 ? sellerId : null),
            }
          : card;
      setDraftOrderCards((cards) => cards.map(markSeen));
      setBoard((current) => ({
        ...current,
        columns: {
          orders: current.columns.orders.map(markSeen),
          not_orders: current.columns.not_orders.map(markSeen),
          errors: current.columns.errors.map(markSeen),
        },
      }));
      setSearchResults((cards) => (cards ? cards.map(markSeen) : cards));
    },
    [sellerId],
  );

  const handleOrderRemoved = useCallback((orderId: string) => {
    const removeOrder = (cards: InboxCardData[]) => cards.filter((card) => card.orderId !== orderId);
    setDraftOrderCards(removeOrder);
    setBoard((current) => ({
      ...current,
      columns: {
        orders: removeOrder(current.columns.orders),
        not_orders: removeOrder(current.columns.not_orders),
        errors: removeOrder(current.columns.errors),
      },
    }));
    setSearchResults((cards) => (cards ? removeOrder(cards) : cards));
  }, []);

  const handleOrderStatusChange = useCallback(
    (orderId: string, status: string, patch?: DashboardOrderPatch) => {
      if (status !== "draft") {
        handleOrderRemoved(orderId);
        return;
      }
      const updateOrder = (card: InboxCardData): InboxCardData =>
        card.orderId === orderId
          ? {
              ...card,
              orderStatus: status,
              orderDisplayCode: patch?.displayCode ?? card.orderDisplayCode,
              orderSeenAt: patch?.seenAt ?? card.orderSeenAt,
            }
          : card;
      setDraftOrderCards((cards) => cards.map(updateOrder));
      setSearchResults((cards) => (cards ? cards.map(updateOrder) : cards));
    },
    [handleOrderRemoved],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <WorkspacePageHeader
        belowTitle={
          inboundEmailAddress ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <Mail aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-muted-foreground text-sm">
                {inboundEmailAddress}
              </span>
              <Button
                aria-label="Copiar dirección de correo"
                className="size-7 shrink-0"
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => void handleCopyInboundEmail()}
              >
                <Copy aria-hidden className="size-3.5" />
              </Button>
            </div>
          ) : null
        }
        description="Pedidos, mensajes y errores de WhatsApp y correo en un solo lugar."
        title="Inbox"
      >
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
          <InboxFiltersBar
            canFilterBySeller={canFilterBySeller}
            channelFilter={channelFilter}
            selectedSellerIds={selectedSellerIds}
            sellers={sellers}
            unseenOnly={unseenOnly}
            onChannelFilterChange={setChannelFilter}
            onSelectedSellerIdsChange={setSelectedSellerIds}
            onUnseenOnlyChange={setUnseenOnly}
          />
          <div className="relative w-full sm:w-80">
            <Search
              aria-hidden
              className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Buscar por cliente, contacto, producto o SKU"
              className="pl-8"
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                if (!next.trim()) setSearchResults(null);
              }}
              placeholder="Buscar cliente, contacto, producto o SKU"
              value={query}
            />
          </div>
        </div>
      </WorkspacePageHeader>

      {!ready ? (
        <InboxBoardSkeleton />
      ) : (
        <div className="flex h-full min-h-0 w-full flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden px-3 py-4 md:px-4">
          {INBOX_COLUMN_ORDER.map((column) => (
            <InboxColumn
              cards={columns[column]}
              column={column}
              key={column}
              onOpenEmail={handleOpenEmail}
              onOpenError={handleOpenError}
              onOpenOrder={handleOpenOrder}
            />
          ))}
        </div>
      )}
      <OrderDetailSheet
        open={detailOpen}
        orderId={detailOrderId}
        onOpenChange={setDetailOpen}
        onOrderRemoved={handleOrderRemoved}
        onOrderSeen={handleOrderSeen}
        onOrderStatusChange={handleOrderStatusChange}
      />
      <InboxErrorSheet
        errorId={detailErrorId}
        open={errorOpen}
        onOpenChange={setErrorOpen}
        onOpenOrder={handleOpenOrderById}
        onResolved={handleErrorResolved}
        onUpdated={handleErrorUpdated}
      />
      <InboxEmailSheet
        card={emailCard}
        open={emailOpen}
        onOpenChange={setEmailOpen}
        onOpenOrder={handleOpenOrder}
      />
    </div>
  );
}
