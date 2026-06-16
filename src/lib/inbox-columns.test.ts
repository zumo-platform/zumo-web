import { describe, expect, it } from "vitest";

import type { InboxCard } from "./dashboard-inbox";
import { buildInboxColumns, inboxCardHref } from "./inbox-columns";

const card = (over: Partial<InboxCard>): InboxCard => ({
  conversationId: "c1",
  column: "not_orders",
  customerId: 1,
  customerName: "Soda Tica",
  contactName: "Maria",
  customerPhone: "+50688887777",
  isUnknownCustomer: false,
  latestIntent: "question",
  summary: null,
  lastMessageAt: null,
  orderId: null,
  orderDisplayCode: null,
  orderStatus: null,
  productNames: [],
  productSkus: [],
  hasAiFailure: false,
  ...over,
});

describe("buildInboxColumns", () => {
  it("groups cards by column", () => {
    const cols = buildInboxColumns([
      card({ column: "orders", orderId: "o1" }),
      card({ column: "errors", latestIntent: "complaint" }),
      card({ column: "not_orders" }),
      card({ column: "orders", orderId: "o2" }),
    ]);
    expect(cols.orders).toHaveLength(2);
    expect(cols.errors).toHaveLength(1);
    expect(cols.not_orders).toHaveLength(1);
  });
});

describe("inboxCardHref", () => {
  it("links to the order page when an order exists", () => {
    expect(inboxCardHref(card({ orderId: "order_123" }))).toBe("/orders/order_123");
  });
  it("links to WhatsApp otherwise", () => {
    expect(inboxCardHref(card({ orderId: null }))).toBe("/whatsapp");
  });
});
