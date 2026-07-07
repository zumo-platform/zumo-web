"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { FormProvider, type Resolver, useForm } from "react-hook-form";
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
import type { DashboardCategoryOption } from "@/components/workspace/create-product-form";
import { OrderDetailSheet } from "@/components/workspace/order-detail-sheet";
import { ProductFormFields } from "@/components/workspace/product-form-fields";
import { ProductInventoryTab } from "@/components/workspace/product-inventory-tab";
import { ProductOrdersTab } from "@/components/workspace/product-orders-tab";
import { ProductPricingTab } from "@/components/workspace/product-pricing-card";
import { ProductSidebar } from "@/components/workspace/product-sidebar";
import { WorkspaceComingSoon } from "@/components/workspace/workspace-coming-soon";
import { ProductDetailSkeleton } from "@/components/workspace/workspace-skeletons";
import { fetchDashboardSettingsViaProxy } from "@/lib/dashboard-settings";
import {
  fetchBatchSettingsViaProxy,
  updateProductTrackBatchesModeViaProxy,
  type BatchSettings,
} from "@/lib/lot-nomenclature";
import {
  fetchProductDetailViaProxy,
  patchProductDetailViaProxy,
  type DashboardProductDetail,
} from "@/lib/product-detail";
import {
  buildProductPayload,
  productDetailToFormValues,
  productFormSchema,
  type ProductFormValues,
} from "@/lib/product-form";
import { canMutateInventory } from "@/lib/roles";
import { workspaceContentOuterClassName } from "@/lib/workspace-layout";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

export type ProductFormHandle = Readonly<{ submit: () => void }>;

const ProductFormEditor = forwardRef<
  ProductFormHandle,
  Readonly<{
    productId: number;
    detail: DashboardProductDetail;
    categories: readonly DashboardCategoryOption[];
    categoriesLoadError: string | null;
    readOnly: boolean;
    onSavingChange: (saving: boolean) => void;
    onSaved: (detail: DashboardProductDetail) => void;
    children: ReactNode;
  }>
>(function ProductFormEditor(
  {
    productId,
    detail,
    categories,
    categoriesLoadError,
    readOnly,
    onSavingChange,
    onSaved,
    children,
  },
  ref,
) {
  const methods = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as Resolver<ProductFormValues>,
    defaultValues: productDetailToFormValues(detail.product),
  });

  useEffect(() => {
    methods.reset(productDetailToFormValues(detail.product));
  }, [detail, methods]);

  const save = useCallback(
    async (values: ProductFormValues) => {
      if (readOnly) return;
      onSavingChange(true);
      try {
        const categoryIdNum = Number.parseInt(values.categoryId.trim(), 10);
        if (!Number.isFinite(categoryIdNum) || categoryIdNum < 1) {
          toast.error("Elegí una categoría válida.");
          return;
        }
        const payload = buildProductPayload(values, categoryIdNum, "edit");
        const result = await patchProductDetailViaProxy(productId, payload);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        if (values.trackBatchesMode !== detail.product.trackBatchesMode) {
          const modeResult = await updateProductTrackBatchesModeViaProxy(
            productId,
            values.trackBatchesMode,
          );
          if (!modeResult.ok) {
            toast.error(modeResult.error);
            return;
          }
        }
        const refreshed = await fetchProductDetailViaProxy(productId);
        if (!refreshed) {
          toast.error("Producto guardado pero no se pudo recargar el detalle.");
          return;
        }
        toast.success("Producto guardado.");
        onSaved(refreshed);
      } finally {
        onSavingChange(false);
      }
    },
    [detail.product.trackBatchesMode, onSaved, onSavingChange, productId, readOnly],
  );

  useImperativeHandle(ref, () => ({
    submit: () => {
      void methods.handleSubmit(save)();
    },
  }));

  return (
    <FormProvider {...methods}>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          void methods.handleSubmit(save)();
        }}
      >
        {children}
      </form>
    </FormProvider>
  );
});

