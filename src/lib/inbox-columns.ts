import type { InboxCard, InboxColumnKey } from "@/lib/dashboard-inbox";

/** Group a flat list of search-result cards back into the 3 board columns. */
export function buildInboxColumns(
  cards: readonly InboxCard[],
): Record<InboxColumnKey, InboxCard[]> {
  const out: Record<InboxColumnKey, InboxCard[]> = {
    orders: [],
    not_orders: [],
    errors: [],
  };
  for (const card of cards) {
    out[card.column].push(card);
  }
  return out;
}

/** Stable card link target: order page if an open order exists, else the WhatsApp thread. */
export function inboxCardHref(card: InboxCard): string {
  if (card.orderId) {
    return `/orders/${encodeURIComponent(card.orderId)}`;
  }
  return "/whatsapp";
}
