"use client";

import { useId, useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type Control,
  type FieldErrors,
  type Resolver,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import type { DashboardProductRow } from "@/lib/dashboard-products";
import {
  buildCreatePayload,
  computeReorderSuggestions,
  createPurchaseOrderViaProxy,
  expectedFromLeadTime,
  formatPoMoney,
} from "@/lib/purchase-orders";
import type { VendorOption, WarehouseOption } from "@/lib/purchase-orders-server";
import { canMutateInventory } from "@/lib/roles";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

const MAX_LINES = 80;

const lineSchema = z.object({
  productId: z.coerce.number().int().min(0),
  qtyOrdered: z.coerce.number(),
  unitCost: z.coerce.number(),
});

const formSchema = z
  .object({
    vendorId: z.coerce.number().int().positive("Seleccioná un proveedor."),
    warehouseId: z.coerce.number().int().positive("Seleccioná una bodega."),
    expectedAt: z.string().optional(),
    extraCosts: z.coerce.number().min(0).optional(),
    notes: z.string().max(500).optional(),
    lines: z.array(lineSchema).min(1, "Agregá al menos un producto."),
  })
  .superRefine((data, ctx) => {
    const filled = data.lines.filter((l) => l.productId > 0);
    if (filled.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Agregá al menos un producto.",
        path: ["lines"],
      });
      return;
    }
    for (let i = 0; i < data.lines.length; i++) {
      const line = data.lines[i]!;
      if (line.productId <= 0) continue;
      if (!Number.isFinite(line.qtyOrdered) || line.qtyOrdered <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La cantidad debe ser mayor a 0.",
          path: ["lines", i, "qtyOrdered"],
        });
      }
      if (!Number.isFinite(line.unitCost) || line.unitCost < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El costo no puede ser negativo.",
          path: ["lines", i, "unitCost"],
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

function emptyLine(): FormValues["lines"][number] {
  return { productId: 0, qtyOrdered: 1, unitCost: 0 };
}

export function CreatePurchaseOrderForm({
  vendors,
  warehouses,
  products,
}: Readonly<{
  vendors: readonly VendorOption[];
  warehouses: readonly WarehouseOption[];
  products: readonly DashboardProductRow[];
}>) {
  const router = useRouter();
  const formId = useId();
  const { role } = useWorkspacePermissions();
  const canEdit = canMutateInventory(role);
  const [submitting, setSubmitting] = useState(false);

  const selectableProducts = useMemo(
    () => products.filter((p) => p.status === "active"),
    [products],
  );
  const suggestions = useMemo(
    () => computeReorderSuggestions(selectableProducts),
    [selectableProducts],
  );

  const defaultWarehouseId = warehouses.length === 1 ? warehouses[0]!.warehouseId : 0;
  const resolver = zodResolver(formSchema) as Resolver<FormValues>;

  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver,
    defaultValues: {
      vendorId: 0,
      warehouseId: defaultWarehouseId,
      expectedAt: "",
      extraCosts: 0,
      notes: "",
      lines: [emptyLine()],
    },
  });

  const { fields, append, remove, update } = useFieldArray({ control, name: "lines" });
  const watchedLines = useWatch({ control, name: "lines" });
  const watchedVendorId = useWatch({ control, name: "vendorId" });

  const currency =
    vendors.find((v) => v.vendorId === watchedVendorId)?.defaultCurrency ?? null;

  const subtotal = useMemo(() => {
    return (watchedLines ?? []).reduce((sum, l) => {
      const q = Number(l?.qtyOrdered) || 0;
      const c = Number(l?.unitCost) || 0;
      return sum + q * c;
    }, 0);
  }, [watchedLines]);

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center text-muted-foreground text-sm">
        No tenés permiso para crear órdenes de compra.
        <div className="mt-4">
          <Button asChild type="button" variant="outline">
            <Link href="/compras/ordenes">Volver</Link>
          </Button>
        </div>
      </div>
    );
  }

  function onVendorPick(value: string) {
    const vid = Number(value);
    setValue("vendorId", vid, { shouldValidate: true });
    const vendor = vendors.find((v) => v.vendorId === vid);
    const seeded = expectedFromLeadTime(vendor?.leadTimeDays ?? null);
    if (seeded && !getValues("expectedAt")) {
      setValue("expectedAt", seeded, { shouldValidate: false });
    }
  }

  function onProductPick(index: number, value: string) {
    const pid = Number(value);
    update(index, {
      productId: pid,
      qtyOrdered: getValues(`lines.${index}.qtyOrdered`) || 1,
      unitCost: getValues(`lines.${index}.unitCost`) || 0,
    });
  }

  function addSuggestion(productId: number, qty: number) {
    const existingIdx = (getValues("lines") ?? []).findIndex((l) => l.productId === productId);
    if (existingIdx >= 0) {
      const cur = getValues(`lines.${existingIdx}.qtyOrdered`) || 0;
      setValue(`lines.${existingIdx}.qtyOrdered`, cur + qty, { shouldValidate: true });
      return;
    }
    if (fields.length >= MAX_LINES) {
      toast.error(`Máximo ${MAX_LINES} líneas.`);
      return;
    }
    append({ productId, qtyOrdered: qty, unitCost: 0 });
  }

  async function onSubmit(values: FormValues) {
    const built = buildCreatePayload({
      vendorId: values.vendorId,
      warehouseId: values.warehouseId,
      expectedAt: values.expectedAt?.trim() ? values.expectedAt : null,
      notes: values.notes ?? "",
      extraCosts: values.extraCosts ?? 0,
      lines: values.lines.map((l) => ({
        productId: l.productId > 0 ? l.productId : undefined,
        qtyOrdered: l.qtyOrdered,
        unitCost: l.unitCost,
      })),
    });
    if (!built.ok) {
      toast.error(built.error);
      return;
    }
    setSubmitting(true);
    try {
      const res = await createPurchaseOrderViaProxy(built.payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Orden ${res.displayCode} creada.`);
      router.push("/compras/ordenes");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8"
      id={formId}
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-semibold text-xl tracking-tight">Nueva orden de compra</h1>
        <div className="flex gap-2">
          <Button asChild type="button" variant="outline">
            <Link href="/compras/ordenes">Cancelar</Link>
          </Button>
          <Button disabled={submitting} form={formId} type="submit">
            {submitting ? <Loader2 aria-hidden className="mr-2 size-4 animate-spin" /> : null}
            Crear orden
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Proveedor</Label>
          <Select onValueChange={onVendorPick}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar proveedor…" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((v) => (
                <SelectItem key={v.vendorId} value={String(v.vendorId)}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vendorId ? (
            <p className="text-destructive text-sm">{errors.vendorId.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Bodega de destino</Label>
          <Select
            defaultValue={defaultWarehouseId > 0 ? String(defaultWarehouseId) : undefined}
            onValueChange={(v) => setValue("warehouseId", Number(v), { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar bodega…" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.warehouseId} value={String(w.warehouseId)}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.warehouseId ? (
            <p className="text-destructive text-sm">{errors.warehouseId.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="po-expected">Fecha estimada de llegada</Label>
          <Input id="po-expected" type="date" {...register("expectedAt")} />
          <p className="text-muted-foreground text-xs">
            Se sugiere según el tiempo de entrega del proveedor; podés ajustarla.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="po-extra">Costos adicionales (flete, etc.)</Label>
          <Input id="po-extra" min={0} step={0.01} type="number" {...register("extraCosts")} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="po-notes">Notas</Label>
          <Textarea id="po-notes" maxLength={500} rows={2} {...register("notes")} />
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50/50 p-4 dark:bg-amber-950/10">
          <p className="font-medium text-sm">Sugerencias de reabastecimiento</p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Productos por debajo del mínimo. Tocá para agregarlos a la orden.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Button
                key={s.productId}
                className="h-auto gap-1 py-1.5"
                size="sm"
                type="button"
                variant="outline"
                onClick={() => addSuggestion(s.productId, s.suggestedQty)}
              >
                <Plus aria-hidden className="size-3.5" />
                {s.name}
                <span className="text-muted-foreground text-xs">
                  ({s.onHand}/{s.minimumStock} · +{s.suggestedQty})
                </span>
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Productos</Label>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              if (fields.length < MAX_LINES) append(emptyLine());
            }}
          >
            <Plus aria-hidden className="mr-1 size-4" />
            Agregar línea
          </Button>
        </div>

        {fields.map((field, index) => (
          <PoLineRow
            key={field.id}
            canRemove={fields.length > 1}
            control={control}
            errors={errors}
            index={index}
            products={selectableProducts}
            register={register}
            onProductPick={onProductPick}
            onRemove={() => remove(index)}
          />
        ))}
        {errors.lines?.message ? (
          <p className="text-destructive text-sm">{errors.lines.message}</p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Subtotal estimado</p>
          <p className="font-semibold text-lg tabular-nums">{formatPoMoney(subtotal, currency)}</p>
        </div>
      </div>
    </form>
  );
}

function PoLineRow({
  index,
  control,
  errors,
  products,
  canRemove,
  onRemove,
  onProductPick,
  register,
}: Readonly<{
  index: number;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  products: readonly DashboardProductRow[];
  canRemove: boolean;
  onRemove: () => void;
  onProductPick: (index: number, value: string) => void;
  register: ReturnType<typeof useForm<FormValues>>["register"];
}>) {
  const line = useWatch({ control, name: `lines.${index}` });
  const selectValue =
    line?.productId && line.productId > 0 ? String(line.productId) : undefined;

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          Línea {index + 1}
        </span>
        {canRemove ? (
          <Button
            aria-label={`Eliminar línea ${index + 1}`}
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Producto</Label>
          <Select value={selectValue} onValueChange={(v) => onProductPick(index, v)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar producto…" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.productId} value={String(p.productId)}>
                  {p.name}
                  {p.sku ? ` (${p.sku})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.lines?.[index]?.productId ? (
            <p className="text-destructive text-sm">{errors.lines[index]?.productId?.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`lines.${index}.qtyOrdered`}>Cantidad</Label>
          <Input
            id={`lines.${index}.qtyOrdered`}
            min={0.01}
            step={0.01}
            type="number"
            {...register(`lines.${index}.qtyOrdered`)}
          />
          {errors.lines?.[index]?.qtyOrdered ? (
            <p className="text-destructive text-sm">{errors.lines[index]?.qtyOrdered?.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`lines.${index}.unitCost`}>Costo unitario</Label>
          <Input
            id={`lines.${index}.unitCost`}
            min={0}
            step={0.01}
            type="number"
            {...register(`lines.${index}.unitCost`)}
          />
          {errors.lines?.[index]?.unitCost ? (
            <p className="text-destructive text-sm">{errors.lines[index]?.unitCost?.message}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