export function ProductDetailExperience({
  productId,
}: Readonly<{ productId: number }>) {
  const { role, can } = useWorkspacePermissions();
  const canEdit = canMutateInventory(role);
  const canEditPricing = can("pricing.edit_own");
  const formRef = useRef<ProductFormHandle>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DashboardProductDetail | null>(null);
  const [batchSettings, setBatchSettings] = useState<BatchSettings | null>(null);
  const [pricingEngineEnabled, setPricingEngineEnabled] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState<"USD" | "CRC">("CRC");
  const [categories, setCategories] = useState<DashboardCategoryOption[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [orderDetailId, setOrderDetailId] = useState<string | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProductDetailViaProxy(productId);
      if (!data) {
        setError("No se pudo cargar el producto.");
        setDetail(null);
        return;
      }
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el producto.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const openOrderDetail = useCallback((orderId: string) => {
    setOrderDetailId(orderId);
    setOrderDetailOpen(true);
  }, []);

  useEffect(() => {
    async function loadPricingSettings() {
      try {
        const [batch, settings] = await Promise.all([
          fetchBatchSettingsViaProxy(),
          fetchDashboardSettingsViaProxy(),
        ]);
        setBatchSettings(batch);
        setPricingEngineEnabled(settings?.pricing.engineEnabled ?? false);
        setDefaultCurrency(settings?.pricing.defaultCurrency ?? "CRC");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo cargar configuración de lotes.");
      }
    }
    void loadPricingSettings();
    const onFocus = () => void loadPricingSettings();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/backend/dashboard/product-categories", {
          cache: "no-store",
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          setCategoriesError(typeof data.error === "string" ? data.error : `Error ${res.status}`);
          return;
        }
        const list: DashboardCategoryOption[] = [];
        if (Array.isArray(data.categories)) {
          for (const item of data.categories) {
            if (!item || typeof item !== "object") continue;
            const o = item as Record<string, unknown>;
            const id = typeof o.categoryId === "number" ? o.categoryId : Number(o.categoryId);
            const name = typeof o.name === "string" ? o.name.trim() : "";
            if (Number.isFinite(id) && id >= 1 && name) list.push({ categoryId: id, name });
          }
        }
        setCategories(list);
      } catch {
        setCategoriesError("Error de red al cargar categorías.");
      }
    })();
  }, []);

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !detail) {
    return (
      <div className={workspaceContentOuterClassName}>
        <p className="text-destructive text-sm">{error ?? "Producto no encontrado."}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/products">Volver al inventario</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={workspaceContentOuterClassName}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Inicio</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/products">Inventario</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{detail.product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <ProductFormEditor
        ref={formRef}
        productId={productId}
        detail={detail}
        categories={categories}
        categoriesLoadError={categoriesError}
        readOnly={!canEdit}
        onSavingChange={setSaving}
        onSaved={setDetail}
      >
        <header className="flex items-center justify-between gap-4 py-4">
          <div>
            <div className="text-muted-foreground text-xs">{detail.product.sku ?? "—"}</div>
            <h1 className="font-semibold text-2xl">{detail.product.name}</h1>
          </div>
          <Button disabled={!canEdit || saving} type="button" onClick={() => formRef.current?.submit()}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <Tabs defaultValue="detalles" className="min-w-0">
            <TabsList className="flex h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="detalles">Detalles</TabsTrigger>
              <TabsTrigger value="precio">Precio</TabsTrigger>
              <TabsTrigger value="inventario">Inventario</TabsTrigger>
              <TabsTrigger value="ventas">Ventas</TabsTrigger>
              <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
              <TabsTrigger value="clientes">Clientes</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="detalles" className="mt-4">
              <ProductFormFields
                mode="edit"
                categories={categories}
                categoriesLoadError={categoriesError}
                readOnly={!canEdit}
              />
            </TabsContent>
            <TabsContent value="precio" className="mt-4">
              <ProductPricingTab
                canEditProductFields={canEdit}
                currency={defaultCurrency}
                engineEnabled={pricingEngineEnabled}
                productCost={detail.product.cost}
                productId={productId}
                productListPrice={detail.product.price}
                readOnly={!canEditPricing}
              />
            </TabsContent>
            <TabsContent value="inventario" className="mt-4">
              <ProductInventoryTab
                detail={detail}
                batchSettings={batchSettings}
                canEditInventory={canEdit}
                onRefresh={() => void loadDetail()}
              />
            </TabsContent>
            <TabsContent value="ventas" className="mt-4">
              <WorkspaceComingSoon title="Ventas" />
            </TabsContent>
            <TabsContent value="pedidos" className="mt-4">
              <ProductOrdersTab orders={detail.orders} onOpenOrder={openOrderDetail} />
            </TabsContent>
            <TabsContent value="clientes" className="mt-4">
              <WorkspaceComingSoon title="Clientes" />
            </TabsContent>
            <TabsContent value="historial" className="mt-4">
              <WorkspaceComingSoon title="Historial de cambios" />
            </TabsContent>
          </Tabs>

          <ProductSidebar detail={detail} batchSettings={batchSettings} readOnly={!canEdit} />
        </div>
      </ProductFormEditor>
      <OrderDetailSheet
        navigationOrderIds={detail.orders.map((order) => order.orderId)}
        open={orderDetailOpen}
        orderId={orderDetailId}
        onNavigateOrder={setOrderDetailId}
        onOpenChange={setOrderDetailOpen}
        onOrderRemoved={() => void loadDetail()}
        onOrderStatusChange={() => void loadDetail()}
      />
    </div>
  );
}
