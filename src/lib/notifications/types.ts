export type ZumoNotificationType = "order" | "draft_order" | "reclamo";

export type ZumoNotification = Readonly<{
  id: string;
  type: ZumoNotificationType;
  entityId: string;
  code: string;
  customerName: string;
  createdAt: string;
  href: string;
}>;

export type NotificationPrefs = Readonly<{
  /** Master switch. When false, the provider does not poll and no alerts fire. */
  notifyEnabled: boolean;
  notifyOrders: boolean;
  notifyDraftOrders: boolean;
  notifyReclamos: boolean;
}>;

/** Raw server item (no href — client derives it). */
export type NotificationItemDTO = Readonly<{
  id: string;
  type: ZumoNotificationType;
  entityId: string;
  code: string;
  customerName: string;
  createdAt: string;
}>;

export function hrefForNotification(item: NotificationItemDTO): string {
  switch (item.type) {
    case "order":
    case "draft_order":
      return `/orders/${encodeURIComponent(item.entityId)}`;
    case "reclamo":
      return `/inbox?error=${encodeURIComponent(item.entityId)}`;
  }
}

export function titleForType(type: ZumoNotificationType): string {
  switch (type) {
    case "order":
      return "Nuevo pedido";
    case "draft_order":
      return "Borrador de pedido";
    case "reclamo":
      return "Reclamo / error";
  }
}
