import { dedupeWhatsAppConversations } from "@/components/whatsapp/conversation-filters";
import { isEmailChannel } from "@/components/whatsapp/whatsapp-helpers";
import type { Conversation } from "@/lib/dashboard-types";

/** True when the thread has a customer message the seller hasn't opened since. */
export function isWhatsappConversationUnread(conv: Conversation): boolean {
  if (isEmailChannel(conv)) return false;
  if (conv.status === "closed") return false;
  if (!conv.lastCustomerMessageAt) return false;
  if (!conv.openedAt) return true;
  return (
    new Date(conv.lastCustomerMessageAt).getTime() > new Date(conv.openedAt).getTime()
  );
}

export function countUnreadWhatsappConversations(conversations: readonly Conversation[]): number {
  const whatsappOnly = conversations.filter((c) => !isEmailChannel(c));
  const deduped = dedupeWhatsAppConversations(whatsappOnly);
  return deduped.filter(isWhatsappConversationUnread).length;
}

export async function fetchUnreadWhatsappCount(canViewAll: boolean): Promise<number> {
  const params = new URLSearchParams();
  if (!canViewAll) params.set("assigned", "me");

  const qs = params.toString();
  const res = await fetch(`/api/backend/dashboard/conversations${qs ? `?${qs}` : ""}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) return 0;

  const data = (await res.json().catch(() => null)) as { conversations?: Conversation[] } | null;
  return countUnreadWhatsappConversations(data?.conversations ?? []);
}
