export interface Conversation {
  conversationId: string;
  customerId: number;
  supplierId: number;
  status: string;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  customerName: string;
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
}

export interface SellerMe {
  seller: {
    sellerId: number;
    email: string;
    name: string;
    role: string;
    active: boolean;
  };
  supplier: {
    supplierId: number;
    businessName: string;
    businessEmail: string;
    whatsappPhoneNumberId: string | null;
    whatsappWabaId: string | null;
    onboardingStatus: string;
    onboardingComplete: boolean;
  };
}
