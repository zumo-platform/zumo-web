import type { LegalDocument } from "@/content/marketing/types";

import { callout, h3, p, table, ul } from "./helpers";

export const privacyEn: LegalDocument = {
  metaTitle: "Privacy Policy",
  metaDescription: "How ZUMO collects, uses, stores, and protects your data.",
  title: "Privacy Policy",
  label: "Legal",
  effectiveDate: "Effective date: June 1, 2026",
  lastUpdated: "Last updated: May 27, 2026",
  tocTitle: "Contents",
  sections: [
    {
      id: "overview",
      heading: "1. Overview",
      blocks: [
        p(
          "ZUMO is a B2B platform that helps food and beverage suppliers manage orders received through WhatsApp. We collect only the data necessary to operate the service, we do not sell your data, and we process WhatsApp messages solely to enable order management for our business customers.",
        ),
        p(
          'This Privacy Policy explains how ZUMO ("we," "our," or "us") collects, uses, stores, and protects information when you use our platform at **zumob2b.com** and related services (the "Service").',
        ),
        p(
          'ZUMO is a business-to-business (B2B) service. Our customers are food and beverage suppliers ("Suppliers") and their end customers are typically restaurant buyers and foodservice operators ("Buyers"). This policy applies to both groups as well as any individual who visits our website.',
        ),
      ],
    },
    {
      id: "who-we-are",
      heading: "2. Who We Are",
      blocks: [
        p(
          "ZUMO is operated by **ZUMO B2B S.A.**, a company registered in Costa Rica.",
        ),
        p("For purposes of data processing, ZUMO acts as:"),
        ul([
          "A **data controller** for information about Supplier accounts, platform users, and website visitors.",
          "A **data processor** on behalf of Suppliers for the WhatsApp messages and order data of their Buyers.",
        ]),
      ],
    },
    {
      id: "data-we-collect",
      heading: "3. Data We Collect",
      blocks: [
        h3("3.1 Account & Registration Data"),
        p("When a Supplier signs up for ZUMO, we collect:"),
        ul([
          "Business name, address, and legal entity information",
          "Name, email address, and role of users (e.g., admin, sales, operations)",
          "WhatsApp Business Account (WABA) ID and associated phone number",
          "Password (stored in hashed form — we never store plaintext passwords)",
        ]),
        h3("3.2 WhatsApp Messaging Data"),
        p(
          "When a Supplier connects their WhatsApp Business Account to ZUMO, we receive inbound WhatsApp messages from Buyers on the Supplier's behalf. This includes:",
        ),
        ul([
          "Message content (text, voice notes, images, PDFs) sent by Buyers to the Supplier's WhatsApp number",
          "Sender phone numbers and WhatsApp contact names (as provided by Meta)",
          "Message timestamps and delivery status",
          "Message thread history within a conversation",
        ]),
        h3("3.3 Order Data"),
        ul([
          "Draft and confirmed orders created within the platform",
          "Product references, quantities, units of measure, and delivery notes",
          "Order status history and seller edits",
          "AI-generated order line confidence scores and match logs",
        ]),
        h3("3.4 Platform & Usage Data"),
        ul([
          "Log data: IP addresses, browser type, pages visited, timestamps",
          "Device information: device type, operating system",
          "Feature usage patterns (e.g., which inbox filters are used)",
        ]),
        h3("3.5 AI Processing Logs"),
        p(
          "We record metadata about AI inference calls, including token counts, latency, model identifiers, and structured outputs. This data is used for quality monitoring, cost management, and improving the platform. It does not include raw message content beyond what is needed for auditing.",
        ),
      ],
    },
    {
      id: "how-we-use-data",
      heading: "4. How We Use Data",
      blocks: [
        p("We use the information we collect to:"),
        ul([
          "**Provide the Service:** receive and display WhatsApp messages in the ZUMO inbox, create draft orders, and enable Supplier teams to confirm and manage orders.",
          "**AI-assisted order processing:** classify messages, extract order lines, and match product references to the Supplier's catalog using Amazon Bedrock-powered micro-bots.",
          "**Improve accuracy over time:** corrections made by Supplier users are stored as feedback events that improve product alias matching for that specific Supplier-Buyer relationship.",
          "**Send service communications:** transactional emails about account setup, security, and important platform changes.",
          "**Security and fraud prevention:** detect suspicious activity and protect the platform.",
          "**Legal compliance:** respond to legal obligations, court orders, or regulatory requests.",
        ]),
        p(
          "We do **not** use your data for advertising, and we do not sell personal data to third parties.",
        ),
      ],
    },
    {
      id: "whatsapp-data",
      heading: "5. WhatsApp Data & Meta Platform Policy",
      blocks: [
        callout(
          "ZUMO integrates with the Meta WhatsApp Business Platform. By connecting a WhatsApp Business Account to ZUMO, the Supplier authorizes ZUMO to receive and process messages on the Supplier's behalf through Meta's official Cloud API.",
          { title: "**Important:**" },
        ),
        p("ZUMO's use of WhatsApp message data is governed by:"),
        ul([
          "Meta's [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy/)",
          "Meta's [Platform Terms](https://developers.facebook.com/terms/)",
          "This Privacy Policy",
        ]),
        p("Specifically regarding WhatsApp data:"),
        ul([
          "We access WhatsApp messages **only** for the purpose of providing the ZUMO order management service to the Supplier whose account is connected.",
          "We do not use WhatsApp message content for cross-tenant profiling, advertising, or sale to third parties.",
          "Buyer phone numbers received via WhatsApp are stored per-Supplier and are not shared between Supplier tenants.",
          "WhatsApp message data is retained only for as long as necessary to provide the Service and as described in Section 8.",
          "End users (Buyers) who wish to have their messages deleted from ZUMO should contact the Supplier directly, as the Supplier is the controller of that data relationship.",
        ]),
      ],
    },
    {
      id: "ai-processing",
      heading: "6. AI Processing & Amazon Bedrock",
      blocks: [
        p(
          "ZUMO uses Amazon Bedrock (AWS) to power AI features including message classification (InboxAI) and order extraction (OrderAI). When a message is processed:",
        ),
        ul([
          "Message content and relevant conversation context are sent to Amazon Bedrock for inference.",
          "The AI returns structured JSON outputs (categories, extracted order lines, candidate product matches). It does not store or train on your data by default under AWS's standard data processing terms.",
          "ZUMO's AI is constrained to choose only from the Supplier's actual product catalog — it cannot invent or fabricate SKUs.",
          "All AI decisions are logged in ZUMO with confidence scores and remain auditable by the Supplier.",
          "Human review is required for orders below confidence thresholds — the AI never automatically commits an ambiguous order.",
        ]),
        p(
          "For more information on AWS's data handling practices, see the [AWS Privacy Notice](https://aws.amazon.com/privacy/).",
        ),
      ],
    },
    {
      id: "data-sharing",
      heading: "7. Data Sharing & Third Parties",
      blocks: [
        p("We share data only in the following circumstances:"),
        ul([
          "**Meta / WhatsApp Cloud API:** ZUMO sends outbound messages to Buyers on behalf of Suppliers through Meta's API. This is the core function of the integration.",
          "**AWS (Amazon Web Services):** Our infrastructure, database (Aurora PostgreSQL), AI inference (Bedrock), file storage (S3), and queue processing (SQS) run on AWS in the us-east-2 region.",
          "**BSP / Solution Partner:** ZUMO connects through a WhatsApp Business Solution Partner as required by Meta's Tech Provider model. The BSP provides the partner-level messaging infrastructure. We share only the minimum data required to establish and maintain this connection.",
          "**Legal requirements:** We may disclose data if required by law, regulation, court order, or to protect the rights and safety of ZUMO, our customers, or the public.",
          "**Business transfers:** In the event of a merger, acquisition, or sale of assets, data may be transferred as part of that transaction, subject to equivalent privacy protections.",
        ]),
        p(
          "We do not share Buyer message content or order data between separate Supplier tenants under any circumstances.",
        ),
      ],
    },
    {
      id: "data-retention",
      heading: "8. Data Retention",
      blocks: [
        table(
          ["Data type", "Retention period"],
          [
            ["Account data", "Duration of subscription + 90 days after cancellation"],
            ["WhatsApp message data", "24 months from receipt"],
            ["Confirmed orders", "5 years (business records and audit)"],
            ["AI inference logs", "12 months, then aggregated and anonymized"],
            ["Usage / log data", "90 days"],
          ],
        ),
        p(
          "Upon termination of a Supplier account, we will delete or anonymize personal data within 90 days, unless we are required to retain it for legal obligations.",
        ),
      ],
    },
    {
      id: "security",
      heading: "9. Security",
      blocks: [
        p(
          "We implement technical and organizational measures to protect your data, including:",
        ),
        ul([
          "Encryption of data in transit (TLS 1.2+) and at rest (AES-256 via AWS KMS)",
          "Tenant isolation at the database level — every query is scoped to a `tenant_id`",
          "Webhook signature verification for all inbound WhatsApp events",
          "System user tokens (not personal employee credentials) for backend API operations",
          "Role-based access control (admin, sales, operations, support, finance)",
          "Automated anomaly alerts for webhook failures and cross-tenant access attempts",
        ]),
        p(
          "No method of transmission or storage is 100% secure. If you believe a security incident has occurred, please notify us immediately at security@zumob2b.com.",
        ),
      ],
    },
    {
      id: "your-rights",
      heading: "10. Your Rights",
      blocks: [
        p("Depending on your jurisdiction, you may have the right to:"),
        ul([
          "**Access:** Request a copy of the personal data we hold about you.",
          "**Correction:** Ask us to correct inaccurate data.",
          "**Deletion:** Request deletion of your personal data, subject to legal retention obligations.",
          "**Portability:** Receive your data in a structured, machine-readable format.",
          "**Objection:** Object to certain processing activities.",
          "**Restriction:** Ask us to restrict processing in certain circumstances.",
        ]),
        p(
          "To exercise any of these rights, contact us at privacy@zumob2b.com. We will respond within 30 days.",
        ),
        p(
          "Note: For WhatsApp messages and order data that a Supplier holds about a Buyer, the Supplier is the data controller. Please contact the Supplier directly for requests relating to that data.",
        ),
      ],
    },
    {
      id: "childrens-privacy",
      heading: "11. Children's Privacy",
      blocks: [
        p(
          "ZUMO is a business-to-business service intended solely for adult business users. We do not knowingly collect personal data from individuals under 18 years of age. If you believe we have inadvertently received data from a minor, please contact us immediately at privacy@zumob2b.com.",
        ),
      ],
    },
    {
      id: "changes",
      heading: "12. Changes to This Policy",
      blocks: [
        p(
          'We may update this Privacy Policy from time to time. When we make material changes, we will notify active Supplier accounts by email and update the "Last updated" date at the top of this page. Continued use of the Service after the effective date constitutes acceptance of the updated policy.',
        ),
      ],
    },
    {
      id: "contact",
      heading: "13. Contact Us",
      blocks: [
        p("**ZUMO B2B S.A.**"),
        p("San José, Costa Rica"),
        p("Privacy: privacy@zumob2b.com"),
        p("Security: security@zumob2b.com"),
        p("Website: zumob2b.com"),
      ],
    },
  ],
};
