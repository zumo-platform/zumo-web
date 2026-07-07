"use client";

import { HelpCircle, ImageIcon } from "lucide-react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ACCEPT_IMAGE,
  MAX_IMAGE_BYTES,
  UNIT_OPTIONS,
  validateDataUrlLocally,
  type DashboardCategoryOption,
  type ProductFormValues,
} from "@/lib/product-form";

function RequiredMark() {
  return (
    <abbr className="ml-0.5 cursor-help text-destructive no-underline" title="Obligatorio">
      *
    </abbr>
  );
}

function FieldHint({ text }: Readonly<{ text: string }>) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={text}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full outline-none hover:text-foreground"
        >
          <HelpCircle className="size-3.5 text-muted-foreground" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

export function ProductFormFields({
  mode,
  categories,
  categoriesLoadError,
  readOnly = false,
}: Readonly<{
  mode: "create" | "edit";
  categories: readonly DashboardCategoryOption[];
  categoriesLoadError?: string | null;
  readOnly?: boolean;
}>) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<ProductFormValues>();

  const categorySource = useWatch({ control, name: "categorySource" });
  const inBundles = useWatch({ control, name: "inBundles" });
  const alwaysInv = useWatch({ control, name: "alwaysWithInventory" });
  const manageMin = useWatch({ control, name: "manageMinimumStock" });

  const row2 = "grid gap-4 sm:grid-cols-2";
  const disabled = readOnly;

  function onImageFiles(files: FileList | null) {
    const file = files?.item(0);
    if (!file) {
      setValue("imageDataUrl", null);
      return;
    }
    if (!ACCEPT_IMAGE.includes(file.type as (typeof ACCEPT_IMAGE)[number])) {
      toast.error("Solo JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`La imagen no puede superar ${MAX_IMAGE_BYTES / 1024} KB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : null;
      if (!validateDataUrlLocally(url)) {
        toast.error("No se pudo leer la imagen.");
        return;
      }
      setValue("imageDataUrl", url, { shouldValidate: true });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
      {mode === "create" ? (
        <div className="space-y-2">
          <h2 className="font-semibold text-foreground text-lg">Crear producto</h2>
          <Separator />
        </div>
      ) : null}

      {categoriesLoadError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 text-xs dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          No pudimos cargar el listado de categorías: {categoriesLoadError}. Podés crear una
          categoría nueva igualmente.
        </p>
      ) : null}

      <div className={row2}>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="product-name">
            Nombre del producto
            <RequiredMark />
          </Label>
          <Input disabled={disabled} id="product-name" {...register("name")} />
          {errors.name ? <p className="text-destructive text-xs">{errors.name.message}</p> : null}
        </div>
      </div>

      <div className={`${row2} items-end`}>
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="product-sku">SKU</Label>
            <FieldHint text="Referencia única por proveedor." />
          </div>
          <Input disabled={disabled} id="product-sku" {...register("sku")} />
          {errors.sku ? <p className="text-destructive text-xs">{errors.sku.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label>
            Unidad
            <RequiredMark />
          </Label>
          <Controller
            name="unit"
            control={control}
            render={({ field }) => (
              <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="presentation">Presentación</Label>
          <Input disabled={disabled} id="presentation" placeholder="ej: 564ml" {...register("presentation")} />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
        <div className={row2}>
          <div className="space-y-2 sm:col-span-2">
            <Label>Categoría</Label>
            <Controller
              name="categorySource"
              control={control}
              render={({ field }) => (
                <Select
                  disabled={disabled || categories.length === 0}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">Elegir existente</SelectItem>
                    <SelectItem value="new">Crear nueva</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {categorySource === "existing" ? (
          <div className="space-y-2">
            <Label>Categoría existente</Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId ? (
              <p className="text-destructive text-xs">{errors.categoryId.message}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="new-category">
              Nueva categoría
              <RequiredMark />
            </Label>
            <Input disabled={disabled} id="new-category" {...register("newCategoryName")} />
            {errors.newCategoryName ? (
              <p className="text-destructive text-xs">{errors.newCategoryName.message}</p>
            ) : null}
          </div>
        )}
      </div>

      <div className={row2}>
        <div className="space-y-2">
          <Label htmlFor="brand">
            Marca
            <RequiredMark />
          </Label>
          <Input disabled={disabled} id="brand" {...register("brand")} />
          {errors.brand ? <p className="text-destructive text-xs">{errors.brand.message}</p> : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-1">
          <Label>¿El producto está en fardos?</Label>
          <FieldHint text="Activalo si vendés por paquete compuesto como fardo." />
        </div>
        <Controller
          name="inBundles"
          control={control}
          render={({ field }) => (
            <div className="flex gap-6">
              {(["yes", "no"] as const).map((v) => (
                <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={field.value === v}
                    disabled={disabled}
                    onChange={() => field.onChange(v)}
                  />
                  {v === "yes" ? "Sí" : "No"}
                </label>
              ))}
            </div>
          )}
        />
        {inBundles === "yes" ? (
          <div className="space-y-2">
            <Label htmlFor="items-per-bundle">
              Ítems por fardo
              <RequiredMark />
            </Label>
            <Input disabled={disabled} id="items-per-bundle" inputMode="numeric" type="number" {...register("itemsPerBundle")} />
            {errors.itemsPerBundle ? (
              <p className="text-destructive text-xs">{errors.itemsPerBundle.message}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <Separator />

      <div className="space-y-3">
        <Label>Imagen del producto (Opcional)</Label>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <ImageIcon className="size-10 text-muted-foreground" aria-hidden />
          {!disabled ? (
            <>
              <Button type="button" variant="outline" onClick={() => document.getElementById("product-image-input")?.click()}>
                Subir archivo
              </Button>
              <input
                id="product-image-input"
                type="file"
                accept={[...ACCEPT_IMAGE].join(",")}
                className="hidden"
                onChange={(e) => onImageFiles(e.target.files)}
              />
            </>
          ) : null}
        </div>
        <Controller
          name="imageDataUrl"
          control={control}
          render={({ field }) =>
            field.value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Vista previa" className="max-h-48 rounded-md border object-contain" src={field.value} />
            ) : (
              <span className="sr-only">Sin imagen</span>
            )
          }
        />
      </div>

      {mode === "create" ? (
        <>
          <Separator />
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>¿Inventario siempre disponible?</Label>
              <Controller
                name="alwaysWithInventory"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-6">
                    {(["yes", "no"] as const).map((v) => (
                      <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="radio"
                          checked={field.value === v}
                          disabled={disabled}
                          onChange={() => field.onChange(v)}
                        />
                        {v === "yes" ? "Sí" : "No"}
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>
            {alwaysInv === "no" ? (
              <div className="space-y-2">
                <Label htmlFor="inventory-qty">
                  Cantidad de inventario
                  <RequiredMark />
                </Label>
                <Input disabled={disabled} id="inventory-qty" inputMode="numeric" type="number" {...register("inventoryQuantity")} />
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {manageMin === "yes" && mode === "edit" ? (
        <div className="space-y-2">
          <Label htmlFor="min-stock">Inventario mínimo</Label>
          <Input disabled={disabled} id="min-stock" inputMode="numeric" type="number" {...register("minimumStockQuantity")} />
        </div>
      ) : null}

      {mode === "create" ? (
        <>
          <Separator />

          <div className={`${row2} items-end`}>
            <div className="space-y-2">
              <Label htmlFor="price">
                Precio de lista
                <RequiredMark />
              </Label>
              <Input disabled={disabled} id="price" inputMode="decimal" {...register("price")} />
              {errors.price ? <p className="text-destructive text-xs">{errors.price.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">
                Costo del producto
                <RequiredMark />
              </Label>
              <Input disabled={disabled} id="cost" inputMode="decimal" {...register("cost")} />
              {errors.cost ? <p className="text-destructive text-xs">{errors.cost.message}</p> : null}
            </div>
          </div>
        </>
      ) : null}

      {mode === "create" ? (
        <>
          <div className="space-y-2">
            <Label>¿Manejar inventario mínimo?</Label>
            <Controller
              name="manageMinimumStock"
              control={control}
              render={({ field }) => (
                <div className="flex gap-6">
                  {(["yes", "no"] as const).map((v) => (
                    <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={field.value === v}
                        disabled={disabled}
                        onChange={() => field.onChange(v)}
                      />
                      {v === "yes" ? "Sí" : "No"}
                    </label>
                  ))}
                </div>
              )}
            />
          </div>
          {manageMin === "yes" ? (
            <div className="space-y-2">
              <Label htmlFor="min-stock-create">
                Inventario mínimo
                <RequiredMark />
              </Label>
              <Input disabled={disabled} id="min-stock-create" inputMode="numeric" type="number" {...register("minimumStockQuantity")} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
