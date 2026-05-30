import type { LegalDocument } from "@/content/marketing/types";

import { callout, h3, p, table, ul } from "./helpers";

export const privacyEs: LegalDocument = {
  metaTitle: "Política de privacidad",
  metaDescription: "Cómo ZUMO recopila, usa, almacena y protege tus datos.",
  title: "Política de privacidad",
  label: "Legal",
  effectiveDate: "Fecha de vigencia: 1 de junio de 2026",
  lastUpdated: "Última actualización: 27 de mayo de 2026",
  tocTitle: "Contenido",
  sections: [
    {
      id: "overview",
      heading: "1. Resumen",
      blocks: [
        p(
          "ZUMO es una plataforma B2B que ayuda a proveedores de alimentos y bebidas a gestionar los pedidos recibidos por WhatsApp. Recopilamos únicamente los datos necesarios para operar el servicio, no vendemos tus datos y procesamos los mensajes de WhatsApp exclusivamente para habilitar la gestión de pedidos de nuestros clientes empresariales.",
        ),
        p(
          'Esta Política de privacidad explica cómo ZUMO ("nosotros", "nuestro" o "nos") recopila, usa, almacena y protege la información cuando utilizas nuestra plataforma en **zumob2b.com** y los servicios relacionados (el "Servicio").',
        ),
        p(
          'ZUMO es un servicio de empresa a empresa (B2B). Nuestros clientes son proveedores de alimentos y bebidas ("Proveedores") y sus clientes finales suelen ser compradores de restaurantes y operadores de servicios de alimentos ("Compradores"). Esta política aplica a ambos grupos, así como a cualquier persona que visite nuestro sitio web.',
        ),
      ],
    },
    {
      id: "who-we-are",
      heading: "2. Quiénes somos",
      blocks: [
        p(
          "ZUMO es operado por **ZUMO B2B S.A.**, una empresa registrada en Costa Rica.",
        ),
        p("A efectos del tratamiento de datos, ZUMO actúa como:"),
        ul([
          "**Responsable del tratamiento** de la información sobre cuentas de Proveedores, usuarios de la plataforma y visitantes del sitio web.",
          "**Encargado del tratamiento** en nombre de los Proveedores respecto de los mensajes de WhatsApp y los datos de pedidos de sus Compradores.",
        ]),
      ],
    },
    {
      id: "data-we-collect",
      heading: "3. Datos que recopilamos",
      blocks: [
        h3("3.1 Datos de cuenta y registro"),
        p("Cuando un Proveedor se registra en ZUMO, recopilamos:"),
        ul([
          "Nombre comercial, dirección e información de la entidad legal",
          "Nombre, correo electrónico y rol de los usuarios (p. ej., administrador, ventas, operaciones)",
          "ID de la Cuenta de WhatsApp Business (WABA) y número de teléfono asociado",
          "Contraseña (almacenada de forma cifrada — nunca guardamos contraseñas en texto plano)",
        ]),
        h3("3.2 Datos de mensajería de WhatsApp"),
        p(
          "Cuando un Proveedor conecta su Cuenta de WhatsApp Business a ZUMO, recibimos mensajes entrantes de WhatsApp de los Compradores en nombre del Proveedor. Esto incluye:",
        ),
        ul([
          "Contenido del mensaje (texto, notas de voz, imágenes, PDF) enviado por los Compradores al número de WhatsApp del Proveedor",
          "Números de teléfono del remitente y nombres de contacto de WhatsApp (según los proporcione Meta)",
          "Marcas de tiempo de los mensajes y estado de entrega",
          "Historial de mensajes dentro de una conversación",
        ]),
        h3("3.3 Datos de pedidos"),
        ul([
          "Pedidos en borrador y confirmados creados dentro de la plataforma",
          "Referencias de productos, cantidades, unidades de medida y notas de entrega",
          "Historial de estado del pedido y ediciones del vendedor",
          "Puntuaciones de confianza de líneas de pedido generadas por IA y registros de coincidencias",
        ]),
        h3("3.4 Datos de la plataforma y de uso"),
        ul([
          "Datos de registro: direcciones IP, tipo de navegador, páginas visitadas, marcas de tiempo",
          "Información del dispositivo: tipo de dispositivo, sistema operativo",
          "Patrones de uso de funciones (p. ej., qué filtros de bandeja de entrada se utilizan)",
        ]),
        h3("3.5 Registros de procesamiento de IA"),
        p(
          "Registramos metadatos sobre las llamadas de inferencia de IA, incluidos recuentos de tokens, latencia, identificadores de modelo y salidas estructuradas. Estos datos se utilizan para monitoreo de calidad, gestión de costos y mejora de la plataforma. No incluyen contenido bruto de mensajes más allá de lo necesario para auditoría.",
        ),
      ],
    },
    {
      id: "how-we-use-data",
      heading: "4. Cómo usamos los datos",
      blocks: [
        p("Utilizamos la información que recopilamos para:"),
        ul([
          "**Prestar el Servicio:** recibir y mostrar mensajes de WhatsApp en la bandeja de entrada de ZUMO, crear borradores de pedidos y permitir que los equipos del Proveedor confirmen y gestionen pedidos.",
          "**Procesamiento de pedidos asistido por IA:** clasificar mensajes, extraer líneas de pedido y hacer coincidir referencias de productos con el catálogo del Proveedor mediante microbots impulsados por Amazon Bedrock.",
          "**Mejorar la precisión con el tiempo:** las correcciones realizadas por los usuarios del Proveedor se almacenan como eventos de retroalimentación que mejoran la coincidencia de alias de productos para esa relación específica Proveedor-Comprador.",
          "**Enviar comunicaciones del servicio:** correos electrónicos transaccionales sobre configuración de cuenta, seguridad y cambios importantes en la plataforma.",
          "**Seguridad y prevención de fraude:** detectar actividad sospechosa y proteger la plataforma.",
          "**Cumplimiento legal:** responder a obligaciones legales, órdenes judiciales o solicitudes regulatorias.",
        ]),
        p(
          "**No** utilizamos tus datos para publicidad ni vendemos datos personales a terceros.",
        ),
      ],
    },
    {
      id: "whatsapp-data",
      heading: "5. Datos de WhatsApp y política de la plataforma de Meta",
      blocks: [
        callout(
          "ZUMO se integra con la plataforma Meta WhatsApp Business. Al conectar una Cuenta de WhatsApp Business a ZUMO, el Proveedor autoriza a ZUMO a recibir y procesar mensajes en su nombre a través de la API oficial en la nube de Meta.",
          { title: "**Importante:**" },
        ),
        p("El uso que ZUMO hace de los datos de mensajes de WhatsApp se rige por:"),
        ul([
          "La [Política comercial de WhatsApp](https://www.whatsapp.com/legal/business-policy/) de Meta",
          "Los [Términos de la plataforma](https://developers.facebook.com/terms/) de Meta",
          "Esta Política de privacidad",
        ]),
        p("En particular, respecto de los datos de WhatsApp:"),
        ul([
          "Accedemos a los mensajes de WhatsApp **únicamente** con el fin de prestar el servicio de gestión de pedidos de ZUMO al Proveedor cuya cuenta está conectada.",
          "No utilizamos el contenido de mensajes de WhatsApp para perfilado entre inquilinos, publicidad ni venta a terceros.",
          "Los números de teléfono de los Compradores recibidos por WhatsApp se almacenan por Proveedor y no se comparten entre inquilinos de Proveedores.",
          "Los datos de mensajes de WhatsApp se conservan solo el tiempo necesario para prestar el Servicio y según se describe en la Sección 8.",
          "Los usuarios finales (Compradores) que deseen que sus mensajes se eliminen de ZUMO deben contactar directamente al Proveedor, ya que el Proveedor es el responsable de esa relación de datos.",
        ]),
      ],
    },
    {
      id: "ai-processing",
      heading: "6. Procesamiento de IA y Amazon Bedrock",
      blocks: [
        p(
          "ZUMO utiliza Amazon Bedrock (AWS) para impulsar funciones de IA que incluyen clasificación de mensajes (InboxAI) y extracción de pedidos (OrderAI). Cuando se procesa un mensaje:",
        ),
        ul([
          "El contenido del mensaje y el contexto relevante de la conversación se envían a Amazon Bedrock para inferencia.",
          "La IA devuelve salidas JSON estructuradas (categorías, líneas de pedido extraídas, coincidencias candidatas de productos). Por defecto, no almacena ni entrena con tus datos bajo los términos estándar de procesamiento de datos de AWS.",
          "La IA de ZUMO está limitada a elegir únicamente del catálogo de productos real del Proveedor — no puede inventar ni fabricar SKU.",
          "Todas las decisiones de IA se registran en ZUMO con puntuaciones de confianza y permanecen auditables por el Proveedor.",
          "Se requiere revisión humana para pedidos por debajo de los umbrales de confianza — la IA nunca confirma automáticamente un pedido ambiguo.",
        ]),
        p(
          "Para más información sobre las prácticas de manejo de datos de AWS, consulta el [Aviso de privacidad de AWS](https://aws.amazon.com/privacy/).",
        ),
      ],
    },
    {
      id: "data-sharing",
      heading: "7. Compartición de datos y terceros",
      blocks: [
        p("Compartimos datos únicamente en las siguientes circunstancias:"),
        ul([
          "**Meta / API en la nube de WhatsApp:** ZUMO envía mensajes salientes a los Compradores en nombre de los Proveedores a través de la API de Meta. Esta es la función central de la integración.",
          "**AWS (Amazon Web Services):** Nuestra infraestructura, base de datos (Aurora PostgreSQL), inferencia de IA (Bedrock), almacenamiento de archivos (S3) y procesamiento de colas (SQS) operan en AWS en la región us-east-2.",
          "**BSP / Socio de soluciones:** ZUMO se conecta a través de un Socio de soluciones de WhatsApp Business según lo requiere el modelo de Proveedor tecnológico de Meta. El BSP proporciona la infraestructura de mensajería a nivel de socio. Compartimos únicamente los datos mínimos necesarios para establecer y mantener esta conexión.",
          "**Requisitos legales:** Podemos divulgar datos si la ley, una regulación, una orden judicial o la protección de los derechos y la seguridad de ZUMO, nuestros clientes o el público lo exigen.",
          "**Transferencias empresariales:** En caso de fusión, adquisición o venta de activos, los datos pueden transferirse como parte de esa transacción, sujetos a protecciones de privacidad equivalentes.",
        ]),
        p(
          "No compartimos el contenido de mensajes de Compradores ni datos de pedidos entre inquilinos de Proveedores separados bajo ninguna circunstancia.",
        ),
      ],
    },
    {
      id: "data-retention",
      heading: "8. Retención de datos",
      blocks: [
        table(
          ["Tipo de dato", "Período de retención"],
          [
            ["Datos de cuenta", "Duración de la suscripción + 90 días después de la cancelación"],
            ["Datos de mensajes de WhatsApp", "24 meses desde la recepción"],
            ["Pedidos confirmados", "5 años (registros comerciales y auditoría)"],
            ["Registros de inferencia de IA", "12 meses, luego agregados y anonimizados"],
            ["Datos de uso / registros", "90 días"],
          ],
        ),
        p(
          "Tras la terminación de una cuenta de Proveedor, eliminaremos o anonimizaremos los datos personales dentro de 90 días, salvo que debamos conservarlos por obligaciones legales.",
        ),
      ],
    },
    {
      id: "security",
      heading: "9. Seguridad",
      blocks: [
        p(
          "Implementamos medidas técnicas y organizativas para proteger tus datos, incluidas:",
        ),
        ul([
          "Cifrado de datos en tránsito (TLS 1.2+) y en reposo (AES-256 mediante AWS KMS)",
          "Aislamiento de inquilinos a nivel de base de datos — cada consulta está acotada a un `tenant_id`",
          "Verificación de firma de webhook para todos los eventos entrantes de WhatsApp",
          "Tokens de usuario del sistema (no credenciales personales de empleados) para operaciones de API del backend",
          "Control de acceso basado en roles (administrador, ventas, operaciones, soporte, finanzas)",
          "Alertas automatizadas de anomalías por fallos de webhook e intentos de acceso entre inquilinos",
        ]),
        p(
          "Ningún método de transmisión o almacenamiento es 100% seguro. Si crees que ha ocurrido un incidente de seguridad, notifícanos de inmediato a security@zumob2b.com.",
        ),
      ],
    },
    {
      id: "your-rights",
      heading: "10. Tus derechos",
      blocks: [
        p("Según tu jurisdicción, puedes tener derecho a:"),
        ul([
          "**Acceso:** Solicitar una copia de los datos personales que tenemos sobre ti.",
          "**Rectificación:** Pedirnos que corrijamos datos inexactos.",
          "**Supresión:** Solicitar la eliminación de tus datos personales, sujeto a obligaciones legales de retención.",
          "**Portabilidad:** Recibir tus datos en un formato estructurado y legible por máquina.",
          "**Oposición:** Oponerte a ciertas actividades de procesamiento.",
          "**Limitación:** Pedirnos que limitemos el procesamiento en determinadas circunstancias.",
        ]),
        p(
          "Para ejercer cualquiera de estos derechos, contáctanos en privacy@zumob2b.com. Responderemos dentro de 30 días.",
        ),
        p(
          "Nota: Respecto de los mensajes de WhatsApp y los datos de pedidos que un Proveedor conserva sobre un Comprador, el Proveedor es el responsable del tratamiento. Contacta directamente al Proveedor para solicitudes relacionadas con esos datos.",
        ),
      ],
    },
    {
      id: "childrens-privacy",
      heading: "11. Privacidad de menores",
      blocks: [
        p(
          "ZUMO es un servicio de empresa a empresa destinado exclusivamente a usuarios empresariales adultos. No recopilamos conscientemente datos personales de personas menores de 18 años. Si crees que hemos recibido inadvertidamente datos de un menor, contáctanos de inmediato en privacy@zumob2b.com.",
        ),
      ],
    },
    {
      id: "changes",
      heading: "12. Cambios a esta política",
      blocks: [
        p(
          'Podemos actualizar esta Política de privacidad periódicamente. Cuando realicemos cambios materiales, notificaremos a las cuentas activas de Proveedores por correo electrónico y actualizaremos la fecha de "Última actualización" en la parte superior de esta página. El uso continuado del Servicio después de la fecha de vigencia constituye la aceptación de la política actualizada.',
        ),
      ],
    },
    {
      id: "contact",
      heading: "13. Contáctanos",
      blocks: [
        p("**ZUMO B2B S.A.**"),
        p("San José, Costa Rica"),
        p("Privacidad: privacy@zumob2b.com"),
        p("Seguridad: security@zumob2b.com"),
        p("Sitio web: zumob2b.com"),
      ],
    },
  ],
};
