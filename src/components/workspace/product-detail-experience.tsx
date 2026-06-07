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
import { Loader2 } from "lucide-react";
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
import { ProductFormFields } from "@/components/workspace/product-form-fields";
import { ProductInventoryTab } from "@/components/workspace/product-inventory-tab";
import { ProductOrdersTab } from "@/components/workspace/product-orders-tab";
import { ProductSidebar } from "@/components/workspace/product-sidebar";
import { WorkspaceComingSoon } from "@/components/workspace/workspace-coming-soon";
import {
  buildProductPayload,
  productDetailToFormValues,
  productFormSchema,
  type ProductFormValues,
} from "@/lib/product-form";
import {
  fetchProductDetailViaProxy,
  patchProductDetailViaProxy,
  type DashboardProductDetail,
} from "@/lib/product-detail";
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
        toast.success("Producto guardado.");
        onSaved(result.detail);
      } finally {
        onSavingChange(false);
      }
    },
    [onSaved, onSavingChange, productId, readOnly],
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
  const { role } = useWorkspacePermissions();
  const canEdit = canMutateInventory(role);
  const formRef = useRef<ProductFormHandle>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DashboardProductDetail | null>(null);
  const [categories, setCategories] = useState<DashboardCategoryOption[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

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
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Cargando producto…
      </div>
    );
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
            <TabsContent value="inventario" className="mt-4">
              <ProductInventoryTab
                detail={detail}
                canEditInventory={canEdit}
                onRefresh={() => void loadDetail()}
              />
            </TabsContent>
            <TabsContent value="ventas" className="mt-4">
              <WorkspaceComingSoon title="Ventas" />
            </TabsContent>
            <TabsContent value="pedidos" className="mt-4">
              <ProductOrdersTab orders={detail.orders} />
            </TabsContent>
            <TabsContent value="clientes" className="mt-4">
              <WorkspaceComingSoon title="Clientes" />
            </TabsContent>
            <TabsContent value="historial" className="mt-4">
              <WorkspaceComingSoon title="Historial de cambios" />
            </TabsContent>
          </Tabs>

          <ProductSidebar detail={detail} readOnly={!canEdit} />
        </div>
      </ProductFormEditor>
    </div>
  );
}
