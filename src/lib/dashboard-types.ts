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

export interface Order {
  orderId: string;
  supplierId: number;
  customerId: number;
  conversationId?: string | null;
  status: string;
  lines: OrderLine[] | null;
  deliveryNotes?: string | null;
  deliveryDate?: string | null;
  createdAt?: string;
  /** 0–1 from backend when present */
  aiConfidence?: number | string | null;
}

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
