"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2, Plus, Search } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MatchBucketTabs } from "@/components/workspace/matches/match-bucket-tabs";
import { MatchCreateDialog } from "@/components/workspace/matches/match-create-dialog";
import { MatchEditSheet } from "@/components/workspace/matches/match-edit-sheet";
import { MatchList } from "@/components/workspace/matches/match-list";
import { MatchesPageHeader } from "@/components/workspace/matches/matches-page-header";
import {
  deleteDashboardMatch,
  fetchMatchesList,
  fetchMatchesSummary,
  type DashboardMatchItem,
  type MatchBucket,
  type MatchesSummary,
} from "@/lib/dashboard-matches";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
} from "@/lib/workspace-layout";

const EMPTY_COUNTS: Record<MatchBucket, number> = {
  needs_review: 0,
  with_multipliers: 0,
  correct: 0,
};

const EMPTY_COPY: Record<MatchBucket, { title: string; description: string }> = {
  needs_review: {
    title: "Nada pendiente de revisión",
    description: "Los matches con baja confianza aparecerán aquí.",
  },
  with_multipliers: {
    title: "Sin multiplicadores",
    description: "Cuando la unidad del cliente difiera del catálogo, verás el factor aquí.",
  },
  correct: {
    title: "Aún no hay matches",
    description: "La IA aprenderá de pedidos confirmados o puedes añadir aliases manualmente.",
  },
};

export function MatchesExperience() {
  const [summary, setSummary] = useState<MatchesSummary | null>(null);
  const [bucket, setBucket] = useState<MatchBucket>("correct");
  const [recentlyEdited, setRecentlyEdited] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<DashboardMatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<DashboardMatchItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<DashboardMatchItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [summaryResult, listResult] = await Promise.all([
      fetchMatchesSummary(),
      fetchMatchesList({
        bucket,
        recentlyEdited,
        q: debouncedQuery,
      }),
    ]);
    setSummary(summaryResult);
    setItems(listResult.items);
    setLoading(false);
  }, [bucket, debouncedQuery, recentlyEdited]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const counts = summary?.buckets ?? EMPTY_COUNTS;
  const emptyCopy = EMPTY_COPY[bucket];

  const customerOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const item of items) {
      if (item.customerId != null && item.customerName) {
        seen.set(item.customerId, item.customerName);
      }
    }
    return [...seen.entries()].map(([customerId, label]) => ({ customerId, label }));
  }, [items]);

  async function confirmDelete() {
    if (!deleteItem) return;
    setDeletePending(true);
    try {
      await deleteDashboardMatch(deleteItem.aliasId);
      setDeleteItem(null);
      await refresh();
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <MatchesPageHeader
        description="Cómo nuestra IA reconoce los productos que tus clientes piden"
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Añadir alias
          </Button>
        }
      />

      <div className={cn("flex flex-1 flex-col", workspaceContentOuterClassName)}>
        <div className={cn(workspaceContentInnerClassName, "gap-4")}>
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por alias, producto o cliente"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <MatchBucketTabs
          activeBucket={bucket}
          counts={counts}
          recentlyEdited={recentlyEdited}
          onBucketChange={setBucket}
          onRecentlyEditedChange={setRecentlyEdited}
        />

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-20 text-muted-foreground text-sm">
            <Loader2 className="size-5 animate-spin" />
            Cargando matches…
          </div>
        ) : (
          <MatchList
            emptyDescription={emptyCopy.description}
            emptyTitle={emptyCopy.title}
            items={items}
            onCreate={() => setCreateOpen(true)}
            onDelete={setDeleteItem}
            onEdit={setEditItem}
          />
        )}
        </div>
      </div>

      <MatchCreateDialog
        customers={customerOptions}
        open={createOpen}
        onCreated={() => void refresh()}
        onOpenChange={setCreateOpen}
      />

      <MatchEditSheet
        item={editItem}
        open={editItem != null}
        onDeleted={() => void refresh()}
        onOpenChange={(open) => {
          if (!open) setEditItem(null);
        }}
        onSaved={() => void refresh()}
      />

      <AlertDialog
        open={deleteItem != null}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar alias?</AlertDialogTitle>
            <AlertDialogDescription>
              La IA dejará de reconocer «{deleteItem?.aliasText}» como{" "}
              {deleteItem?.product.name}. Puedes recuperarlo desde el historial de auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancelar</AlertDialogCancel>
            <Button disabled={deletePending} variant="destructive" onClick={() => void confirmDelete()}>
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
