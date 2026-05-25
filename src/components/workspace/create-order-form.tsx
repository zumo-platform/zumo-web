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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ErrorAlert } from "@/components/workspace/error-alert";
import type { DashboardCustomerRow } from "@/lib/dashboard-customers";
import { createDashboardOrderViaProxy, type CreateOrderInput } from "@/lib/dashboard-orders";
import type { DashboardProductRow } from "@/lib/dashboard-products";
import { mapOrderError, type MappedOrderError } from "@/lib/order-error-codes";
import { minDeliveryDateInput } from "@/lib/order-delivery-date";
import { isValidDeliveryDateInput } from "@/lib/supplier-timezone";
import { cn } from "@/lib/utils";
import { useWorkspacePreferences } from "@/lib/workspace-preferences-context";

const FREE_PRODUCT_VALUE = "__free__";
const MAX_LINES = 80;

const lineSchema = z
  .object({
    lineKind: z.enum(["catalog", "free"]),
    productId: z.number().int().positive().optional(),
    productNameRaw: z.string().trim().min(1, "El nombre del producto es obligatorio.").max(200),
    quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0."),
    unit: z.string().trim().min(1, "La unidad es obligatoria.").max(40),
  })
  .superRefine((line, ctx) => {
    if (line.lineKind === "catalog" && (line.productId === undefined || line.productId <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seleccioná un producto del catálogo.",
        path: ["productId"],
      });
    }
  });

