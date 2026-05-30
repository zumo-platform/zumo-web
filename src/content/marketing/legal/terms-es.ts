import type { LegalDocument } from "@/content/marketing/types";

import { callout, h3, p, ul } from "./helpers";

export const termsEs: LegalDocument = {
  metaTitle: "Términos del servicio",
  metaDescription:
    "Términos del servicio para proveedores de alimentos y bebidas que usan ZUMO.",
  title: "Términos del servicio",
  label: "Legal",
  effectiveDate: "Fecha de vigencia: 1 de junio de 2026",
  lastUpdated: "Última actualización: 27 de mayo de 2026",
  tocTitle: "Contenido",
  sections: [
    {
      id: "acceptance",
      heading: "1. Aceptación de los términos",
      blocks: [
        callout(
          "Al crear una cuenta o usar ZUMO, aceptas quedar obligado por estos Términos del servicio y nuestra Política de privacidad. Si aceptas en nombre de una empresa, declaras que tienes la autoridad para obligar a dicha empresa.",
          { title: "**Lee estos Términos con atención.**" },
        ),
        p(
          'Estos Términos del servicio ("Términos") constituyen un acuerdo legalmente vinculante entre tú ("Proveedor", "tú" o "tu") y **ZUMO B2B S.A.** ("ZUMO", "nosotros", "nuestro" o "nos"), que rige tu acceso y uso de la plataforma ZUMO disponible en **zumob2b.com** y las API, aplicaciones móviles y servicios asociados (en conjunto, el "Servicio").',
        ),
        p("Si no aceptas estos Términos, no uses el Servicio."),
      ],
    },
    {
      id: "service",
      heading: "2. El Servicio",
      blocks: [
        p(
          "ZUMO es una plataforma de software de empresa a empresa (B2B) que permite a proveedores de alimentos y bebidas:",
        ),
        ul([
          "Conectar su Cuenta de WhatsApp Business a una bandeja de entrada compartida del equipo",
          "Recibir y gestionar pedidos entrantes de compradores de restaurantes y operadores de servicios de alimentos por WhatsApp",
          "Usar herramientas asistidas por IA para clasificar mensajes, extraer líneas de pedido y hacer coincidir productos con un catálogo",
          "Revisar, confirmar y hacer seguimiento de pedidos a través de un espacio de trabajo web",
          "Gestionar contactos de clientes, catálogos de productos e inventario de almacén",
        ]),
        p(
          "ZUMO está diseñado exclusivamente para uso empresarial. No es un servicio de mensajería para consumidores y no está destinado a fines personales, familiares o domésticos.",
        ),
        p(
          "Nos reservamos el derecho de modificar, suspender o discontinuar cualquier función del Servicio en cualquier momento con un aviso razonable. No seremos responsables ante ti por ninguna modificación, suspensión o discontinuación.",
        ),
      ],
    },
    {
      id: "accounts",
      heading: "3. Cuentas y registro",
      blocks: [
        h3("3.1 Elegibilidad"),
        p(
          "Debes tener al menos 18 años y la autoridad legal para celebrar contratos en nombre de tu empresa para usar ZUMO. Al usar el Servicio, declaras y garantizas que cumples estos requisitos.",
        ),
        h3("3.2 Seguridad de la cuenta"),
        p(
          "Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de toda la actividad que ocurra bajo tu cuenta. Aceptas:",
        ),
        ul([
          "Proporcionar información de cuenta precisa, actual y completa",
          "Actualizar prontamente la información de la cuenta si cambia",
          "Notificarnos de inmediato a security@zumob2b.com si sospechas acceso no autorizado",
          "No compartir tus credenciales con personas no autorizadas",
        ]),
        p(
          "ZUMO no será responsable de ninguna pérdida o daño derivado de tu incumplimiento de estas obligaciones.",
        ),
        h3("3.3 Miembros del equipo"),
        p(
          "Los administradores del Proveedor pueden invitar miembros del equipo (vendedores, operaciones, soporte, finanzas) al espacio de trabajo de ZUMO del Proveedor. Eres responsable de asegurar que todos los miembros del equipo cumplan estos Términos. Los usuarios invitados no están obligados a completar un registro separado en Meta o WhatsApp — todas las operaciones de mensajería se ejecutan a través de la única Cuenta de WhatsApp Business conectada del Proveedor.",
        ),
      ],
    },
    {
      id: "whatsapp",
      heading: "4. Integración con WhatsApp",
      blocks: [
        callout(
          "ZUMO se integra con la plataforma Meta WhatsApp Business. Al conectar tu Cuenta de WhatsApp Business (WABA), otorgas a ZUMO permiso para enviar y recibir mensajes en tu nombre a través de la API oficial en la nube de Meta.",
          { title: "**Tu Cuenta de WhatsApp Business:**" },
        ),
        h3("4.1 Tus obligaciones"),
        p("Al conectar una Cuenta de WhatsApp Business a ZUMO, aceptas:"),
        ul([
          "Cumplir con la [Política comercial de WhatsApp](https://www.whatsapp.com/legal/business-policy/), la [Política comercial](https://www.whatsapp.com/legal/commerce-policy/) y los Términos de la plataforma de Meta aplicables",
          "Usar la integración de WhatsApp únicamente para comunicaciones comerciales legítimas con tus clientes",
          "Obtener los consentimientos requeridos de tus clientes (Compradores) antes de enviarles mensajes por WhatsApp",
          "No usar ZUMO para enviar spam, mensajes masivos no solicitados o contenido prohibido por las políticas de Meta",
          "Cumplir con todas las leyes aplicables sobre comunicaciones electrónicas y marketing en las jurisdicciones donde operas",
          "Usar únicamente plantillas de mensajes de WhatsApp aprobadas para mensajes proactivos salientes fuera de la ventana de servicio al cliente de 24 horas",
        ]),
        h3("4.2 Propiedad"),
        p(
          "Conservas la propiedad y el control de tu Cuenta de WhatsApp Business. ZUMO no es propietario de tu WABA, tu número de teléfono ni tus conversaciones con clientes. Puedes desconectar tu Cuenta de WhatsApp Business de ZUMO en cualquier momento desde la configuración de tu cuenta.",
        ),
        h3("4.3 Rol de Meta"),
        p(
          "ZUMO no está afiliado ni respaldado por Meta Platforms, Inc. Tu uso de WhatsApp se rige adicionalmente por los propios términos y políticas de Meta. ZUMO no es responsable de cambios en la plataforma de Meta, la disponibilidad de la API ni la aplicación de políticas de WhatsApp.",
        ),
      ],
    },
    {
      id: "acceptable-use",
      heading: "5. Uso aceptable",
      blocks: [
        p("Aceptas no usar el Servicio para:"),
        ul([
          "Violar cualquier ley, regulación o derecho de terceros aplicable",
          "Transmitir spam, mensajes de phishing o comunicaciones engañosas",
          "Intentar obtener acceso no autorizado a cualquier sistema, cuenta o dato",
          "Interferir o interrumpir la integridad o el rendimiento del Servicio",
          "Cargar o transmitir código malicioso, virus o contenido dañino",
          "Suplantar a otra empresa o persona",
          "Eludir cualquier función de seguridad, limitación de tasa o control de acceso",
          "Revender o comercializar el Servicio bajo marca blanca sin autorización previa por escrito de ZUMO",
          "Usar las funciones de IA para generar o difundir información falsa, engañosa o fraudulenta",
        ]),
        p(
          "La violación de esta sección puede resultar en la suspensión o terminación inmediata de tu cuenta a exclusivo criterio de ZUMO.",
        ),
      ],
    },
    {
      id: "data",
      heading: "6. Datos y privacidad",
      blocks: [
        p(
          "Tu uso del Servicio también se rige por nuestra [Política de privacidad](/es/privacy), que se incorpora a estos Términos por referencia.",
        ),
        h3("6.1 Tus datos"),
        p(
          'Conservas la propiedad de todos los datos que cargas o creas dentro de ZUMO, incluido tu catálogo de productos, contactos de clientes e historial de pedidos ("Tus datos"). Otorgas a ZUMO una licencia limitada, no exclusiva, para almacenar, procesar y usar Tus datos únicamente para prestar y mejorar el Servicio.',
        ),
        h3("6.2 Tratamiento de datos"),
        p(
          "Respecto de los datos personales de tus clientes (Compradores) que procesas a través de ZUMO, tú eres el responsable del tratamiento y ZUMO actúa como tu encargado del tratamiento. Eres responsable de asegurar que tienes una base legal para procesar dichos datos y de cumplir con las leyes de protección de datos aplicables.",
        ),
        h3("6.3 Exportación de datos"),
        p(
          "Puedes exportar tus datos de pedidos, contactos de clientes y catálogo de productos en cualquier momento desde la configuración de tu cuenta. Tras la terminación, proporcionaremos una ventana de 90 días para la exportación de datos antes de la eliminación.",
        ),
      ],
    },
    {
      id: "ai",
      heading: "7. Funciones de IA",
      blocks: [
        callout(
          "Las funciones de IA de ZUMO están diseñadas para asistir a tu equipo, no para reemplazar el criterio humano. Los borradores de pedidos generados por IA deben ser revisados y confirmados por un usuario humano antes de tratarse como pedidos confirmados. No confíes únicamente en las salidas de IA para decisiones críticas del negocio.",
          { title: "**Se requiere revisión humana:**", variant: "warning" },
        ),
        p(
          "ZUMO utiliza IA para asistir con la clasificación de mensajes y la extracción de pedidos. Entiendes y aceptas que:",
        ),
        ul([
          "Las salidas de IA (borradores de pedidos, sugerencias de coincidencia de productos, clasificaciones de mensajes) son sugerencias, no decisiones finales",
          "ZUMO no garantiza la exactitud del contenido generado por IA",
          "Eres responsable de revisar y confirmar todos los pedidos antes de que se traten como confirmados",
          "Tus correcciones y ediciones se utilizan para mejorar la precisión de coincidencias para tus relaciones específicas Proveedor-Comprador (memoria de relación)",
          "La IA de ZUMO está limitada a seleccionar únicamente de tu catálogo de productos real — no inventará productos",
        ]),
      ],
    },
    {
      id: "ip",
      heading: "8. Propiedad intelectual",
      blocks: [
        h3("8.1 PI de ZUMO"),
        p(
          "La plataforma ZUMO, incluido su software, diseño, modelos de IA, documentación y marca, es propiedad de ZUMO B2B S.A. y está protegida por las leyes de propiedad intelectual. Estos Términos no te transfieren ningún derecho de propiedad. Recibes únicamente una licencia limitada, revocable, no exclusiva e intransferible para usar el Servicio según se describe aquí.",
        ),
        h3("8.2 Tu PI"),
        p(
          "Conservas todos los derechos sobre Tus datos. ZUMO no reclama propiedad sobre tu catálogo de productos, datos de clientes, historial de pedidos u otro contenido que proporciones.",
        ),
        h3("8.3 Retroalimentación"),
        p(
          "Si proporcionas retroalimentación, sugerencias o ideas sobre el Servicio, otorgas a ZUMO una licencia irrestricta, perpetua y libre de regalías para usar dicha retroalimentación para cualquier fin sin compensación para ti.",
        ),
      ],
    },
    {
      id: "payment",
      heading: "9. Pago y facturación",
      blocks: [
        p(
          "Los términos de suscripción de pago, precios, ciclos de facturación y políticas de reembolso se establecerán en un Formulario de pedido o acuerdo de suscripción separado presentado al momento de la compra. Esos términos de pago se incorporan a estos Términos por referencia.",
        ),
        p(
          "El incumplimiento del pago de las tarifas de suscripción cuando corresponda puede resultar en la suspensión de tu cuenta. Proporcionaremos al menos 7 días de aviso antes de suspender el acceso por falta de pago.",
        ),
      ],
    },
    {
      id: "termination",
      heading: "10. Terminación",
      blocks: [
        h3("10.1 Por ti"),
        p(
          "Puedes cancelar tu suscripción de ZUMO en cualquier momento a través de la configuración de tu cuenta o contactando a support@zumob2b.com. La cancelación entra en vigor al final del período de facturación actual.",
        ),
        h3("10.2 Por ZUMO"),
        p("Podemos suspender o terminar tu cuenta de inmediato si:"),
        ul([
          "Incumples materialmente estos Términos y no subsanas el incumplimiento dentro de 10 días tras la notificación",
          "Violas la Política comercial de WhatsApp de Meta de una manera que pone en riesgo el estatus de la plataforma de ZUMO",
          "Participas en actividad fraudulenta, abusiva o ilegal",
          "No pagas las tarifas cuando corresponda",
        ]),
        h3("10.3 Efecto de la terminación"),
        p(
          "Tras la terminación, tu derecho a usar el Servicio cesa. Proporcionaremos un período de 90 días durante el cual podrás exportar tus datos. Después de ese período, tus datos serán eliminados según se describe en nuestra Política de privacidad.",
        ),
      ],
    },
    {
      id: "disclaimers",
      heading: "11. Exenciones de responsabilidad",
      blocks: [
        callout(
          'EL SERVICIO SE PROPORCIONA "TAL CUAL" Y "SEGÚN DISPONIBILIDAD" SIN GARANTÍAS DE NINGÚN TIPO, EXPRESAS O IMPLÍCITAS. EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, ZUMO RENUNCIA A TODAS LAS GARANTÍAS, INCLUIDAS, ENTRE OTRAS, LAS GARANTÍAS IMPLÍCITAS DE COMERCIABILIDAD, IDONEIDAD PARA UN FIN PARTICULAR Y NO INFRACCIÓN.',
          { variant: "warning" },
        ),
        p("ZUMO no garantiza que:"),
        ul([
          "El Servicio será ininterrumpido, libre de errores o seguro",
          "Las salidas generadas por IA serán exactas, completas o adecuadas para un fin particular",
          "El Servicio cumplirá tus requisitos empresariales específicos",
          "Cualquier error será corregido dentro de un plazo específico",
        ]),
        p(
          "ZUMO no es responsable de las acciones u omisiones de Meta Platforms, WhatsApp ni de ninguna integración de terceros.",
        ),
      ],
    },
    {
      id: "liability",
      heading: "12. Limitación de responsabilidad",
      blocks: [
        p(
          "EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY APLICABLE, EN NINGÚN CASO ZUMO B2B S.A., SUS DIRECTORES, EMPLEADOS O AGENTES SERÁN RESPONSABLES DE DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, CONSECUENCIALES O PUNITIVOS, INCLUIDA LA PÉRDIDA DE BENEFICIOS, DATOS O FONDO DE COMERCIO, DERIVADOS DE TU USO O INCAPACIDAD DE USAR EL SERVICIO.",
        ),
        p(
          "En jurisdicciones que no permiten la exclusión de ciertos daños, la responsabilidad total de ZUMO ante ti por todas las reclamaciones derivadas de o relacionadas con el Servicio no excederá el mayor de (a) el monto que pagaste a ZUMO en los 12 meses anteriores a la reclamación, o (b) USD $100.",
        ),
      ],
    },
    {
      id: "indemnification",
      heading: "13. Indemnización",
      blocks: [
        p(
          "Aceptas defender, indemnizar y mantener indemne a ZUMO B2B S.A. y a sus directores, empleados y agentes frente a cualquier reclamación, daños, pérdidas, responsabilidades, costos y gastos (incluidos honorarios razonables de abogados) derivados de:",
        ),
        ul([
          "Tu uso del Servicio en violación de estos Términos",
          "Tu violación de cualquier ley aplicable o derecho de terceros",
          "Tu uso de la integración de WhatsApp en violación de las políticas de Meta",
          "Cualquier dato que envíes o proceses a través del Servicio",
        ]),
      ],
    },
    {
      id: "governing-law",
      heading: "14. Ley aplicable y resolución de disputas",
      blocks: [
        p(
          "Estos Términos se regirán e interpretarán de acuerdo con las leyes de **Costa Rica**, sin tener en cuenta los principios de conflicto de leyes.",
        ),
        p(
          "Cualquier disputa derivada de estos Términos o de tu uso del Servicio estará sujeta primero a una negociación de buena fe entre las partes durante al menos 30 días. Si no se resuelve, las disputas se someterán a los tribunales de jurisdicción competente en San José, Costa Rica.",
        ),
      ],
    },
    {
      id: "changes",
      heading: "15. Cambios a estos Términos",
      blocks: [
        p(
          "Podemos actualizar estos Términos periódicamente. Notificaremos a las cuentas activas de Proveedores sobre cambios materiales por correo electrónico al menos 14 días antes de que los cambios entren en vigor. Tu uso continuado del Servicio después de la fecha de vigencia constituye la aceptación de los Términos actualizados.",
        ),
        p(
          "Si no aceptas los Términos actualizados, debes dejar de usar el Servicio y cancelar tu cuenta antes de la fecha de vigencia.",
        ),
      ],
    },
    {
      id: "contact",
      heading: "16. Contáctanos",
      blocks: [
        p("Para preguntas sobre estos Términos o el Servicio:"),
        p("**ZUMO B2B S.A.**"),
        p("San José, Costa Rica"),
        p("Correo electrónico: legal@zumob2b.com"),
        p("Soporte: support@zumob2b.com"),
        p("Sitio web: [zumob2b.com](https://zumob2b.com)"),
      ],
    },
  ],
};
