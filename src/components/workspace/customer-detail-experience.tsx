"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerComingSoonTab } from "@/components/workspace/customer-coming-soon-tab";
import { CustomerDetailSidebar } from "@/components/workspace/customer-detail-sidebar";
import { CustomerLabelsSection } from "@/components/workspace/customer-labels-section";
import { CustomerOrdersTab } from "@/components/workspace/customer-orders-tab";
import { CustomerProductPickerSheet } from "@/components/workspace/customer-product-picker-sheet";
import { CustomerProductsTab } from "@/components/workspace/customer-products-tab";
import { CustomerTasksTab } from "@/components/workspace/customer-tasks-tab";
import { CustomerUsersTab } from "@/components/workspace/customer-users-tab";
import { OrderDetailSheet } from "@/components/workspace/order-detail-sheet";
import type { CustomerLabelRow } from "@/lib/customer-hub";
import {
  customerDetailToDraft,
  draftToSavePayload,
  fetchCustomerFullDetailViaProxy,
  fetchCustomersViaProxy,
  saveDashboardCustomerViaProxy,
  type CustomerDraftState,
  type DashboardCustomerFullDetail,
} from "@/lib/dashboard-customers";
import { fetchProductsViaProxy, type DashboardProductRow } from "@/lib/dashboard-products";
import { cn } from "@/lib/utils";
import { workspaceContentOuterClassName, workspacePageHeaderClassName } from "@/lib/workspace-layout";

