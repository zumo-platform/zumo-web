"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AlertCircle, Inbox as InboxIcon, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { InboxCard } from "@/components/workspace/inbox-card";
import { OrderDetailSheet } from "@/components/workspace/order-detail-sheet";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import {
  INBOX_COLUMN_LABELS,
  INBOX_COLUMN_ORDER,
  draftOrderToInboxCard,
  fetchInboxErrorViaProxy,
  fetchInboxBoardViaProxy,
  inboxCardMatchesQuery,
  resolveInboxErrorViaProxy,
  searchInboxViaProxy,
  type InboxBoard,
  type InboxCard as InboxCardData,
  type InboxColumnKey,
  type InboxErrorDetail,
} from "@/lib/dashboard-inbox";
import type { DashboardOrderPatch } from "@/lib/dashboard-orders";
import { buildInboxColumns } from "@/lib/inbox-columns";
import { loadCustomersList, loadOrdersCatalog } from "@/lib/orders-catalog-cache";

const EMPTY: InboxBoard = {
  columns: { orders: [], not_orders: [], errors: [] },
  counts: { orders: 0, not_orders: 0, errors: 0 },
};

const MIN_COLUMN_WIDTH = 260;

function formatErrorWhen(iso: string | null): string {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" });
}

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
}: Readonly<{
  column: InboxColumnKey;
  cards: InboxCardData[];
  onOpenOrder: (card: InboxCardData) => void;
  onOpenError: (card: InboxCardData) => void;
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
              onOpenError={onOpenError}
              onOpenOrder={onOpenOrder}
            />
          ))
        )}
      </div>
    </section>
  );
}

function InboxErrorSheet({
  errorId,
  open,
  onOpenChange,
  onResolved,
}: Readonly<{
  errorId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved: (errorId: string) => void;
}>) {
  const [detail, setDetail] = useState<InboxErrorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!open || !errorId) {
      setDetail(null);
      return;
    }
    let active = true;
    setLoading(true);
    void fetchInboxErrorViaProxy(errorId)
      .then((next) => {
        if (active) setDetail(next);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [errorId, open]);

  const resolve = async () => {
    if (!errorId || resolving) return;
    setResolving(true);
    try {
      const updated = await resolveInboxErrorViaProxy(errorId);
      if (!updated) {
        toast.error("No se pudo resolver el reclamo.");
        return;
      }
      toast.success("Reclamo resuelto.");
      onResolved(errorId);
      onOpenChange(false);
    } finally {
      setResolving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{detail?.title ?? "Reclamo / error"}</SheetTitle>
          <SheetDescription>
            {detail?.displayCode ?? "Cargando detalle del reclamo"}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {loading ? (
            <p className="text-muted-foreground text-sm">Cargando reclamo…</p>
          ) : detail ? (
            <div className="space-y-5 text-sm">
              <div className="rounded-lg border bg-card p-4">
                <p className="font-medium">Mensaje de WhatsApp</p>
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                  {detail.messageText || "Unknown"}
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-xs">Cliente</dt>
                  <dd className="font-medium">{detail.customerName || "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Punto de contacto</dt>
                  <dd className="font-medium">{detail.contactName || "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Teléfono</dt>
                  <dd className="font-medium">{detail.customerPhone || "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Fecha / hora</dt>
                  <dd className="font-medium">{formatErrorWhen(detail.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Vendedor asignado</dt>
                  <dd className="font-medium">{detail.assignedSellerName || "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Estado</dt>
                  <dd>
                    <Badge variant={detail.status === "resolved" ? "secondary" : "destructive"}>
                      {detail.status === "resolved" ? "Resuelto" : "Abierto"}
                    </Badge>
                  </dd>
                </div>
              </dl>

              <div>
                <p className="font-medium">Productos involucrados</p>
                {detail.productNames.length > 0 || detail.productSkus.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[...detail.productNames, ...detail.productSkus].map((item) => (
                      <Badge key={item} variant="outline">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">Unknown</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle aria-hidden className="size-4" />
              No se pudo cargar el reclamo.
            </div>
          )}
        </div>

        <SheetFooter>
          <Button
            disabled={!detail || detail.status === "resolved" || resolving}
            type="button"
            onClick={resolve}
          >
            {resolving ? "Resolviendo…" : "Resolver"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function InboxExperience() {
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

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchInboxBoardViaProxy(),
      loadOrdersCatalog(["draft"], { force: true }),
      loadCustomersList(),
    ]).then(([b, draftResult, customers]) => {
      if (!active) return;
      setBoard(b);
      if (draftResult.ok) {
        const customerById = new Map((customers ?? []).map((customer) => [customer.customerId, customer]));
        setDraftOrderCards(
          draftResult.orders
            .filter((order) => order.status === "draft")
            .map((order) => draftOrderToInboxCard(order, customerById.get(order.customerId))),
        );
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

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
    return {
      ...board.columns,
      orders: [
        ...draftOrderCards,
        ...board.columns.orders.filter(
          (card) => !card.orderId || !draftIds.has(card.orderId),
        ),
      ],
    };
  }, [board.columns, draftOrderCards]);

  const columns = useMemo(() => {
    if (activeQuery.length === 0) return baseColumns;
    const draftMatches = draftOrderCards.filter((card) => inboxCardMatchesQuery(card, activeQuery));
    const draftIds = new Set(draftMatches.map((card) => card.orderId).filter(Boolean));
    return buildInboxColumns([
      ...draftMatches,
      ...(searchResults ?? []).filter((card) => !card.orderId || !draftIds.has(card.orderId)),
    ]);
  }, [activeQuery, baseColumns, draftOrderCards, searchResults]);

  const handleOpenOrder = useCallback((card: InboxCardData) => {
    if (!card.orderId) return;
    setDetailOrderId(card.orderId);
    setDetailOpen(true);
  }, []);

  const handleOpenError = useCallback((card: InboxCardData) => {
    if (!card.errorId) return;
    setDetailErrorId(card.errorId);
    setErrorOpen(true);
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

  const handleOrderSeen = useCallback((orderId: string) => {
    const seenAt = new Date().toISOString();
    const markSeen = (card: InboxCardData): InboxCardData =>
      card.orderId === orderId ? { ...card, orderSeenAt: card.orderSeenAt ?? seenAt } : card;
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
  }, []);

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
        description="Pedidos, mensajes y errores de WhatsApp en un solo lugar."
        title="Inbox"
      >
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
      </WorkspacePageHeader>

      {!ready ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground text-sm">
          <InboxIcon aria-hidden className="size-5 opacity-40" />
          Cargando bandeja…
        </div>
      ) : (
        <div className="flex h-full min-h-0 w-full flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden px-3 py-4 md:px-4">
          {INBOX_COLUMN_ORDER.map((column) => (
            <InboxColumn
              cards={columns[column]}
              column={column}
              key={column}
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
        onResolved={handleErrorResolved}
      />
    </div>
  );
}
