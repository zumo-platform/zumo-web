import type { LucideIcon } from "lucide-react";
import { MessageSquare, SearchX } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { Conversation } from "@/lib/dashboard-types";

import { ConversationListItem } from "./conversation-list-item";
import { WhatsappScrollPane } from "./whatsapp-scroll-pane";

function EmptyState({
  icon: Icon,
  title,
  description,
}: Readonly<{ icon: LucideIcon; title: string; description: string }>) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/10 p-8 text-center">
      <Icon aria-hidden className="size-8 text-muted-foreground opacity-50" />
      <p className="font-medium text-sm">{title}</p>
      <p className="max-w-[240px] text-muted-foreground text-xs leading-relaxed">{description}</p>
    </div>
  );
}

export function ConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
  hasActiveFilters,
}: Readonly<{
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  hasActiveFilters?: boolean;
}>) {
  if (loading) {
    return (
      <WhatsappScrollPane>
        <div className="space-y-2 p-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div className="space-y-2 rounded-lg border border-border/60 bg-card px-3 py-2.5 shadow-sm" key={i}>
              <Skeleton className="h-4 w-[85%]" />
              <div className="flex justify-between gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          ))}
        </div>
      </WhatsappScrollPane>
    );
  }

  if (conversations.length === 0) {
    return (
      <WhatsappScrollPane>
        <div className="p-4">
          {hasActiveFilters ? (
            <EmptyState
              description="Probá ajustar los filtros o la búsqueda para ver más conversaciones."
              icon={SearchX}
              title="Sin resultados"
            />
          ) : (
            <EmptyState
              description="Los mensajes aparecerán acá cuando un cliente te escriba por WhatsApp."
              icon={MessageSquare}
              title="Aún no hay conversaciones"
            />
          )}
        </div>
      </WhatsappScrollPane>
    );
  }

  return (
    <WhatsappScrollPane>
      <ul className="space-y-2 p-2">
        {conversations.map((conv) => (
          <ConversationListItem
            conversation={conv}
            key={conv.conversationId}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        ))}
      </ul>
    </WhatsappScrollPane>
  );
}