export function CustomerDetailExperience({
  customerId,
  navigationCustomerIds: initialNavIds,
  initialLabels = [],
  onHubMutated,
}: Readonly<{
  customerId: number;
  navigationCustomerIds?: readonly number[];
  initialLabels?: readonly CustomerLabelRow[];
  onHubMutated?: () => void;
}>) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DashboardCustomerFullDetail | null>(null);
  const [draft, setDraft] = useState<CustomerDraftState | null>(null);
  const [savedDraft, setSavedDraft] = useState<CustomerDraftState | null>(null);
  const [products, setProducts] = useState<DashboardProductRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [navIds, setNavIds] = useState<number[]>(() => [...(initialNavIds ?? [])]);
  const [orderDetailId, setOrderDetailId] = useState<string | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);

  const catalogById = useMemo(
    () => new Map(products.map((p) => [p.productId, p])),
    [products],
  );

  const navIndex = navIds.indexOf(customerId);
  const canGoPrev = navIndex > 0;
  const canGoNext = navIndex >= 0 && navIndex < navIds.length - 1;

  const loadDetail = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const [full, catalog] = await Promise.all([
        fetchCustomerFullDetailViaProxy(id),
        fetchProductsViaProxy(),
      ]);
      if (!full) {
        setError("No se pudo cargar el cliente.");
        setDetail(null);
        setDraft(null);
        setSavedDraft(null);
        return;
      }
      const nextDraft = customerDetailToDraft(full);
      setDetail(full);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setProducts(catalog);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el cliente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDetail(customerId);
  }, [customerId, loadDetail]);

  useEffect(() => {
    if (initialNavIds?.length) return;
    void (async () => {
      const rows = await fetchCustomersViaProxy();
      if (!rows) return;
      setNavIds(rows.map((r) => r.customerId));
    })();
  }, [initialNavIds]);

  const isDirty = useMemo(() => {
    if (!draft || !savedDraft) return false;
    return JSON.stringify(draft) !== JSON.stringify(savedDraft);
  }, [draft, savedDraft]);

  function updateDraft(patch: Partial<CustomerDraftState>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function handleCancel() {
    if (savedDraft) setDraft(savedDraft);
    else router.push("/clients");
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      const updated = await saveDashboardCustomerViaProxy(customerId, draftToSavePayload(draft));
      if (!updated) throw new Error("No se pudo guardar el cliente.");
      const nextDraft = customerDetailToDraft(updated);
      setDetail(updated);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      toast.success("Cliente guardado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el cliente.");
    } finally {
      setSaving(false);
    }
  }

  function navigateTo(id: number) {
    if (isDirty) {
      const ok = window.confirm(
        "Tenés cambios sin guardar. Si salís ahora, se perderán. ¿Continuar?",
      );
      if (!ok) return;
    }
    router.push(`/clients/${id}`);
  }

  const customerName = draft?.name.trim() || detail?.name || `Cliente #${customerId}`;
  const existingProductIds = useMemo(
    () => new Set(draft?.productIds ?? []),
    [draft?.productIds],
  );

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <Loader2 aria-hidden className="size-8 animate-spin" />
        <p className="text-sm">Cargando cliente…</p>
      </div>
    );
  }

  if (error || !detail || !draft) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-destructive text-sm">{error ?? "Cliente no encontrado."}</p>
        <Button asChild type="button" variant="outline">
          <Link href="/clients">Volver a clientes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className={cn("shrink-0 border-b bg-background", workspacePageHeaderClassName)}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/whatsapp">Inicio</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/clients">Clientes</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {customerName} — {customerId}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-1">
            <Button
              aria-label="Cliente anterior"
              disabled={!canGoPrev}
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={() => canGoPrev && navigateTo(navIds[navIndex - 1]!)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              aria-label="Cliente siguiente"
              disabled={!canGoNext}
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={() => canGoNext && navigateTo(navIds[navIndex + 1]!)}
            >
              <ChevronRight className="size-4" />
            </Button>
            {navIds.length > 1 && navIndex >= 0 ? (
              <span className="text-muted-foreground text-xs tabular-nums">
                {navIndex + 1} / {navIds.length}
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">{customerName}</h1>
          <p className="text-muted-foreground text-sm">
            Completa la información del cliente. No se guarda nada hasta que pulses Guardar.
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <CustomerDetailSidebar
          createdAt={detail.createdAt}
          customerId={customerId}
          draft={draft}
          labelsSlot={
            <CustomerLabelsSection
              customerId={customerId}
              initialLabels={initialLabels}
              onLabelsChanged={onHubMutated}
            />
          }
          onDraftChange={updateDraft}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Tabs className="flex min-h-0 flex-1 flex-col gap-0" defaultValue="orders">
            <div className={cn("shrink-0 pt-4", workspaceContentOuterClassName, "pb-0")}>
              <TabsList className="w-full" variant="line">
                <TabsTrigger value="orders">Pedidos</TabsTrigger>
                <TabsTrigger value="products">Productos</TabsTrigger>
                <TabsTrigger value="tasks">Tareas</TabsTrigger>
                <TabsTrigger value="users">Usuarios</TabsTrigger>
                <TabsTrigger value="proposals">Propuestas</TabsTrigger>
                <TabsTrigger value="activity">Registro</TabsTrigger>
              </TabsList>
            </div>

            <div className={cn("min-h-0 flex-1 overflow-y-auto", workspaceContentOuterClassName)}>
              <TabsContent className="mt-0" value="orders">
                <CustomerOrdersTab
                  orders={detail.orders}
                  onOpenOrder={(orderId) => {
                    setOrderDetailId(orderId);
                    setOrderDetailOpen(true);
                  }}
                />
              </TabsContent>
              <TabsContent className="mt-0" value="products">
                <CustomerProductsTab
                  catalogById={catalogById}
                  productFirstOrderedAt={detail.productFirstOrderedAt}
                  productIds={draft.productIds}
                  onAddProducts={() => setPickerOpen(true)}
                  onRemoveProduct={(productId) =>
                    updateDraft({
                      productIds: draft.productIds.filter((id) => id !== productId),
                    })
                  }
                />
              </TabsContent>
              <TabsContent className="mt-0" value="tasks">
                <CustomerTasksTab customerId={customerId} onTasksChanged={onHubMutated} />
              </TabsContent>
              <TabsContent className="mt-0" value="users">
                <CustomerUsersTab
                  contacts={detail.contacts}
                  pendingContacts={draft.pendingContacts}
                  onAddPendingContact={(contact) =>
                    updateDraft({
                      pendingContacts: [
                        ...draft.pendingContacts,
                        { ...contact, tempId: crypto.randomUUID() },
                      ],
                    })
                  }
                />
              </TabsContent>
              <TabsContent className="mt-0" value="proposals">
                <CustomerComingSoonTab title="Propuestas" />
              </TabsContent>
              <TabsContent className="mt-0" value="activity">
                <CustomerComingSoonTab title="Registro de actividad" />
              </TabsContent>
            </div>
          </Tabs>

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t bg-background px-6 py-4">
            <Button disabled={saving} type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button disabled={saving || !isDirty} type="button" onClick={() => void handleSave()}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </footer>
        </div>
      </div>

      <CustomerProductPickerSheet
        customerName={customerName}
        existingProductIds={existingProductIds}
        open={pickerOpen}
        products={products}
        onConfirm={(selected) => {
          const ids = new Set(draft.productIds);
          for (const p of selected) ids.add(p.productId);
          updateDraft({ productIds: [...ids] });
        }}
        onOpenChange={setPickerOpen}
      />

      <OrderDetailSheet
        customerNameFallback={customerName}
        navigationOrderIds={detail.orders.map((o) => o.orderId)}
        onNavigateOrder={(id) => setOrderDetailId(id)}
        onOpenChange={setOrderDetailOpen}
        open={orderDetailOpen}
        orderId={orderDetailId}
      />
    </div>
  );
}
