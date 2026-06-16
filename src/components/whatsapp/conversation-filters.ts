import type {
  Conversation,
  ConversationOrderState,
  ConversationUiStatus,
} from "@/lib/dashboard-types";

import { isUnknownConversationCustomer } from "./whatsapp-helpers";

export const ESTADO_OPTIONS: ReadonlyArray<{ value: ConversationUiStatus; label: string }> = [
  { value: "sin_responder", label: "Sin Responder" },
  { value: "abierto", label: "Abierto" },
  { value: "cerrado", label: "Cerrado" },
];

export type ConversationKind = "cliente" | "desconocido";

export const KIND_OPTIONS: ReadonlyArray<{ value: ConversationKind; label: string }> = [
  { value: "cliente", label: "Cliente" },
  { value: "desconocido", label: "Desconocido" },
];

export const PEDIDO_OPTIONS: ReadonlyArray<{
  value: ConversationOrderState;
  label: string;
}> = [
  { value: "pedido_pendiente", label: "Pedido pendiente" },
  { value: "borrador", label: "Borrador" },
  { value: "sin_pedido", label: "No hay pedido abierto" },
  { value: "en_ruta", label: "Pedido en Ruta" },
  { value: "rechazado", label: "Pedido Rechazado" },
];

export type AssignedMode = "me" | "all" | "unassigned" | "seller";

export type AssignedFilter =
  | { mode: "me" }
  | { mode: "all" }
  | { mode: "unassigned" }
  | { mode: "seller"; sellerId: number };

export type SortOption =
  | "recent"
  | "first_in"
  | "unread_first"
  | "az"
  | "za";

export const SORT_OPTIONS: ReadonlyArray<{ value: SortOption; label: string }> = [
  { value: "recent", label: "Más reciente" },
  { value: "first_in", label: "Primero en llegar" },
  { value: "unread_first", label: "No leídos primero" },
  { value: "az", label: "A-Z" },
  { value: "za", label: "Z-A" },
];

export type ConversationFilterState = Readonly<{
  statuses: ConversationUiStatus[];
  kinds: ConversationKind[];
  /** Empty = Todos (no pedido constraint). */
  pedidoStates: ConversationOrderState[];
  assigned: AssignedFilter;
  sort: SortOption;
  search: string;
}>;

export function defaultConversationFilters(
  canViewAll: boolean = false,
): ConversationFilterState {
  return {
    statuses: ["sin_responder", "abierto", "cerrado"],
    kinds: ["cliente", "desconocido"],
    pedidoStates: [],
    assigned: canViewAll ? { mode: "all" } : { mode: "me" },
    sort: "recent",
    search: "",
  };
}

/** Build the backend query string. Sort + search are NOT sent (client-side). */
export function buildConversationsQuery(filters: ConversationFilterState): string {
  const params = new URLSearchParams();

  if (filters.statuses.length > 0 && filters.statuses.length < ESTADO_OPTIONS.length) {
    params.set("status", filters.statuses.join(","));
  }
  if (filters.kinds.length > 0 && filters.kinds.length < KIND_OPTIONS.length) {
    params.set("kind", filters.kinds.join(","));
  }
  if (filters.pedidoStates.length > 0) {
    params.set("order", filters.pedidoStates.join(","));
  }
  switch (filters.assigned.mode) {
    case "me":
      params.set("assigned", "me");
      break;
    case "unassigned":
      params.set("assigned", "unassigned");
      break;
    case "seller":
      params.set("assigned", String(filters.assigned.sellerId));
      break;
    case "all":
    default:
      break;
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function conversationMatchesSearch(conv: Conversation, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const haystacks = [
    conv.customerName ?? "",
    conv.customerPhone ?? "",
    conv.assignedSellerName ?? "",
  ];
  return haystacks.some((h) => normalize(h).includes(q));
}

function timeValue(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function displayName(conv: Conversation): string {
  if (isUnknownConversationCustomer(conv)) {
    return conv.customerPhone?.trim() || "";
  }
  return conv.customerName?.trim() || conv.customerPhone?.trim() || "";
}

function isUnread(conv: Conversation): boolean {
  return (conv.uiStatus ?? "sin_responder") === "sin_responder";
}

export function sortConversations(
  list: readonly Conversation[],
  sort: SortOption,
): Conversation[] {
  const arr = [...list];
  const byRecentDesc = (a: Conversation, b: Conversation) =>
    timeValue(b.lastMessageAt ?? b.createdAt) - timeValue(a.lastMessageAt ?? a.createdAt);
  const byFirstAsc = (a: Conversation, b: Conversation) =>
    timeValue(a.createdAt ?? a.lastMessageAt) - timeValue(b.createdAt ?? b.lastMessageAt);
  const byNameAsc = (a: Conversation, b: Conversation) =>
    displayName(a).localeCompare(displayName(b), "es", { sensitivity: "base" });

  switch (sort) {
    case "recent":
      return arr.sort(byRecentDesc);
    case "first_in":
      return arr.sort(byFirstAsc);
    case "az":
      return arr.sort(byNameAsc);
    case "za":
      return arr.sort((a, b) => byNameAsc(b, a));
    case "unread_first":
      return arr.sort((a, b) => {
        const ua = isUnread(a) ? 0 : 1;
        const ub = isUnread(b) ? 0 : 1;
        if (ua !== ub) return ua - ub;
        return byRecentDesc(a, b);
      });
    default:
      return arr.sort(byRecentDesc);
  }
}

export function applyClientPipeline(
  list: readonly Conversation[],
  filters: ConversationFilterState,
): Conversation[] {
  const searched = list.filter((c) => conversationMatchesSearch(c, filters.search));
  return sortConversations(searched, filters.sort);
}

export type OrderPill = Readonly<{ label: string; tone: "review" | "draft" | "route" | "rejected" }>;

export function orderStatePill(state: ConversationOrderState | undefined): OrderPill | null {
  switch (state) {
    case "pedido_pendiente":
      return { label: "En revisión", tone: "review" };
    case "borrador":
      return { label: "Borrador", tone: "draft" };
    case "en_ruta":
      return { label: "En ruta", tone: "route" };
    case "rechazado":
      return { label: "Rechazado", tone: "rejected" };
    default:
      return null;
  }
}
