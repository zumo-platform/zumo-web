export interface Conversation {
  conversationId: string;
  /** Null for unregistered WhatsApp contacts (not in clientes table yet). */
  customerId: number | null;
  supplierId: number;
  contactId?: string | null;
  channel: string;
  status: string;
  summary?: string | null;
  lastMessageAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
  customerName: string;
  customerPhone: string;
  /** Prefer API value; if absent, treat empty `customerName` as unknown. */
  isUnknownCustomer?: boolean;
}

export interface Message {
  messageId: string;
  conversationId: string;
  supplierId: number;
  role: "customer" | "assistant" | "seller" | "system";
  content: string;
  createdAt?: string;
}

export interface OrderLine {
  productName: string;
  quantity: number;
  unit: string;
}

export type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "in_progress"
  | "in_route"
  | "delivered"
  | "cancelled";

export interface Order {
  orderId: string;
  supplierId: number;
  customerId: number;
  conversationId?: string | null;
  displayCode?: string | null;
  status: OrderStatus | string;
  lines: OrderLine[] | null;
  deliveryNotes?: string | null;
  deliveryDate?: string | null;
  createdAt?: string;
  seenAt?: string | null;
  expiresAt?: string | null;
  isExpired?: boolean;
  /** 0–1 from backend when present */
  aiConfidence?: number | string | null;
  /** 0–1 share of lines confidently matched (Rekki coverage). */
  matchCoverage?: number | string | null;
  /** Permanent when AI auto-confirmed with zero seller edits. */
  isTouchless?: boolean;
}

export type SupplierSettings = {
  business: {
    businessName: string;
    businessEmail: string;
    whatsappPhoneE164?: string | null;
    whatsappConnectedAt?: string | null;
  };
  ai: {
    autoCommitEnabled: boolean;
    draftExpirationHours: 24 | 48 | 72 | 168;
  };
};

export type WhatsappTokenType = "system_user" | "temporary" | "none" | "unknown";

export interface WhatsappStatusResult {
  connected: boolean;
  tokenValid: boolean;
  tokenType: WhatsappTokenType;
  expiresAt: string | null;
  message: string;
}

export interface SellerMe {
  seller: {
    sellerId: number;
    email: string;
    name: string;
    phone: string | null;
    role: string;
    active: boolean;
  };
  supplier: {
    supplierId: number;
    businessName: string;
    businessEmail: string;
    whatsappPhoneNumberId: string | null;
    wabaId: string | null;
    partnerSolutionId: string | null;
    onboardingStatus: string;
    onboardingComplete: boolean;
  };
}
