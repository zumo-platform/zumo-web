import type { LegalDocument } from "@/content/marketing/types";
import type { MarketingLocale } from "@/lib/marketing-locale";

const EMAIL = "hello@zumob2b.com";

export const privacyDocument: Record<MarketingLocale, LegalDocument> = {
  en: {
    metaTitle: "Privacy Policy",
    metaDescription: "How Zumo collects, uses, and protects your data.",
    title: "Privacy Policy",
    updatedLabel: "Last updated: May 2026",
    sections: [
      {
        heading: "1. Introduction",
        blocks: [
          {
            kind: "p",
            text: `Zumo ("we", "our", "us") operates zumob2b.com and provides a WhatsApp-first ordering platform for food and beverage suppliers. This policy explains how we collect, use, and protect your information.`,
          },
        ],
      },
      {
        heading: "2. Information we collect",
        blocks: [
          {
            kind: "ul",
            items: [
              "Business information: company name, address, contact details",
              "Communication data: WhatsApp messages processed through our platform",
              "Order data: products, quantities, delivery information extracted from messages",
              "Usage data: how you interact with our platform",
              "Technical data: IP addresses, browser type, device information",
            ],
          },
        ],
      },
      {
        heading: "3. How we use your information",
        blocks: [
          {
            kind: "ul",
            items: [
              "To provide and operate the Zumo platform",
              "To process orders from WhatsApp messages using AI",
              "To improve our AI matching and extraction accuracy",
              "To communicate with you about your account and orders",
              "To comply with legal obligations",
            ],
          },
        ],
      },
      {
        heading: "4. Data sharing",
        blocks: [
          { kind: "p", text: "We share your data only with:" },
          {
            kind: "ul",
            items: [
              "Amazon Web Services (AWS): cloud infrastructure and AI processing",
              "Meta / WhatsApp: messaging infrastructure",
              "Amazon Bedrock: AI model processing for order extraction",
            ],
          },
          {
            kind: "p",
            text: "We do not sell your personal data to third parties.",
          },
        ],
      },
      {
        heading: "5. Data retention",
        blocks: [
          {
            kind: "p",
            text: `We retain your data for as long as your account is active or as required by law. You may request deletion by contacting ${EMAIL}.`,
          },
        ],
      },
      {
        heading: "6. Your rights",
        blocks: [
          {
            kind: "p",
            text: `You have the right to access, correct, or delete your personal data. Contact us at ${EMAIL} to exercise these rights.`,
          },
        ],
      },
      {
        heading: "7. Security",
        blocks: [
          {
            kind: "p",
            text: "We use industry-standard encryption and security practices including HTTPS, encrypted data storage, and access controls to protect your data.",
          },
        ],
      },
      {
        heading: "8. WhatsApp data",
        blocks: [
          {
            kind: "p",
            text: "Messages processed through Zumo are transmitted via Meta's WhatsApp Business API. By using Zumo, you consent to this processing. We do not store message content longer than necessary for order processing and audit requirements.",
          },
        ],
      },
      {
        heading: "9. Contact",
        blocks: [
          {
            kind: "p",
            text: `For privacy questions: ${EMAIL}`,
          },
          {
            kind: "p",
            text: "Zumo — zumob2b.com — Costa Rica",
          },
        ],
      },
    ],
  },
  es: {
    metaTitle: "Política de privacidad",
    metaDescription:
      "Cómo Zumo recopila, usa y protege tus datos en la plataforma de pedidos por WhatsApp.",
    title: "Política de privacidad",
    updatedLabel: "Última actualización: mayo de 2026",
    sections: [
      {
        heading: "1. Introducción",
        blocks: [
          {
            kind: "p",
            text: `Zumo («nosotros», «nuestro») opera zumob2b.com y ofrece una plataforma de pedidos centrada en WhatsApp para proveedores de alimentos y bebidas. Esta política explica cómo recopilamos, usamos y protegemos tu información.`,
          },
        ],
      },
      {
        heading: "2. Información que recopilamos",
        blocks: [
          {
            kind: "ul",
            items: [
              "Información comercial: nombre de la empresa, dirección y datos de contacto",
              "Datos de comunicación: mensajes de WhatsApp procesados en nuestra plataforma",
              "Datos de pedidos: productos, cantidades e información de entrega extraída de los mensajes",
              "Datos de uso: cómo interactúas con la plataforma",
              "Datos técnicos: direcciones IP, tipo de navegador e información del dispositivo",
            ],
          },
        ],
      },
      {
        heading: "3. Cómo usamos tu información",
        blocks: [
          {
            kind: "ul",
            items: [
              "Para proporcionar y operar la plataforma Zumo",
              "Para procesar pedidos a partir de mensajes de WhatsApp mediante IA",
              "Para mejorar la precisión del emparejamiento y la extracción con IA",
              "Para comunicarnos contigo sobre tu cuenta y tus pedidos",
              "Para cumplir obligaciones legales",
            ],
          },
        ],
      },
      {
        heading: "4. Compartición de datos",
        blocks: [
          { kind: "p", text: "Compartimos tus datos únicamente con:" },
          {
            kind: "ul",
            items: [
              "Amazon Web Services (AWS): infraestructura en la nube y procesamiento de IA",
              "Meta / WhatsApp: infraestructura de mensajería",
              "Amazon Bedrock: procesamiento de modelos de IA para la extracción de pedidos",
            ],
          },
          {
            kind: "p",
            text: "No vendemos tus datos personales a terceros.",
          },
        ],
      },
      {
        heading: "5. Conservación de datos",
        blocks: [
          {
            kind: "p",
            text: `Conservamos tus datos mientras tu cuenta esté activa o según lo exija la ley. Puedes solicitar su eliminación escribiendo a ${EMAIL}.`,
          },
        ],
      },
      {
        heading: "6. Tus derechos",
        blocks: [
          {
            kind: "p",
            text: `Tienes derecho a acceder, rectificar o eliminar tus datos personales. Escríbenos a ${EMAIL} para ejercer estos derechos.`,
          },
        ],
      },
      {
        heading: "7. Seguridad",
        blocks: [
          {
            kind: "p",
            text: "Utilizamos cifrado y prácticas de seguridad reconocidas en la industria, incluidos HTTPS, almacenamiento cifrado y controles de acceso para proteger tus datos.",
          },
        ],
      },
      {
        heading: "8. Datos de WhatsApp",
        blocks: [
          {
            kind: "p",
            text: "Los mensajes procesados en Zumo se transmiten mediante la API de WhatsApp Business de Meta. Al usar Zumo, consientes este tratamiento. No conservamos el contenido de los mensajes más tiempo del necesario para procesar pedidos y fines de auditoría.",
          },
        ],
      },
      {
        heading: "9. Contacto",
        blocks: [
          {
            kind: "p",
            text: `Consultas de privacidad: ${EMAIL}`,
          },
          {
            kind: "p",
            text: "Zumo — zumob2b.com — Costa Rica",
          },
        ],
      },
    ],
  },
};

