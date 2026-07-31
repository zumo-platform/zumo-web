import { describe, expect, it } from "vitest";

import {
  mergeDraftInboxCardWithApiCard,
  normalizeInboxCard,
  type InboxCard,
} from "./dashboard-inbox";

const baseCard = (): InboxCard => ({
  conversationId: "conv-1",
  column: "orders",
  customerId: 1,
  customerName: "Cliente Demo",
  contactName: "",
  customerPhone: "+50688887777",
  isUnknownCustomer: false,
  latestIntent: "order_new",
  summary: null,
  lastMessageAt: "2026-07-29T19:14:00.000Z",
  orderId: "order-1",
  orderDisplayCode: "RJM7186",
  orderStatus: "draft",
  productNames: [],
  productSkus: [],
  hasAiFailure: false,
  channel: "whatsapp",
  subject: null,
  senderEmail: null,
  senderTrust: null,
});

describe("normalizeInboxCard", () => {
  it("keeps WhatsApp when customer contact stores an email address", () => {
    const normalized = normalizeInboxCard({
      ...baseCard(),
      channel: "whatsapp",
      customerPhone: "ricardomurillo13@gmail.com",
      senderEmail: null,
    });
    expect(normalized.channel).toBe("whatsapp");
    expect(normalized.senderEmail).toBeNull();
  });

  it("classifies email when API channel is email", () => {
    const normalized = normalizeInboxCard({
      ...baseCard(),
      channel: "email",
      senderEmail: "buyer@example.com",
      subject: "Pedido semanal",
    });
    expect(normalized.channel).toBe("email");
    expect(normalized.senderEmail).toBe("buyer@example.com");
  });

  it("keeps WhatsApp when API explicitly says whatsapp even with senderEmail", () => {
    const normalized = normalizeInboxCard({
      ...baseCard(),
      channel: "whatsapp",
      senderEmail: "buyer@example.com",
    });
    expect(normalized.channel).toBe("whatsapp");
    expect(normalized.senderEmail).toBeNull();
  });
});

describe("mergeDraftInboxCardWithApiCard", () => {
  it("prefers draft order source channel over misclassified API card", () => {
    const draft = baseCard();
    const api: InboxCard = {
      ...baseCard(),
      channel: "email",
      senderEmail: "ricardomurillo13@gmail.com",
      subject: "Pedido",
      senderTrust: "known_contact",
    };

    const merged = mergeDraftInboxCardWithApiCard(draft, api);
    expect(merged.channel).toBe("whatsapp");
    expect(merged.senderEmail).toBeNull();
    expect(merged.subject).toBeNull();
  });
});
