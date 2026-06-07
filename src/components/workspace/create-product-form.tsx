"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Loader2 } from "lucide-react";
import { Controller, FormProvider, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductFormFields } from "@/components/workspace/product-form-fields";
import { resolveDashboardProductErrorNo } from "@/lib/dashboard-product-error-nos";
import {
  buildProductPayload,
  emptyProductFormValues,
  productFormSchema,
  type DashboardCategoryOption,
  type ProductFormValues,
} from "@/lib/product-form";
import { copyTextWithUserGesture } from "@/lib/copy-text";

export type { DashboardCategoryOption } from "@/lib/product-form";
export type CreateProductFormValues = ProductFormValues;

function resolveWorkspaceApiError(
  raw: Record<string, unknown>,
  status: number,
  fallbackWithoutServerMessage: string,
): { userText: string; metaLines: string[]; copyText: string } {
  const errStr = typeof raw.error === "string" && raw.error.trim() ? raw.error.trim() : "";
  const msgStr = typeof raw.message === "string" && raw.message.trim() ? raw.message.trim() : "";
  const baseParts = [...new Set([errStr, msgStr].filter(Boolean))];
  const code =
    typeof raw.code === "string" && /^DPROD_/u.test(raw.code.trim()) ? raw.code.trim() : null;
  const errorNo = resolveDashboardProductErrorNo(code, raw.errorNo);
  const diagnosticHint =
    typeof raw.diagnosticHint === "string" && raw.diagnosticHint.trim()
      ? raw.diagnosticHint.trim()
      : null;

  let userText = baseParts.length
    ? baseParts.join("\n")
    : status === 401 || status === 403
      ? "Sesión inválida o expirada. Iniciá sesión de nuevo."
      : status === 404
        ? "No se encontró la ruta del API (404). Verificá que el backend esté desplegado."
        : status === 502 || status === 503
          ? "El servidor no respondió. Reintentá en unos segundos."
          : fallbackWithoutServerMessage;

  const metaLines = [
    errorNo !== null ? `Número de error: ${String(errorNo)}` : null,
    code ? `Código: ${code}` : null,
    `HTTP: ${String(status)}`,
    diagnosticHint ? `Detalle técnico: ${diagnosticHint}` : null,
  ].filter(Boolean) as string[];

  return { userText, metaLines, copyText: metaLines.length ? `${userText}\n\n${metaLines.join("\n")}` : userText };
}

function toastWorkspaceError(
  heading: string,
  raw: Record<string, unknown>,
  status: number,
  fallbackWithoutServerMessage: string,
) {
  const { userText, metaLines, copyText } = resolveWorkspaceApiError(
    raw,
    status,
    fallbackWithoutServerMessage,
  );
  toast.custom(
    (id) => (
      <div className="flex w-[min(100vw-2rem,24rem)] max-w-md select-text flex-col gap-3 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg">
        <div className="space-y-2">
          <p className="font-semibold text-destructive text-sm">{heading}</p>
          <p className="whitespace-pre-wrap text-sm">{userText}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (copyTextWithUserGesture(copyText)) {
              toast.success("Detalle copiado.");
              toast.dismiss(id);
            }
          }}
        >
          <Copy className="mr-1 size-3.5" />
          Copiar detalle
        </Button>
      </div>
    ),
    { duration: 45_000 },
  );
}

export function CreateProductForm({
  categories,
  categoriesLoadError,
  onCategoryListChanged,
  onCancel,
  onCreated,
}: Readonly<{
  categories: readonly DashboardCategoryOption[];
  categoriesLoadError?: string | null;
  onCategoryListChanged?: (category: DashboardCategoryOption) => void;
  onCancel: () => void;
  onCreated: () => void;
}>) {
  const methods = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as Resolver<ProductFormValues>,
    defaultValues: emptyProductFormValues,
  });

  const { handleSubmit, setValue, control, formState: { isSubmitting } } = methods;

  useEffect(() => {
    if (categories.length === 0) setValue("categorySource", "new");
  }, [categories.length, setValue]);

  useEffect(() => {
    if (categories.length !== 1) return;
    const only = categories[0];
    if (!only) return;
    setValue("categorySource", "existing");
    setValue("categoryId", String(only.categoryId));
  }, [categories, setValue]);

  async function submit(values: ProductFormValues) {
    let categoryIdNum: number;

    if (values.categorySource === "new") {
      try {
        const res = await fetch("/api/backend/dashboard/product-categories", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: values.newCategoryName.trim() }),
        });
        const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          toastWorkspaceError("No se pudo crear la categoría", raw, res.status, "No se pudo crear la categoría.");
          return;
        }
        const cat = raw.category as Record<string, unknown> | undefined;
        const id = typeof cat?.categoryId === "number" ? cat.categoryId : Number(cat?.categoryId);
        const nm = typeof cat?.name === "string" ? cat.name.trim() : "";
        if (!Number.isFinite(id) || id < 1 || !nm.length) {
          toast.error("Respuesta inválida del servidor al crear categoría.");
          return;
        }
        categoryIdNum = id;
        onCategoryListChanged?.({ categoryId: categoryIdNum, name: nm });
        setValue("categorySource", "existing");
        setValue("categoryId", String(categoryIdNum));
      } catch {
        toast.error("Error de red al crear la categoría.");
        return;
      }
    } else {
      categoryIdNum = Number.parseInt(values.categoryId.trim(), 10);
      if (!Number.isFinite(categoryIdNum)) {
        toast.error("Categoría inválida.");
        return;
      }
    }

    const payload = buildProductPayload(values, categoryIdNum, "create");

    try {
      const res = await fetch("/api/backend/dashboard/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        toastWorkspaceError(
          "No se pudo crear el producto",
          raw,
          res.status,
          `No se pudo crear el producto (HTTP ${String(res.status)}).`,
        );
        return;
      }
      const p = raw.product as Record<string, unknown> | undefined;
      const platformCode =
        typeof p?.platformProductCode === "string" ? p.platformProductCode : "";
      toast.success(
        platformCode ? `Producto creado. Código: ${platformCode}` : "Producto creado.",
      );
      onCreated();
    } catch {
      toast.error("Error de red al crear el producto.");
    }
  }

  return (
    <FormProvider {...methods}>
      <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={handleSubmit(submit)}>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <ProductFormFields
            mode="create"
            categories={categories}
            categoriesLoadError={categoriesLoadError}
          />
        </div>
        <div className="border-border border-t bg-background px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="outline">
              Cancelar
            </Button>
            <Controller
              name="availableForCustomers"
              control={control}
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(c) => field.onChange(c === true)}
                  />
                  Disponibilidad del producto
                </label>
              )}
            />
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Agregar"
              )}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
