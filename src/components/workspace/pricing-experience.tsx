"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

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
import { SkeletonCard } from "@/components/ui/skeleton-blocks";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DiscountListCard } from "@/components/workspace/discount-list-card";
import { DiscountListCreateDialog } from "@/components/workspace/discount-list-create-dialog";
import { DiscountListDetailDialog } from "@/components/workspace/discount-list-detail-dialog";
import { DiscountListEmptyState } from "@/components/workspace/discount-list-empty-state";
import { PricingPageHeader } from "@/components/workspace/pricing-page-header";
import {
  deleteDiscountListViaProxy,
  duplicateDiscountListViaProxy,
  fetchDiscountListViaProxy,
  fetchDiscountListsViaProxy,
  type DiscountListDetail,
  type DiscountListSummary,
} from "@/lib/dashboard-discount-lists";
import { loadProductsCatalog } from "@/lib/products-catalog-cache";
import type { DashboardProductRow } from "@/lib/dashboard-products";
import { loadProductCategoryMap } from "@/lib/products-catalog-cache";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
} from "@/lib/workspace-layout";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

export function PricingExperience() {
  const { can } = useWorkspacePermissions();
  const canEdit = can("pricing.edit_own");

  const [lists, setLists] = useState<DiscountListSummary[] | null>(null);
  const [products, setProducts] = useState<DashboardProductRow[]>([]);
  const [categoryMap, setCategoryMap] = useState<ReadonlyMap<number, string>>(new Map());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editList, setEditList] = useState<DiscountListDetail | null>(null);
  const [detailList, setDetailList] = useState<DiscountListDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DiscountListSummary | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [listRows, productRows, categories] = await Promise.all([
      fetchDiscountListsViaProxy(),
      loadProductsCatalog(),
      loadProductCategoryMap(),
    ]);
    setLists(listRows.filter((list) => list.active));
    setProducts(productRows);
    setCategoryMap(categories);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredLists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !lists) return lists ?? [];
    return lists.filter(
      (list) =>
        list.name.toLowerCase().includes(q) ||
        (list.description?.toLowerCase().includes(q) ?? false),
    );
  }, [lists, query]);

  async function openDetail(listId: string) {
    const detail = await fetchDiscountListViaProxy(listId);
    if (!detail) {
      toast.error("No pudimos cargar el detalle.");
      return;
    }
    setDetailList(detail);
    setDetailOpen(true);
  }

  async function openEdit(listId: string) {
    const detail = await fetchDiscountListViaProxy(listId);
    if (!detail) {
      toast.error("No pudimos cargar la lista.");
      return;
    }
    setEditList(detail);
    setCreateOpen(true);
  }

  async function handleDuplicate(list: DiscountListSummary) {
    const result = await duplicateDiscountListViaProxy(list.discountListId);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Lista duplicada");
    await refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const result = await deleteDiscountListViaProxy(deleteTarget.discountListId);
      if (!result.ok) {
        toast.error(result.message ?? "No pudimos eliminar la lista.");
        return;
      }
      toast.success("Lista eliminada");
      setDeleteTarget(null);
      await refresh();
    } finally {
      setDeleteBusy(false);
    }
  }

  const showEmpty = !loading && (lists?.length ?? 0) === 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-0 flex-1 flex-col">
        <PricingPageHeader
          description="Listas de descuento sobre el precio base. Si varias aplican, gana el descuento más alto."
          actions={
            canEdit ? (
              <Button
                type="button"
                onClick={() => {
                  setEditList(null);
                  setCreateOpen(true);
                }}
              >
                <Plus aria-hidden className="size-4" />
                Crear lista de precios
              </Button>
            ) : null
          }
        />

        <div className={workspaceContentOuterClassName}>
          <div className={workspaceContentInnerClassName}>
            {showEmpty ? (
              <DiscountListEmptyState
                canEdit={canEdit}
                onCreate={() => {
                  setEditList(null);
                  setCreateOpen(true);
                }}
              />
            ) : (
              <div className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Buscar por lista o descripción"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                ) : filteredLists.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Ninguna lista coincide con tu búsqueda.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredLists.map((list) => (
                      <DiscountListCard
                        key={list.discountListId}
                        canEdit={canEdit}
                        list={list}
                        onDelete={() => setDeleteTarget(list)}
                        onDuplicate={() => void handleDuplicate(list)}
                        onEdit={() => void openEdit(list.discountListId)}
                        onView={() => void openDetail(list.discountListId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DiscountListCreateDialog
          editList={editList}
          open={createOpen}
          products={products}
          onOpenChange={setCreateOpen}
          onSaved={() => void refresh()}
        />

        <DiscountListDetailDialog
          categoryNames={categoryMap}
          list={detailList}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />

        <AlertDialog
          open={deleteTarget != null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar lista?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget
                  ? `“${deleteTarget.name}” dejará de aplicarse en pedidos nuevos.`
                  : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteBusy}>Cancelar</AlertDialogCancel>
              <Button
                disabled={deleteBusy}
                type="button"
                variant="destructive"
                onClick={() => void handleDelete()}
              >
                Eliminar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