export const termsDocument: Record<MarketingLocale, LegalDocument> = {
  en: {
    metaTitle: "Terms of Service",
    metaDescription: "Zumo terms of service for food and beverage suppliers.",
    title: "Terms of Service",
    updatedLabel: "Last updated: May 2026",
    sections: [
      {
        heading: "1. Acceptance",
        blocks: [
          {
            kind: "p",
            text: "By using Zumo, you agree to these terms. If you don't agree, please don't use the service.",
          },
        ],
      },
      {
        heading: "2. Description of service",
        blocks: [
          {
            kind: "p",
            text: "Zumo is a WhatsApp-first ordering platform for food and beverage suppliers. We provide tools to receive, process, and confirm orders from WhatsApp messages using AI.",
          },
        ],
      },
      {
        heading: "3. Account responsibilities",
        blocks: [
          {
            kind: "ul",
            items: [
              "You are responsible for maintaining the security of your account credentials",
              "You must provide accurate and complete business information",
              "You are responsible for all activity that occurs under your account",
            ],
          },
        ],
      },
      {
        heading: "4. Acceptable use",
        blocks: [
          { kind: "p", text: "You may not use Zumo to:" },
          {
            kind: "ul",
            items: [
              "Send spam or unsolicited messages",
              "Violate WhatsApp's terms of service or Meta's policies",
              "Process illegal transactions",
              "Impersonate other businesses or individuals",
              "Attempt to reverse engineer or compromise the platform",
            ],
          },
        ],
      },
      {
        heading: "5. WhatsApp integration",
        blocks: [
          {
            kind: "p",
            text: "Zumo integrates with WhatsApp Business API. Your use of WhatsApp through Zumo is subject to Meta's Terms of Service and WhatsApp Business Policy in addition to these terms.",
          },
        ],
      },
      {
        heading: "6. Data processing",
        blocks: [
          {
            kind: "p",
            text: "By using Zumo, you authorize us to process WhatsApp messages and order data as described in our Privacy Policy.",
          },
        ],
      },
      {
        heading: "7. Intellectual property",
        blocks: [
          {
            kind: "p",
            text: "Zumo and its original content, features, and functionality are owned by Zumo and protected by applicable intellectual property laws.",
          },
        ],
      },
      {
        heading: "8. Service availability",
        blocks: [
          {
            kind: "p",
            text: "We strive for high availability but do not guarantee uninterrupted service. We are not liable for downtime or data loss beyond our reasonable control.",
          },
        ],
      },
      {
        heading: "9. Limitation of liability",
        blocks: [
          {
            kind: "p",
            text: "Zumo is not liable for indirect, incidental, special, or consequential damages arising from your use of the service.",
          },
        ],
      },
      {
        heading: "10. Changes to terms",
        blocks: [
          {
            kind: "p",
            text: "We may update these terms. Continued use of Zumo after changes constitutes acceptance of the new terms.",
          },
        ],
      },
      {
        heading: "11. Governing law",
        blocks: [
          {
            kind: "p",
            text: "These terms are governed by the laws of Costa Rica.",
          },
        ],
      },
      {
        heading: "12. Contact",
        blocks: [
          {
            kind: "p",
            text: EMAIL,
          },
          {
            kind: "p",
            text: "Zumo — zumob2b.com — Costa Rica",
          },
        ],
      },
    ],
  },
  es: {
    metaTitle: "Términos del servicio",
    metaDescription: "Términos del servicio de Zumo para proveedores de alimentos y bebidas.",
    title: "Términos del servicio",
    updatedLabel: "Última actualización: mayo de 2026",
    sections: [
      {
        heading: "1. Aceptación",
        blocks: [
          {
            kind: "p",
            text: "Al usar Zumo aceptas estos términos. Si no estás de acuerdo, no utilices el servicio.",
          },
        ],
      },
      {
        heading: "2. Descripción del servicio",
        blocks: [
          {
            kind: "p",
            text: "Zumo es una plataforma de pedidos centrada en WhatsApp para proveedores de alimentos y bebidas. Ofrecemos herramientas para recibir, procesar y confirmar pedidos a partir de mensajes de WhatsApp mediante IA.",
          },
        ],
      },
      {
        heading: "3. Responsabilidades de la cuenta",
        blocks: [
          {
            kind: "ul",
            items: [
              "Eres responsable de mantener la seguridad de las credenciales de tu cuenta",
              "Debes proporcionar información comercial veraz y completa",
              "Eres responsable de toda la actividad realizada bajo tu cuenta",
            ],
          },
        ],
      },
      {
        heading: "4. Uso aceptable",
        blocks: [
          { kind: "p", text: "No puedes usar Zumo para:" },
          {
            kind: "ul",
            items: [
              "Enviar spam o mensajes no solicitados",
              "Violar los términos de WhatsApp o las políticas de Meta",
              "Procesar transacciones ilegales",
              "Suplantar a otras empresas o personas",
              "Intentar hacer ingeniería inversa o comprometer la plataforma",
            ],
          },
        ],
      },
      {
        heading: "5. Integración con WhatsApp",
        blocks: [
          {
            kind: "p",
            text: "Zumo se integra con la API de WhatsApp Business. Tu uso de WhatsApp a través de Zumo también está sujeto a los Términos del Servicio de Meta y a la Política de WhatsApp Business, además de estos términos.",
          },
        ],
      },
      {
        heading: "6. Tratamiento de datos",
        blocks: [
          {
            kind: "p",
            text: "Al usar Zumo nos autorizas a tratar mensajes de WhatsApp y datos de pedidos como se describe en nuestra Política de privacidad.",
          },
        ],
      },
      {
        heading: "7. Propiedad intelectual",
        blocks: [
          {
            kind: "p",
            text: "Zumo y su contenido, características y funcionalidad originales son propiedad de Zumo y están protegidos por las leyes de propiedad intelectual aplicables.",
          },
        ],
      },
      {
        heading: "8. Disponibilidad del servicio",
        blocks: [
          {
            kind: "p",
            text: "Buscamos una alta disponibilidad, pero no garantizamos un servicio ininterrumpido. No somos responsables por tiempos de inactividad o pérdida de datos fuera de nuestro control razonable.",
          },
        ],
      },
      {
        heading: "9. Limitación de responsabilidad",
        blocks: [
          {
            kind: "p",
            text: "Zumo no será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso del servicio.",
          },
        ],
      },
      {
        heading: "10. Cambios a los términos",
        blocks: [
          {
            kind: "p",
            text: "Podemos actualizar estos términos. El uso continuado de Zumo tras los cambios implica la aceptación de los nuevos términos.",
          },
        ],
      },
      {
        heading: "11. Ley aplicable",
        blocks: [
          {
            kind: "p",
            text: "Estos términos se rigen por las leyes de Costa Rica.",
          },
        ],
      },
      {
        heading: "12. Contacto",
        blocks: [
          {
            kind: "p",
            text: EMAIL,
          },
          {
            kind: "p",
            text: "Zumo — zumob2b.com — Costa Rica",
          },
        ],
      },
    ],
  },
};
