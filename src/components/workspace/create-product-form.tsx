"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { HelpCircle, ImageIcon, Loader2 } from "lucide-react";
import { Controller, type Resolver, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const UNIT_OPTIONS = [
  "Paquete",
  "kg",
  "unidad",
  "caja",
  "bolsa",
  "litro",
  "ml",
] as const;

const ACCEPT_IMAGE = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_BYTES = 614_400;

export type DashboardCategoryOption = Readonly<{ categoryId: number; name: string }>;

const catSourceSchema = z.enum(["existing", "new"]);

function RequiredMark() {
  return (
    <abbr className="ml-0.5 cursor-help text-destructive no-underline" title="Obligatorio">
      *
    </abbr>
  );
}

function FieldHint({
  text,
  className,
}: Readonly<{ text: string; className?: string }>) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={text}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-full outline-none hover:text-foreground",
            className,
          )}
        >
          <HelpCircle className="size-3.5 text-muted-foreground" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

const yn = z.enum(["yes", "no"]);

const formSchema = z
  .object({
    name: z.string().trim().min(1, "Nombre obligatorio."),
    sku: z.string().trim().min(1, "SKU obligatorio."),
    unit: z.string().min(1, "Unidad obligatoria."),
    presentation: z.string().optional(),
    categorySource: catSourceSchema,
    categoryId: z.string(),
    newCategoryName: z.string(),
    brand: z.string().trim().min(1, "Marca obligatoria."),
    inBundles: yn,
    itemsPerBundle: z.string().optional(),
    imageDataUrl: z.string().nullable().optional(),
    alwaysWithInventory: yn,
    inventoryQuantity: z.string().optional(),
    manageMinimumStock: yn,
    minimumStockQuantity: z.string().optional(),
    price: z.string().trim().min(1, "Precio obligatorio."),
    cost: z.string().trim().min(1, "Costo obligatorio."),
    availableForCustomers: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.categorySource === "existing") {
      const id = Number.parseInt(data.categoryId.trim(), 10);
      if (!Number.isFinite(id) || id < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Elegí una categoría.",
          path: ["categoryId"],
        });
      }
    } else {
      const n = data.newCategoryName.trim();
      if (!n.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nombre de categoría obligatorio.",
          path: ["newCategoryName"],
        });
      }
    }

    const priceNum = Number(data.price.trim().replace(",", "."));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Precio inválido.", path: ["price"] });
    }
    const costNum = Number(data.cost.trim().replace(",", "."));
    if (!Number.isFinite(costNum) || costNum < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Costo inválido.", path: ["cost"] });
    }

    if (data.inBundles === "yes") {
      const n = Number.parseInt(data.itemsPerBundle?.trim() ?? "", 10);
      if (!Number.isFinite(n) || n < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cantidad por fardo obligatoria (entero ≥ 1).",
          path: ["itemsPerBundle"],
        });
      }
    }

    if (data.alwaysWithInventory === "no") {
      const q = Number.parseInt(data.inventoryQuantity?.trim() ?? "", 10);
      if (!Number.isFinite(q) || q < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cantidad de inventario obligatoria (entero positivo).",
          path: ["inventoryQuantity"],
        });
      }
    }

    if (data.manageMinimumStock === "yes") {
      const m = Number.parseInt(data.minimumStockQuantity?.trim() ?? "", 10);
      if (!Number.isFinite(m) || m < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cantidad mínima obligatoria (entero ≥ 0).",
          path: ["minimumStockQuantity"],
        });
      }
    }
  });

export type CreateProductFormValues = z.infer<typeof formSchema>;

