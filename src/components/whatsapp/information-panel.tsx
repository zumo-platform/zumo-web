"use client";

import { useMemo, useState } from "react";

import type { LucideIcon } from "lucide-react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomerPriceLookup } from "@/components/workspace/customer-price-lookup";
import { markDashboardOrderSeenViaProxy } from "@/lib/dashboard-orders";
import type { Conversation, Order } from "@/lib/dashboard-types";

import { CustomerCard } from "./customer-card";
import { DraftOrderPreviewCard } from "./draft-order-preview-card";
import { DraftOrderSheet } from "./draft-order-sheet";
import { UnknownCustomerBanner } from "./unknown-customer-banner";
import {
  conversationPocName,
  countUnreviewedExtractedOrders,
  isUnknownConversationCustomer,
  ordersForConversationDraftStates,
} from "./whatsapp-helpers";

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

const BLOCK_TOOLTIP = "Creá primero el cliente para gestionar el pedido";

type ExtractedOrderSort = "newest" | "oldest";

function orderTimeValue(order: Order): number {
  const raw = order.createdAt ?? null;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function InformationPanel({
  conversation,
  orders,
  onOrdersDirty,
}: Readonly<{
  conversation: Conversation | null;
  orders: Order[];
  onOrdersDirty: () => void;
}>) {
  const [sheetOrder, setSheetOrder] = useState<Order | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sort, setSort] = useState<ExtractedOrderSort>("newest");
  const draftOrPending = useMemo(
    () =>
      conversation
        ? ordersForConversationDraftStates(orders, conversation.conversationId)
        : [],
    [conversation, orders],
  );
  const sortedDraftOrPending = useMemo(() => {
    const direction = sort === "newest" ? -1 : 1;
    return [...draftOrPending].sort(
      (a, b) => direction * (orderTimeValue(a) - orderTimeValue(b)),
    );
  }, [draftOrPending, sort]);

  if (!conversation) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <EmptyState
          description="Abrí un hilo para ver el cliente y los pedidos extraídos."
          icon={Info}
          title="Seleccioná una conversación"
        />
      </div>
    );
  }

  const unreviewedExtracted = countUnreviewedExtractedOrders(draftOrPending);
  const unknown = isUnknownConversationCustomer(conversation);
  const pocName = conversationPocName(conversation);

  function openOrder(order: Order) {
    if (order.status === "draft" && !order.seenAt) {
      void markDashboardOrderSeenViaProxy(order.orderId).catch(() => {
        /* best-effort */
      });
    }
    setSheetOrder(order);
    setSheetOpen(true);
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 space-y-4 p-4">
          {unknown ? (
            <UnknownCustomerBanner phone={conversation.customerPhone.trim() || ""} />
          ) : (
            <>
              <CustomerCard conversation={conversation} orders={orders} />
              {conversation.customerId != null ? (
                <CustomerPriceLookup
                  customerId={conversation.customerId}
                  description="Elegí un producto del catálogo (nombre, SKU o presentación) para ver el precio de este cliente."
                  title="Precio para este cliente"
                />
              ) : null}
            </>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t">
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3 pb-2">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Pedidos extraídos{" "}
              <span className="tabular-nums">({unreviewedExtracted})</span>
            </p>
            {draftOrPending.length > 1 ? (
              <Button
                aria-label={
                  sort === "newest"
                    ? "Ordenar pedidos extraídos de más antiguo a más reciente"
                    : "Ordenar pedidos extraídos de más reciente a más antiguo"
                }
                className="size-8 shrink-0 p-0"
                size="sm"
                title={sort === "newest" ? "Más reciente primero" : "Más antiguo primero"}
                type="button"
                variant="outline"
                onClick={() => setSort((current) => (current === "newest" ? "oldest" : "newest"))}
              >
                {sort === "newest" ? (
                  <ArrowDownWideNarrow aria-hidden className="size-4" />
                ) : (
                  <ArrowUpNarrowWide aria-hidden className="size-4" />
                )}
              </Button>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {draftOrPending.length > 0 ? (
              <div className="space-y-2">
                {sortedDraftOrPending.map((order) => (
                  <DraftOrderPreviewCard
                    key={order.orderId}
                    order={order}
                    pocName={pocName}
                    onOpen={() => openOrder(order)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                description="Cuando el AI extraiga un pedido, va a aparecer acá."
                icon={Info}
                title="Sin pedido pendiente"
              />
            )}
          </div>
        </div>
      </div>

      <DraftOrderSheet
        confirmDisabledTitle={unknown ? BLOCK_TOOLTIP : undefined}
        conversation={conversation}
        open={sheetOpen}
        order={sheetOrder}
        variant={unknown ? "blocked" : "active"}
        onAfterChange={onOrdersDirty}
        onOrderRemoved={() => onOrdersDirty()}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSheetOrder(null);
        }}
      />
    </>
  );
}
