import type { LegalDocument } from "@/content/marketing/types";

import { callout, h3, p, ul } from "./helpers";

export const termsEn: LegalDocument = {
  metaTitle: "Terms of Service",
  metaDescription: "Terms of service for food and beverage suppliers using ZUMO.",
  title: "Terms of Service",
  label: "Legal",
  effectiveDate: "Effective date: June 1, 2026",
  lastUpdated: "Last updated: May 27, 2026",
  tocTitle: "Contents",
  sections: [
    {
      id: "acceptance",
      heading: "1. Acceptance of Terms",
      blocks: [
        callout(
          "By creating an account or using ZUMO, you agree to be bound by these Terms of Service and our Privacy Policy. If you are agreeing on behalf of a business, you represent that you have the authority to bind that business.",
          { title: "**Please read these Terms carefully.**" },
        ),
        p(
          'These Terms of Service ("Terms") constitute a legally binding agreement between you ("Supplier," "you," or "your") and **ZUMO B2B S.A.** ("ZUMO," "we," "our," or "us"), governing your access to and use of the ZUMO platform available at **zumob2b.com** and associated APIs, mobile applications, and services (collectively, the "Service").',
        ),
        p("If you do not agree to these Terms, do not use the Service."),
      ],
    },
    {
      id: "service",
      heading: "2. The Service",
      blocks: [
        p(
          "ZUMO is a business-to-business (B2B) software platform that enables food and beverage suppliers to:",
        ),
        ul([
          "Connect their WhatsApp Business Account to a shared team inbox",
          "Receive and manage incoming orders from restaurant buyers and foodservice operators via WhatsApp",
          "Use AI-assisted tools to classify messages, extract order lines, and match products to a catalog",
          "Review, confirm, and track orders through a web-based workspace",
          "Manage customer contacts, product catalogs, and warehouse inventory",
        ]),
        p(
          "ZUMO is designed exclusively for business use. It is not a consumer messaging service and is not intended for personal, family, or household purposes.",
        ),
        p(
          "We reserve the right to modify, suspend, or discontinue any feature of the Service at any time with reasonable notice. We will not be liable to you for any modification, suspension, or discontinuation.",
        ),
      ],
    },
    {
      id: "accounts",
      heading: "3. Accounts & Registration",
      blocks: [
        h3("3.1 Eligibility"),
        p(
          "You must be at least 18 years of age and have the legal authority to enter into contracts on behalf of your business to use ZUMO. By using the Service, you represent and warrant that you meet these requirements.",
        ),
        h3("3.2 Account Security"),
        p(
          "You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to:",
        ),
        ul([
          "Provide accurate, current, and complete account information",
          "Promptly update account information if it changes",
          "Notify us immediately at security@zumob2b.com if you suspect unauthorized access",
          "Not share your credentials with unauthorized individuals",
        ]),
        p(
          "ZUMO will not be liable for any loss or damage arising from your failure to comply with these obligations.",
        ),
        h3("3.3 Team Members"),
        p(
          "Supplier admins may invite team members (sellers, operations, support, finance) to the Supplier's ZUMO workspace. You are responsible for ensuring that all team members comply with these Terms. Invited users are not required to complete separate Meta or WhatsApp onboarding — all messaging operations run through the Supplier's single connected WhatsApp Business Account.",
        ),
      ],
    },
    {
      id: "whatsapp",
      heading: "4. WhatsApp Integration",
      blocks: [
        callout(
          "ZUMO integrates with the Meta WhatsApp Business Platform. By connecting your WhatsApp Business Account (WABA), you grant ZUMO permission to send and receive messages on your behalf through Meta's official Cloud API.",
          { title: "**Your WhatsApp Business Account:**" },
        ),
        h3("4.1 Your Obligations"),
        p("By connecting a WhatsApp Business Account to ZUMO, you agree to:"),
        ul([
          "Comply with Meta's [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy/), [Commerce Policy](https://www.whatsapp.com/legal/commerce-policy/), and applicable Meta Platform Terms",
          "Use the WhatsApp integration only for legitimate business communications with your customers",
          "Obtain any required consents from your customers (Buyers) before messaging them via WhatsApp",
          "Not use ZUMO to send spam, unsolicited bulk messages, or content prohibited by Meta's policies",
          "Comply with all applicable laws regarding electronic communications and marketing in the jurisdictions where you operate",
          "Use only approved WhatsApp message templates for outbound proactive messages outside the 24-hour customer service window",
        ]),
        h3("4.2 Ownership"),
        p(
          "You retain ownership and control of your WhatsApp Business Account. ZUMO does not own your WABA, your phone number, or your customer conversations. You may disconnect your WhatsApp Business Account from ZUMO at any time from your account settings.",
        ),
        h3("4.3 Meta's Role"),
        p(
          "ZUMO is not affiliated with or endorsed by Meta Platforms, Inc. Your use of WhatsApp is additionally governed by Meta's own terms and policies. ZUMO is not responsible for changes to Meta's platform, API availability, or WhatsApp policy enforcement.",
        ),
      ],
    },
    {
      id: "acceptable-use",
      heading: "5. Acceptable Use",
      blocks: [
        p("You agree not to use the Service to:"),
        ul([
          "Violate any applicable law, regulation, or third-party right",
          "Transmit spam, phishing messages, or deceptive communications",
          "Attempt to gain unauthorized access to any system, account, or data",
          "Interfere with or disrupt the integrity or performance of the Service",
          "Upload or transmit malicious code, viruses, or harmful content",
          "Impersonate another business or individual",
          "Circumvent any security, rate-limiting, or access control features",
          "Resell or white-label the Service without prior written authorization from ZUMO",
          "Use the AI features to generate or disseminate false, misleading, or deceptive information",
        ]),
        p(
          "Violation of this section may result in immediate suspension or termination of your account at ZUMO's sole discretion.",
        ),
      ],
    },
    {
      id: "data",
      heading: "6. Data & Privacy",
      blocks: [
        p(
          "Your use of the Service is also governed by our [Privacy Policy](/en/privacy), which is incorporated into these Terms by reference.",
        ),
        h3("6.1 Your Data"),
        p(
          'You retain ownership of all data you upload to or create within ZUMO, including your product catalog, customer contacts, and order history ("Your Data"). You grant ZUMO a limited, non-exclusive license to store, process, and use Your Data solely to provide and improve the Service.',
        ),
        h3("6.2 Data Processing"),
        p(
          "With respect to personal data of your customers (Buyers) that you process through ZUMO, you are the data controller and ZUMO acts as your data processor. You are responsible for ensuring you have a lawful basis to process such data and for complying with applicable data protection laws.",
        ),
        h3("6.3 Data Export"),
        p(
          "You may export your order data, customer contacts, and product catalog at any time from your account settings. Upon termination, we will provide a 90-day window for data export before deletion.",
        ),
      ],
    },
    {
      id: "ai",
      heading: "7. AI Features",
      blocks: [
        callout(
          "ZUMO's AI features are designed to assist your team, not to replace human judgment. AI-generated draft orders must be reviewed and confirmed by a human user before they are treated as confirmed orders. Do not rely solely on AI outputs for business-critical decisions.",
          { title: "**Human review required:**", variant: "warning" },
        ),
        p(
          "ZUMO uses AI to assist with message classification and order extraction. You understand and agree that:",
        ),
        ul([
          "AI outputs (draft orders, product match suggestions, message classifications) are suggestions, not final decisions",
          "ZUMO does not guarantee the accuracy of AI-generated content",
          "You are responsible for reviewing and confirming all orders before they are treated as confirmed",
          "Your corrections and edits are used to improve matching accuracy for your specific Supplier-Buyer relationships (relationship memory)",
          "ZUMO's AI is constrained to select only from your actual product catalog — it will not invent products",
        ]),
      ],
    },
    {
      id: "ip",
      heading: "8. Intellectual Property",
      blocks: [
        h3("8.1 ZUMO's IP"),
        p(
          "The ZUMO platform, including its software, design, AI models, documentation, and brand, is owned by ZUMO B2B S.A. and protected by intellectual property laws. These Terms do not transfer any ownership rights to you. You receive only a limited, revocable, non-exclusive, non-transferable license to use the Service as described herein.",
        ),
        h3("8.2 Your IP"),
        p(
          "You retain all rights to Your Data. ZUMO claims no ownership over your product catalog, customer data, order history, or other content you provide.",
        ),
        h3("8.3 Feedback"),
        p(
          "If you provide feedback, suggestions, or ideas about the Service, you grant ZUMO an unrestricted, perpetual, royalty-free license to use that feedback for any purpose without compensation to you.",
        ),
      ],
    },
    {
      id: "payment",
      heading: "9. Payment & Billing",
      blocks: [
        p(
          "Paid subscription terms, pricing, billing cycles, and refund policies will be set out in a separate Order Form or subscription agreement presented at the time of purchase. Those payment terms are incorporated into these Terms by reference.",
        ),
        p(
          "Failure to pay subscription fees when due may result in suspension of your account. We will provide at least 7 days' notice before suspending access due to non-payment.",
        ),
      ],
    },
    {
      id: "termination",
      heading: "10. Termination",
      blocks: [
        h3("10.1 By You"),
        p(
          "You may cancel your ZUMO subscription at any time through your account settings or by contacting support@zumob2b.com. Cancellation takes effect at the end of the current billing period.",
        ),
        h3("10.2 By ZUMO"),
        p("We may suspend or terminate your account immediately if you:"),
        ul([
          "Materially breach these Terms and fail to remedy the breach within 10 days of notice",
          "Violate Meta's WhatsApp Business Policy in a way that puts ZUMO's platform status at risk",
          "Engage in fraudulent, abusive, or illegal activity",
          "Fail to pay fees when due",
        ]),
        h3("10.3 Effect of Termination"),
        p(
          "Upon termination, your right to use the Service ends. We will provide a 90-day period during which you may export your data. After that period, your data will be deleted as described in our Privacy Policy.",
        ),
      ],
    },
    {
      id: "disclaimers",
      heading: "11. Disclaimers",
      blocks: [
        callout(
          'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY LAW, ZUMO DISCLAIMS ALL WARRANTIES INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
          { variant: "warning" },
        ),
        p("ZUMO does not warrant that:"),
        ul([
          "The Service will be uninterrupted, error-free, or secure",
          "AI-generated outputs will be accurate, complete, or suitable for any particular purpose",
          "The Service will meet your specific business requirements",
          "Any errors will be corrected within a specific timeframe",
        ]),
        p(
          "ZUMO is not responsible for the actions or omissions of Meta Platforms, WhatsApp, or any third-party integrations.",
        ),
      ],
    },
    {
      id: "liability",
      heading: "12. Limitation of Liability",
      blocks: [
        p(
          "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ZUMO B2B S.A., ITS DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.",
        ),
        p(
          "In jurisdictions that do not allow the exclusion of certain damages, ZUMO's total liability to you for all claims arising from or relating to the Service shall not exceed the greater of (a) the amount you paid to ZUMO in the 12 months preceding the claim, or (b) USD $100.",
        ),
      ],
    },
    {
      id: "indemnification",
      heading: "13. Indemnification",
      blocks: [
        p(
          "You agree to defend, indemnify, and hold harmless ZUMO B2B S.A. and its directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from:",
        ),
        ul([
          "Your use of the Service in violation of these Terms",
          "Your violation of any applicable law or third-party right",
          "Your use of the WhatsApp integration in violation of Meta's policies",
          "Any data you submit to or process through the Service",
        ]),
      ],
    },
    {
      id: "governing-law",
      heading: "14. Governing Law & Dispute Resolution",
      blocks: [
        p(
          "These Terms shall be governed by and construed in accordance with the laws of **Costa Rica**, without regard to conflict of law principles.",
        ),
        p(
          "Any dispute arising from these Terms or your use of the Service shall first be subject to good-faith negotiation between the parties for at least 30 days. If unresolved, disputes shall be submitted to the courts of competent jurisdiction in San José, Costa Rica.",
        ),
      ],
    },
    {
      id: "changes",
      heading: "15. Changes to These Terms",
      blocks: [
        p(
          "We may update these Terms from time to time. We will notify active Supplier accounts of material changes by email at least 14 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms.",
        ),
        p(
          "If you do not accept the updated Terms, you must stop using the Service and cancel your account before the effective date.",
        ),
      ],
    },
    {
      id: "contact",
      heading: "16. Contact Us",
      blocks: [
        p("For questions about these Terms or the Service:"),
        p("**ZUMO B2B S.A.**"),
        p("San José, Costa Rica"),
        p("Email: legal@zumob2b.com"),
        p("Support: support@zumob2b.com"),
        p("Website: [zumob2b.com](https://zumob2b.com)"),
      ],
    },
  ],
};
