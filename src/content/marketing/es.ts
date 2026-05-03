import type { MarketingMessages } from "@/content/marketing/types";

export const marketingMessagesEs = {
  metaDescription:
    "Pedidos por WhatsApp para proveedores de alimentos y bebidas",
  header: {
    navAriaLabel: "Navegación de marketing",
    navHowItWorks: "Cómo funciona",
    navBuiltFor: "Para quién es",
    requestAccess: "Solicitar acceso",
    langSwitcherAria: "Idioma",
    langEn: "EN",
    langEs: "ES",
  },
  footer: {
    tagline: "Pedidos por WhatsApp para proveedores de alimentos y bebidas.",
    legalHeading: "Legal",
    privacy: "Privacidad",
    terms: "Términos",
    contactHeading: "Contacto",
    rights: "© 2026 Zumo. Todos los derechos reservados.",
  },
  home: {
    metaTitle: "Pedidos por WhatsApp",
    badge: "Pedidos B2B por WhatsApp",
    heroBeforeWhatsApp: "Tus clientes piden por",
    heroAfterWhatsAppBeforeZumo: ". ",
    heroAfterZumo: "hace el resto.",
    subhead:
      "Zumo convierte las conversaciones de WhatsApp en pedidos confirmados y estructurados automáticamente. Pensado para distribuidores de alimentos y bebidas en Latinoamérica.",
    ctaPrimary: "Solicitar acceso",
    ctaSecondary: "Ver cómo funciona",
    howEyebrow: "Cómo funciona",
    howTitle: "Del mensaje de WhatsApp al pedido confirmado en segundos",
    steps: [
      [
        "El cliente te escribe por WhatsApp",
        "Tus clientes de restaurante piden como siempre, sin app nueva ni portal. Cero fricción.",
      ],
      [
        "La IA extrae el pedido",
        "Zumo lee el mensaje e identifica productos, cantidades, unidades y detalles de entrega con extracción estructurada.",
      ],
      [
        "Tu equipo confirma en segundos",
        "Los vendedores revisan el borrador, ajustan si hace falta y confirman con un clic. Cada corrección mejora la IA.",
      ],
    ],
    builtEyebrow: "Para alimentos y bebidas",
    builtTitle: "Como trabajan de verdad los distribuidores.",
    features: [
      [
        "Bandeja compartida ordenada",
        "Deja atrás el caos de WhatsApp con un espacio de equipo: conversaciones rastreables, asignables y auditables.",
      ],
      [
        "Extracción en español",
        "Entrenada con el lenguaje real de pedidos en Latinoamérica: alias, modismos y abreviaturas incluidos.",
      ],
      [
        "Datos listos para ERP",
        "Pedidos estructurados con SKUs reales, listos para sincronizar con tu ERP o contabilidad.",
      ],
    ],
    ctaTitle: "¿Listos para ordenar los pedidos por WhatsApp?",
    ctaSub:
      "Actualmente incorporamos de forma selecta a distribuidores en Costa Rica y Latinoamérica.",
    ctaButton: "Solicitar acceso anticipado",
  },
  mockup: {
    ariaPreview: "Vista previa: mensaje de WhatsApp a pedido borrador",
    chatName: "Restaurante La Mesa",
    chatStatus: "en línea",
    bubbleText:
      "Hola! Necesito 5 cajas de tomate roma y 2 kg de mozzarella para mañana 🍅🧀",
    timestamp: "10:42",
    draftLabel: "Pedido borrador",
    matchBadge: "98% coincidencia",
    rows: [
      ["Tomate Roma 10kg", "5 cajas"],
      ["Mozzarella 1kg", "2 kg"],
    ],
    deliveryLabel: "Entrega",
    deliveryValue: "Mañana",
    confirm: "Confirmar pedido",
  },
} satisfies MarketingMessages;