export function CreateProductForm({
  categories,
  categoriesLoadError,
  onCategoryListChanged,
  onCancel,
  onCreated,
}: Readonly<{
  categories: readonly DashboardCategoryOption[];
  /** When set (e.g. GET 404 / network issue), categories list may still be usable after creating locally. */
  categoriesLoadError?: string | null;
  /** Notify parent after a category is persisted so local list can merge the new category. */
  onCategoryListChanged?: (category: DashboardCategoryOption) => void;
  onCancel: () => void;
  onCreated: () => void;
}>) {
  const categoriesLoadErrorResolved = categoriesLoadError ?? null;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductFormValues>({
    resolver: zodResolver(formSchema) as Resolver<CreateProductFormValues>,
    defaultValues: {
      name: "",
      sku: "",
      unit: "Paquete",
      presentation: "",
      categorySource: "existing",
      categoryId: "",
      newCategoryName: "",
      brand: "",
      inBundles: "no",
      itemsPerBundle: "",
      imageDataUrl: null,
      alwaysWithInventory: "yes",
      inventoryQuantity: "",
      manageMinimumStock: "no",
      minimumStockQuantity: "",
      price: "",
      cost: "",
      availableForCustomers: true,
    },
  });

  const categorySource = useWatch({ control, name: "categorySource" });
  const inBundles = useWatch({ control, name: "inBundles" });
  const alwaysInv = useWatch({ control, name: "alwaysWithInventory" });
  const manageMin = useWatch({ control, name: "manageMinimumStock" });

  /** When there are zero categories loaded, Radix `<Select>` would misbehave; force "crear nueva". */
  useEffect(() => {
    if (categories.length === 0) setValue("categorySource", "new");
  }, [categories.length, setValue]);

  /** When there's exactly one category, pre-fill the picker. */
  useEffect(() => {
    if (categories.length !== 1) return;
    const only = categories[0];
    if (!only) return;
    setValue("categorySource", "existing");
    setValue("categoryId", String(only.categoryId));
  }, [categories, setValue]);

  async function submit(values: CreateProductFormValues) {
    let categoryIdNum: number;

    if (values.categorySource === "new") {
      try {
        const res = await fetch("/api/backend/dashboard/product-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: values.newCategoryName.trim() }),
        });
        const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          const msg = typeof raw.error === "string" ? raw.error : "No se pudo crear la categoría.";
          toast.error(msg);
          return;
        }
        const cat = raw.category as Record<string, unknown> | undefined;
        const id =
          typeof cat?.categoryId === "number" ? cat.categoryId : Number(cat?.categoryId);
        const nm = typeof cat?.name === "string" ? cat.name.trim() : "";
        if (!Number.isFinite(id) || id < 1 || !nm.length) {
          toast.error("Respuesta inválida del servidor al crear categoría.");
          return;
        }
        categoryIdNum = id;
        const option: DashboardCategoryOption = { categoryId: categoryIdNum, name: nm };
        onCategoryListChanged?.(option);
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

    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      sku: values.sku.trim(),
      unit: values.unit.trim(),
      categoryId: categoryIdNum,
      brand: values.brand.trim(),
      inBundles: values.inBundles === "yes",
      alwaysWithInventory: values.alwaysWithInventory === "yes",
      manageMinimumStock: values.manageMinimumStock === "yes",
      price: Number(values.price.trim().replace(",", ".")),
      cost: Number(values.cost.trim().replace(",", ".")),
      availableForCustomers: values.availableForCustomers,
    };

    const presTrim = typeof values.presentation === "string" ? values.presentation.trim() : "";
    if (presTrim.length) payload.presentation = presTrim;

    if (values.imageDataUrl) payload.imageDataUrl = values.imageDataUrl;

    if (values.inBundles === "yes") {
      payload.itemsPerBundle = Number.parseInt(values.itemsPerBundle?.trim() ?? "", 10);
    }
    if (values.alwaysWithInventory === "no") {
      payload.inventoryQuantity = Number.parseInt(values.inventoryQuantity?.trim() ?? "", 10);
    }
    if (values.manageMinimumStock === "yes") {
      payload.minimumStockQuantity = Number.parseInt(values.minimumStockQuantity?.trim() ?? "", 10);
    }

    try {
      const res = await fetch("/api/backend/dashboard/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg = typeof raw.error === "string" ? raw.error : "No se pudo crear el producto.";
        toast.error(msg);
        return;
      }

      const p = raw.product as Record<string, unknown> | undefined;
      const platformCode =
        typeof p?.platformProductCode === "string" ? p.platformProductCode : "";
      toast.success(
        platformCode
          ? `Producto creado. Código de plataforma: ${platformCode}`
          : "Producto creado.",
      );
      onCreated();
    } catch {
      toast.error("Error de red al crear el producto.");
    }
  }

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

  const row2 = "grid gap-4 sm:grid-cols-2";

  return (
    <TooltipProvider delayDuration={0}>
      <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={handleSubmit(submit)}>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-2">
            <h2 className="font-semibold text-foreground text-lg">Crear producto</h2>
            <Separator />
          </div>

          {categoriesLoadErrorResolved ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 text-xs dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              No pudimos cargar el listado de categorías: {categoriesLoadErrorResolved}. Podés crear una
              categoría nueva igualmente; después de crear el API, también deberían listarse bien.
            </p>
          ) : null}

          <div className={row2}>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm" htmlFor="product-name">
                Nombre del producto
                <RequiredMark />
              </Label>
              <Input id="product-name" placeholder="Nombre del producto" {...register("name")} />
              {errors.name ? (
                <p className="text-destructive text-xs">{errors.name.message}</p>
              ) : null}
            </div>
          </div>

          <div className={`${row2} items-end`}>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="product-sku">SKU</Label>
                <FieldHint text="Referencia única por proveedor;" />
              </div>
              <Input id="product-sku" placeholder="125360123678" {...register("sku")} />
              {errors.sku ? (
                <p className="text-destructive text-xs">{errors.sku.message}</p>
              ) : null}
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
              <Input id="presentation" placeholder="ej: 564ml" {...register("presentation")} />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
            <div className={row2}>
              <div className="space-y-2 sm:col-span-2">
                <Label>Categoría</Label>
                {categories.length > 0 ? (
                  <Controller
                    name="categorySource"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-6">
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="radio"
                            checked={field.value === "existing"}
                            name="category-source"
                            className="size-4 accent-primary"
                            onChange={() => field.onChange("existing")}
                          />
                          Elegir existente
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="radio"
                            checked={field.value === "new"}
                            name="category-source"
                            className="size-4 accent-primary"
                            onChange={() => field.onChange("new")}
                          />
                          Crear nueva
                        </label>
                      </div>
                    )}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No hay categorías aún en tu cuenta; creá una con el nombre siguiente.
                  </p>
                )}
              </div>
            </div>

            {categories.length > 0 && categorySource === "existing" ? (
              <div className="space-y-2">
                <Label>
                  Lista de categorías
                  <RequiredMark />
                </Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? field.value : undefined}
                      onValueChange={(v) => field.onChange(v)}
                    >
                      <SelectTrigger className="w-full">
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
            ) : null}

            {categories.length === 0 || categorySource === "new" ? (
              <div className="space-y-2">
                <Label htmlFor="new-category-name">
                  Nombre de la nueva categoría
                  <RequiredMark />
                </Label>
                <Input
                  id="new-category-name"
                  placeholder="ej: Bebidas, Lácteos…"
                  {...register("newCategoryName")}
                  autoComplete="off"
                />
                {errors.newCategoryName ? (
                  <p className="text-destructive text-xs">{errors.newCategoryName.message}</p>
                ) : null}
              </div>
            ) : null}

            <div className={`${row2} items-end pt-2`}>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="brand">
                  Marca
                  <RequiredMark />
                </Label>
                <Input id="brand" placeholder="Nombre de la marca" {...register("brand")} />
                {errors.brand ? (
                  <p className="text-destructive text-xs">{errors.brand.message}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-1">
              <Label className="pt-2">¿El producto está en fardos?</Label>
              <FieldHint text="Activalo si vendés por paquete compuesto como fardo;" />
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
                        name="inBundles-choice"
                        onChange={() => field.onChange(v)}
                        className="size-4 accent-primary"
                      />
                      {v === "yes" ? "Sí" : "No"}
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.inBundles ? (
              <p className="text-destructive text-xs">{errors.inBundles.message}</p>
            ) : null}
          </div>

          {inBundles === "yes" ? (
            <div className="space-y-2">
              <Label htmlFor="items-per-bundle">
                Ítems por fardo
                <RequiredMark />
              </Label>
              <Input
                id="items-per-bundle"
                inputMode="numeric"
                type="number"
                min={1}
                {...register("itemsPerBundle")}
              />
              {errors.itemsPerBundle ? (
                <p className="text-destructive text-xs">{errors.itemsPerBundle.message}</p>
              ) : null}
            </div>
          ) : null}

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-1">
              <Label>Imagen del producto (Opcional)</Label>
              <FieldHint text="JPG, PNG o WebP. Máximo ~600 KB en esta versión (data URL)." />
            </div>
            <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
              <ImageIcon className="size-12 text-muted-foreground" aria-hidden />
              <p className="text-muted-foreground text-sm leading-relaxed">
                Arrastrá la foto de tu producto o{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => document.getElementById("product-image-input")?.click()}
                >
                  buscá
                </button>{" "}
                el archivo.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("product-image-input")?.click()}
              >
                Subir el archivo
              </Button>
              <input
                id="product-image-input"
                type="file"
                accept={[...ACCEPT_IMAGE].join(",")}
                className="hidden"
                onChange={(e) => onImageFiles(e.target.files)}
              />
              <p className="max-w-md text-muted-foreground text-xs">
                Formatos JPG, PNG, WebP. Tamaño máximo recomendado 500×500 px en fondo claro cuando aplique.
              </p>
            </div>
            <Controller
              name="imageDataUrl"
              control={control}
              render={({ field }) =>
                field.value ? (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="Vista previa"
                      className="max-h-48 max-w-full rounded-md border border-border object-contain"
                      src={field.value}
                    />
                  </div>
                ) : (
                  <span className="sr-only">Sin imagen</span>
                )
              }
            />
          </div>

          <Separator />

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>¿Inventario siempre disponible?</Label>
                <FieldHint text="Si es Sí, el inventario técnico se guarda alto (ilimitado). Si es No, ingresás la cantidad." />
              </div>
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
                          name="always-inventory-choice"
                          onChange={() => field.onChange(v)}
                          className="size-4 accent-primary"
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
                <Input
                  id="inventory-qty"
                  inputMode="numeric"
                  min={1}
                  type="number"
                  {...register("inventoryQuantity")}
                />
                {errors.inventoryQuantity ? (
                  <p className="text-destructive text-xs">{errors.inventoryQuantity.message}</p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>¿Manejar inventario mínimo?</Label>
              </div>
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
                          name="min-stock-choice"
                          onChange={() => field.onChange(v)}
                          className="size-4 accent-primary"
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
                <Label htmlFor="min-stock">
                  Inventario mínimo
                  <RequiredMark />
                </Label>
                <Input
                  id="min-stock"
                  inputMode="numeric"
                  min={0}
                  type="number"
                  {...register("minimumStockQuantity")}
                />
                {errors.minimumStockQuantity ? (
                  <p className="text-destructive text-xs">{errors.minimumStockQuantity.message}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <Separator />

          <div className={`${row2} items-end`}>
            <div className="space-y-2">
              <Label htmlFor="price">
                Precio de lista
                <RequiredMark />
              </Label>
              <Input id="price" inputMode="decimal" placeholder="3400" {...register("price")} />
              {errors.price ? (
                <p className="text-destructive text-xs">{errors.price.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">
                Costo del producto
                <RequiredMark />
              </Label>
              <Input id="cost" inputMode="decimal" placeholder="3400" {...register("cost")} />
              {errors.cost ? (
                <p className="text-destructive text-xs">{errors.cost.message}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-border border-t bg-background px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Button
              disabled={isSubmitting}
              onClick={() => onCancel()}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>

            <div className="flex flex-1 flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center">
              <Controller
                name="availableForCustomers"
                control={control}
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center gap-2 text-foreground text-sm">
                    <Checkbox
                      aria-label="Disponibilidad del producto"
                      checked={field.value}
                      onCheckedChange={(c) => field.onChange(c === true)}
                    />
                    Disponibilidad del producto
                  </label>
                )}
              />
            </div>

            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Guardando…
                </>
              ) : (
                "Agregar"
              )}
            </Button>
          </div>
        </div>
      </form>
    </TooltipProvider>
  );
}

function validateDataUrlLocally(url: string | null): boolean {
  if (!url) return false;
  const allowed = [
    "data:image/jpeg;base64,",
    "data:image/jpg;base64,",
    "data:image/png;base64,",
    "data:image/webp;base64,",
  ];
  return allowed.some((p) => url.startsWith(p));
}
