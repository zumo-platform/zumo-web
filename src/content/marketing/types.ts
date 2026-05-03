export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] };

export type LegalSection = {
  heading: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  metaTitle: string;
  metaDescription: string;
  title: string;
  updatedLabel: string;
  sections: LegalSection[];
};

export type MarketingMessages = {
  metaDescription: string;
  header: {
    navAriaLabel: string;
    navHowItWorks: string;
    navBuiltFor: string;
    requestAccess: string;
    langSwitcherAria: string;
    langEn: string;
    langEs: string;
  };
  footer: {
    tagline: string;
    legalHeading: string;
    privacy: string;
    terms: string;
    contactHeading: string;
    rights: string;
  };
  home: {
    metaTitle: string;
    badge: string;
    heroBeforeWhatsApp: string;
    heroAfterWhatsAppBeforeZumo: string;
    heroAfterZumo: string;
    subhead: string;
    ctaPrimary: string;
    ctaSecondary: string;
    howEyebrow: string;
    howTitle: string;
    steps: [title: string, description: string][];
    builtEyebrow: string;
    builtTitle: string;
    features: [title: string, description: string][];
    ctaTitle: string;
    ctaSub: string;
    ctaButton: string;
  };
  mockup: {
    ariaPreview: string;
    chatName: string;
    chatStatus: string;
    bubbleText: string;
    timestamp: string;
    draftLabel: string;
    matchBadge: string;
    rows: [product: string, qty: string][];
    deliveryLabel: string;
    deliveryValue: string;
    confirm: string;
  };
};
