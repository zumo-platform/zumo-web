"use client";

import { useEffect, useMemo, useState } from "react";

import { Inbox as InboxIcon, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InboxCard } from "@/components/workspace/inbox-card";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import {
  INBOX_COLUMN_LABELS,
  INBOX_COLUMN_ORDER,
  fetchInboxBoardViaProxy,
  searchInboxViaProxy,
  type InboxBoard,
  type InboxCard as InboxCardData,
  type InboxColumnKey,
} from "@/lib/dashboard-inbox";
import { buildInboxColumns } from "@/lib/inbox-columns";

const EMPTY: InboxBoard = {
  columns: { orders: [], not_orders: [], errors: [] },
  counts: { orders: 0, not_orders: 0, errors: 0 },
};

const MIN_COLUMN_WIDTH = 260;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function InboxColumn({
  column,
  cards,
}: Readonly<{ column: InboxColumnKey; cards: InboxCardData[] }>) {
  const isError = column === "errors";
  return (
    <section
      className="flex h-full min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-muted/50"
      style={{ minWidth: MIN_COLUMN_WIDTH }}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-muted/70 px-3 py-2.5">
        <h3 className="truncate font-medium text-sm">{INBOX_COLUMN_LABELS[column]}</h3>
        <Badge variant={isError ? "destructive" : "secondary"}>{cards.length}</Badge>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {cards.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-8 text-center text-muted-foreground text-xs">
            Sin conversaciones
          </div>
        ) : (
          cards.map((card) => <InboxCard card={card} key={card.conversationId} />)
        )}
      </div>
    </section>
  );
}

export function InboxExperience() {
  const [board, setBoard] = useState<InboxBoard>(EMPTY);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 300);
  const [searchResults, setSearchResults] = useState<InboxCardData[] | null>(null);

  useEffect(() => {
    let active = true;
    void fetchInboxBoardViaProxy().then((b) => {
      if (!active) return;
      setBoard(b);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const q = debouncedQuery.trim();
    if (q.length === 0) {
      return () => {
        active = false;
      };
    }
    void searchInboxViaProxy(q).then((cards) => {
      if (active) setSearchResults(cards);
    });
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  const activeQuery = debouncedQuery.trim();
  const columns = useMemo(() => {
    if (activeQuery.length === 0) return board.columns;
    return buildInboxColumns(searchResults ?? []);
  }, [activeQuery, searchResults, board.columns]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <WorkspacePageHeader
        description="Pedidos, mensajes y errores de WhatsApp en un solo lugar."
        title="Inbox"
      >
        <div className="relative w-full sm:w-80">
          <Search
            aria-hidden
            className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Buscar por cliente, contacto, producto o SKU"
            className="pl-8"
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              if (!next.trim()) setSearchResults(null);
            }}
            placeholder="Buscar cliente, contacto, producto o SKU"
            value={query}
          />
        </div>
      </WorkspacePageHeader>

      {!ready ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground text-sm">
          <InboxIcon aria-hidden className="size-5 opacity-40" />
          Cargando bandeja…
        </div>
      ) : (
        <div className="flex h-full min-h-0 w-full flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden px-3 py-4 md:px-4">
          {INBOX_COLUMN_ORDER.map((column) => (
            <InboxColumn cards={columns[column]} column={column} key={column} />
          ))}
        </div>
      )}
    </div>
  );
}
