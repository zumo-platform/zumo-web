import type { MarketingMessages } from "@/content/marketing/types";

export const marketingMessagesEn = {
  metaDescription: "WhatsApp ordering for food & beverage suppliers",
  header: {
    navAriaLabel: "Marketing navigation",
    navHowItWorks: "How it works",
    navBuiltFor: "Built for",
    requestAccess: "Request access",
    langSwitcherAria: "Language",
    langEn: "EN",
    langEs: "ES",
  },
  footer: {
    tagline: "WhatsApp ordering for food & beverage suppliers.",
    legalHeading: "Legal",
    privacy: "Privacy",
    terms: "Terms",
    contactHeading: "Contact",
    rights: "© 2026 Zumo. All rights reserved.",
  },
  home: {
    metaTitle: "WhatsApp-first ordering",
    badge: "WhatsApp-first B2B ordering",
    heroBeforeWhatsApp: "Your customers order on",
    heroAfterWhatsAppBeforeZumo: ". ",
    heroAfterZumo: "handles the rest.",
    subhead:
      "Zumo turns WhatsApp conversations into structured, confirmed orders automatically. Built for food & beverage distributors in Latin America.",
    ctaPrimary: "Request access",
    ctaSecondary: "See how it works",
    howEyebrow: "How it works",
    howTitle: "From WhatsApp message to confirmed order in seconds",
    steps: [
      [
        "Customer messages you on WhatsApp",
        "Your restaurant clients order naturally, the way they already talk to you. No new app, no portal, no friction.",
      ],
      [
        "AI extracts the order",
        "Zumo reads the message and identifies products, quantities, units, and delivery details with structured AI extraction.",
      ],
      [
        "Your team confirms in seconds",
        "Sellers review the draft, edit if needed, and confirm with one click. Every correction makes the AI smarter.",
      ],
    ],
    builtEyebrow: "Built for food & beverage",
    builtTitle: "The way distributors actually work.",
    features: [
      [
        "Structured shared inbox",
        "Replace WhatsApp chaos with a team workspace. Every conversation tracked, assigned, and auditable.",
      ],
      [
        "AI extraction in Spanish",
        "Trained on real Latin American food and beverage ordering language. Aliases, slang, abbreviations all handled.",
      ],
      [
        "ERP-ready order data",
        "Orders are structured with real SKU mappings, ready to sync with your existing ERP or accounting system.",
      ],
    ],
    ctaTitle: "Ready to streamline your WhatsApp orders?",
    ctaSub:
      "Currently onboarding select food & beverage distributors in Costa Rica and Latin America.",
    ctaButton: "Request early access",
  },
  mockup: {
    ariaPreview: "Product preview: WhatsApp message to draft order",
    chatName: "Restaurante La Mesa",
    chatStatus: "online",
    bubbleText:
      "Hola! Necesito 5 cajas de tomate roma y 2 kg de mozzarella para mañana 🍅🧀",
    timestamp: "10:42",
    draftLabel: "Draft order",
    matchBadge: "98% match",
    rows: [
      ["Tomate Roma 10kg", "5 cajas"],
      ["Mozzarella 1kg", "2 kg"],
    ],
    deliveryLabel: "Delivery",
    deliveryValue: "Tomorrow",
    confirm: "Confirm order",
  },
} satisfies MarketingMessages;
