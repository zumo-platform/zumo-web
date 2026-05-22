"use client";

import type { LucideIcon } from "lucide-react";
import { Info } from "lucide-react";

import type { Conversation, Order } from "@/lib/dashboard-types";

import { CustomerCard } from "./customer-card";
import { DraftOrderCard } from "./draft-order-card";
import { UnknownCustomerBanner } from "./unknown-customer-banner";
import { isUnknownConversationCustomer, ordersForConversationDraftStates } from "./whatsapp-helpers";

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

const BLOCK_TOOLTIP = "Creá primero el cliente para confirmar el pedido";

export function InformationPanel({
  conversation,
  orders,
  onOrdersDirty,
}: Readonly<{
  conversation: Conversation | null;
  orders: Order[];
  onOrdersDirty: () => void;
}>) {
  if (!conversation) {
    return (
      <div className="flex min-h-[min(100%,24rem)] items-center justify-center p-6">
        <EmptyState
          description="Abrí un hilo para ver el cliente y el pedido extraído."
          icon={Info}
          title="Seleccioná una conversación"
        />
      </div>
    );
  }

  const draftOrPending = ordersForConversationDraftStates(orders, conversation.conversationId);

  const unknown = isUnknownConversationCustomer(conversation);

  return (
    <div className="space-y-4 p-4">
      {unknown ? (
        <UnknownCustomerBanner phone={conversation.customerPhone.trim() || ""} />
      ) : (
        <CustomerCard conversation={conversation} orders={orders} />
      )}

      {draftOrPending.length > 0 ? (
        <div className="space-y-3">
          {draftOrPending.map((order) => (
            <DraftOrderCard
              confirmDisabledTitle={unknown ? BLOCK_TOOLTIP : undefined}
              key={order.orderId}
              order={order}
              variant={unknown ? "blocked" : "active"}
              onAfterChange={onOrdersDirty}
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
  );
}