function buildFormSchema(timeZone: string) {
  return z.object({
    customerId: z.coerce.number().int().positive("Seleccioná un cliente."),
    lines: z.array(lineSchema).min(1, "Agregá al menos una línea de producto.").max(MAX_LINES),
    deliveryDate: z
      .string()
      .trim()
      .min(1, "La fecha de entrega es obligatoria.")
      .regex(/^\d{4}-\d{2}-\d{2}$/u, "Formato inválido (YYYY-MM-DD).")
      .refine((value) => isValidDeliveryDateInput(value, timeZone), {
        message: "La fecha de entrega debe ser hoy o posterior.",
      }),
    deliveryTimeWindow: z.string().max(80).optional(),
    deliveryNotes: z.string().max(500).optional(),
    notes: z.string().max(500).optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

function FieldCharCount({
  control,
  name,
  max,
}: Readonly<{
  control: Control<FormValues>;
  name: "deliveryNotes" | "notes";
  max: number;
}>) {
  const value = useWatch({ control, name }) ?? "";
  return (
    <p className="text-muted-foreground text-xs">
      {value.length}/{max}
    </p>
  );
}

function defaultLine(): FormValues["lines"][number] {
  return {
    lineKind: "catalog",
    productNameRaw: "",
    quantity: 1,
    unit: "",
  };
}

function OrderLineRow({
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
  products: DashboardProductRow[];
  canRemove: boolean;
  onRemove: () => void;
  onProductPick: (index: number, value: string) => void;
  register: ReturnType<typeof useForm<FormValues>>["register"];
}>) {
  const line = useWatch({ control, name: `lines.${index}` });
  const lineKind = line?.lineKind ?? "catalog";
  const productId = line?.productId;
  const selectValue = lineKind === "free" || !productId ? FREE_PRODUCT_VALUE : String(productId);

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
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
              <SelectItem value={FREE_PRODUCT_VALUE}>Producto sin catálogo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`lines.${index}.productNameRaw`}>Nombre en el pedido</Label>
          <Input
            id={`lines.${index}.productNameRaw`}
            {...register(`lines.${index}.productNameRaw`)}
            readOnly={lineKind === "catalog"}
            className={cn(lineKind === "catalog" && "bg-muted/50")}
          />
          {errors.lines?.[index]?.productNameRaw ? (
            <p className="text-destructive text-sm">{errors.lines[index]?.productNameRaw?.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`lines.${index}.quantity`}>Cantidad</Label>
          <Input
            id={`lines.${index}.quantity`}
            min={0.01}
            step={0.01}
            type="number"
            {...register(`lines.${index}.quantity`)}
          />
          {errors.lines?.[index]?.quantity ? (
            <p className="text-destructive text-sm">{errors.lines[index]?.quantity?.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`lines.${index}.unit`}>Unidad</Label>
          <Input id={`lines.${index}.unit`} {...register(`lines.${index}.unit`)} />
          {errors.lines?.[index]?.unit ? (
            <p className="text-destructive text-sm">{errors.lines[index]?.unit?.message}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CreateOrderForm({
  customers,
  products,
}: Readonly<{
  customers: DashboardCustomerRow[];
  products: DashboardProductRow[];
}>) {
  const router = useRouter();
  const formId = useId();
  const { timeZone } = useWorkspacePreferences();
  const minDeliveryDate = minDeliveryDateInput(timeZone);
  const formSchema = useMemo(() => buildFormSchema(timeZone), [timeZone]);
  const [orderError, setOrderError] = useState<MappedOrderError | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      customerId: 0,
      lines: [defaultLine()],
      deliveryDate: "",
      deliveryTimeWindow: "",
      deliveryNotes: "",
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const customerId = useWatch({ control, name: "customerId" });

  async function onSubmit(values: FormValues) {
    setOrderError(null);

    const payload: CreateOrderInput = {
      customerId: values.customerId,
      lines: values.lines.map((line) => ({
        productId: line.lineKind === "catalog" && line.productId ? line.productId : null,
        productNameRaw: line.productNameRaw.trim(),
        quantity: line.quantity,
        unit: line.unit.trim(),
      })),
      deliveryDate: values.deliveryDate.trim(),
      deliveryTimeWindow: values.deliveryTimeWindow?.trim() || undefined,
      deliveryNotes: values.deliveryNotes?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
    };

    try {
      await createDashboardOrderViaProxy(payload);
      toast.success("Pedido creado");
      router.push("/orders");
      router.refresh();
    } catch (err) {
      setOrderError(mapOrderError(err, { requestBody: payload }));
    }
  }

  function onProductPick(index: number, value: string) {
    if (value === FREE_PRODUCT_VALUE) {
      setValue(`lines.${index}.lineKind`, "free");
      setValue(`lines.${index}.productId`, undefined);
      return;
    }
    const pid = Number(value);
    const product = products.find((p) => p.productId === pid);
    setValue(`lines.${index}.lineKind`, "catalog");
    setValue(`lines.${index}.productId`, pid);
    if (product) {
      setValue(`lines.${index}.productNameRaw`, product.name);
      setValue(`lines.${index}.unit`, product.unit);
    }
  }

  return (
    <form className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8" id={formId} onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight text-foreground">Nuevo pedido</h1>
          <p className="text-muted-foreground text-sm">Creá un pedido manualmente para un cliente</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild type="button" variant="outline">
            <Link href="/orders">Cancelar</Link>
          </Button>
          <Button disabled={isSubmitting} form={formId} type="submit">
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Creando…
              </>
            ) : (
              "Crear pedido"
            )}
          </Button>
        </div>
      </div>

      {orderError ? (
        <ErrorAlert
          code={orderError.code}
          details={orderError.details}
          message={orderError.message}
          title="No se pudo crear el pedido"
          onRetry={() => void handleSubmit(onSubmit)()}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cliente</CardTitle>
          <CardDescription>¿Para quién es este pedido?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="customerId">Cliente</Label>
            <Select
              value={customerId > 0 ? String(customerId) : ""}
              onValueChange={(v) => setValue("customerId", Number(v), { shouldValidate: true })}
            >
              <SelectTrigger id="customerId">
                <SelectValue placeholder="Seleccionar cliente…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.customerId} value={String(c.customerId)}>
                    {c.name} · {c.contactPhone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customerId ? (
              <p className="text-destructive text-sm">{errors.customerId.message}</p>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">
            ¿No encontrás al cliente?{" "}
            <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/clients/creation">
              Crear cliente nuevo
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos</CardTitle>
          <CardDescription>Agregá las líneas del pedido</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.lines?.message ? (
            <p className="text-destructive text-sm">{errors.lines.message}</p>
          ) : null}

          {fields.map((field, index) => (
            <OrderLineRow
              canRemove={fields.length > 1}
              control={control}
              errors={errors}
              index={index}
              key={field.id}
              products={products}
              register={register}
              onProductPick={onProductPick}
              onRemove={() => remove(index)}
            />
          ))}


          <Button
            className="gap-2"
            disabled={fields.length >= MAX_LINES}
            type="button"
            variant="outline"
            onClick={() => append(defaultLine())}
          >
            <Plus aria-hidden className="size-4" />
            Agregar línea
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entrega</CardTitle>
          <CardDescription>Fecha de entrega obligatoria</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Fecha de entrega</Label>
            <Input
              id="deliveryDate"
              min={minDeliveryDate}
              required
              type="date"
              {...register("deliveryDate")}
            />
            {errors.deliveryDate ? (
              <p className="text-destructive text-sm">{errors.deliveryDate.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliveryTimeWindow">Ventana horaria</Label>
            <Input
              id="deliveryTimeWindow"
              placeholder="ej. 10:00 - 12:00"
              {...register("deliveryTimeWindow")}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="deliveryNotes">Notas de entrega</Label>
            <Textarea id="deliveryNotes" maxLength={500} rows={3} {...register("deliveryNotes")} />
            <FieldCharCount control={control} max={500} name="deliveryNotes" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas internas</CardTitle>
          <CardDescription>Opcional — solo visible para tu equipo</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea id="notes" maxLength={500} rows={3} {...register("notes")} />
          <div className="mt-1.5">
            <FieldCharCount control={control} max={500} name="notes" />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
