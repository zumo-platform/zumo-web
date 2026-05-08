"use client";

import { useId, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import type { CountryCode } from "libphonenumber-js";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PhoneNumberField } from "@/components/auth/phone-number-field";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { nationalToE164 } from "@/lib/phone-e164";

const formSchema = z.object({
  name: z.string().min(1, "El nombre comercial es obligatorio."),
  legalName: z.string().optional(),
  governmentId: z.string().optional(),
  email: z.string().optional(),
  clientCode: z.string().optional(),
  primaryContactName: z.string().min(1, "Indica el nombre del contacto principal."),
  primaryContactEmail: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  wazeAddress: z.string().optional(),
  advanceDays: z.string().optional(),
  cutoffTime: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.string().optional(),
  minimumOrderTotal: z.string().optional(),
  forceToPay: z.boolean(),
  deliveryNotes: z.string().optional(),
  notes: z.string().optional(),
  shareInDirectory: z.boolean(),
});

export type AddCustomerFormValues = z.infer<typeof formSchema>;

function optionalTrim(value: string | undefined): string | undefined {
  const t = (value ?? "").trim();
  return t.length ? t : undefined;
}

export function AddCustomerForm({
  onCancel,
  onSaved,
}: Readonly<{
  onCancel: () => void;
  onSaved: () => void;
}>) {
  const uid = useId();
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>("CR");
  const [phoneNational, setPhoneNational] = useState("");
  const [phoneSubmitError, setPhoneSubmitError] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddCustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      legalName: "",
      governmentId: "",
      email: "",
      clientCode: "",
      primaryContactName: "",
      primaryContactEmail: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      region: "",
      postalCode: "",
      wazeAddress: "",
      advanceDays: "",
      cutoffTime: "",
      paymentTerms: "",
      creditLimit: "",
      minimumOrderTotal: "",
      forceToPay: false,
      deliveryNotes: "",
      notes: "",
      shareInDirectory: true,
    },
  });

  async function onSubmit(values: AddCustomerFormValues) {
    setPhoneSubmitError(false);
    const phone = nationalToE164(phoneNational, phoneCountry);
    if (!phone) {
      setPhoneSubmitError(true);
      toast.error("Introduce un teléfono válido para el país seleccionado.");
      return;
    }

    let advanceDaysParsed: number | null | undefined;
    const adRaw = values.advanceDays?.trim();
    if (adRaw && adRaw.length > 0) {
      const n = Number.parseInt(adRaw, 10);
      if (!Number.isFinite(n)) {
        toast.error('El campo "Días de anticipación" debe ser un número entero.');
        return;
      }
      advanceDaysParsed = n;
    } else {
      advanceDaysParsed = null;
    }

    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      primaryContactName: values.primaryContactName.trim(),
      primaryContactPhone: phone,
      forceToPay: values.forceToPay,
      shareInDirectory: values.shareInDirectory,
      advanceDays: advanceDaysParsed,
    };

    const optionalStringFields = [
      "legalName",
      "governmentId",
      "email",
      "clientCode",
      "primaryContactEmail",
      "addressLine1",
      "addressLine2",
      "city",
      "region",
      "postalCode",
      "wazeAddress",
      "cutoffTime",
      "paymentTerms",
      "creditLimit",
      "minimumOrderTotal",
      "deliveryNotes",
      "notes",
    ] as const satisfies readonly (keyof AddCustomerFormValues)[];

    for (const key of optionalStringFields) {
      const v = optionalTrim(values[key] as string | undefined);
      if (v !== undefined) payload[key] = v;
    }

    const res = await fetch("/api/backend/dashboard/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof raw.message === "string"
          ? raw.message
          : "No se pudo crear el cliente. Inténtalo de nuevo.";
      toast.error(msg);
      return;
    }

    toast.success("Cliente creado correctamente.");
    onSaved();
  }

  const fieldGap = "space-y-2";

  return (
    <form
      className="flex min-h-0 flex-1 flex-col bg-muted/30"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <div>
            <h2 className="font-semibold text-foreground text-lg tracking-tight">
              Nuevo cliente
            </h2>
            <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
              Los datos siguen tu esquema de clientes en Zumo. No se guarda nada hasta que pulses{" "}
              <span className="font-medium text-foreground">Guardar</span>.
            </p>
          </div>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-lg">Información general</CardTitle>
              <CardDescription>Identidad fiscal y datos comerciales del cliente.</CardDescription>
              <Separator className="my-4" />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className={`${fieldGap} sm:col-span-2`}>
                <Label htmlFor={`${uid}-name`}>Nombre comercial</Label>
                <Input
                  aria-invalid={Boolean(errors.name)}
                  id={`${uid}-name`}
                  autoComplete="organization"
                  {...register("name")}
                />
                {errors.name ? (
                  <p className="text-destructive text-xs">{errors.name.message}</p>
                ) : null}
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-legalName`}>Razón social</Label>
                <Input autoComplete="off" id={`${uid}-legalName`} {...register("legalName")} />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-governmentId`}>Documento fiscal (NIT / ID)</Label>
                <Input autoComplete="off" id={`${uid}-governmentId`} {...register("governmentId")} />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-clientCode`}>Código cliente</Label>
                <Input autoComplete="off" id={`${uid}-clientCode`} {...register("clientCode")} />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-email`}>Correo electrónico</Label>
                <Input
                  autoComplete="email"
                  id={`${uid}-email`}
                  inputMode="email"
                  type="email"
                  {...register("email")}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-lg">Contacto principal</CardTitle>
              <CardDescription>Persona y canal habitual de pedidos (WhatsApp).</CardDescription>
              <Separator className="my-4" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-primaryContactName`}>Nombre completo del contacto</Label>
                <Input
                  aria-invalid={Boolean(errors.primaryContactName)}
                  autoComplete="name"
                  id={`${uid}-primaryContactName`}
                  {...register("primaryContactName")}
                />
                {errors.primaryContactName ? (
                  <p className="text-destructive text-xs">{errors.primaryContactName.message}</p>
                ) : null}
              </div>
              <PhoneNumberField
                country={phoneCountry}
                hint="No incluyas el código de país manualmente si eliges país arriba."
                id={`${uid}-primaryPhone`}
                label="Teléfono WhatsApp"
                locale="es"
                national={phoneNational}
                invalid={phoneSubmitError}
                placeholder="89479486"
                onCountryChange={setPhoneCountry}
                onNationalChange={(v) => {
                  setPhoneNational(v);
                  setPhoneSubmitError(false);
                }}
              />
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-primaryContactEmail`}>Correo del contacto</Label>
                <Input
                  autoComplete="email"
                  id={`${uid}-primaryContactEmail`}
                  inputMode="email"
                  type="email"
                  {...register("primaryContactEmail")}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-lg">Ubicación y entrega</CardTitle>
              <CardDescription>Dirección física y referencias útiles para reparto.</CardDescription>
              <Separator className="my-4" />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className={`${fieldGap} sm:col-span-2`}>
                <Label htmlFor={`${uid}-addressLine1`}>Dirección línea 1</Label>
                <Input autoComplete="street-address" id={`${uid}-addressLine1`} {...register("addressLine1")} />
              </div>
              <div className={`${fieldGap} sm:col-span-2`}>
                <Label htmlFor={`${uid}-addressLine2`}>Dirección línea 2</Label>
                <Input autoComplete="off" id={`${uid}-addressLine2`} {...register("addressLine2")} />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-city`}>Ciudad</Label>
                <Input autoComplete="address-level2" id={`${uid}-city`} {...register("city")} />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-region`}>Provincia / región</Label>
                <Input autoComplete="address-level1" id={`${uid}-region`} {...register("region")} />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-postalCode`}>Código postal</Label>
                <Input autoComplete="postal-code" id={`${uid}-postalCode`} {...register("postalCode")} />
              </div>
              <div className={`${fieldGap} sm:col-span-2`}>
                <Label htmlFor={`${uid}-wazeAddress`}>Enlace Waze / referencia</Label>
                <Input autoComplete="off" id={`${uid}-wazeAddress`} {...register("wazeAddress")} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-lg">Pedidos y pago</CardTitle>
              <CardDescription>Políticas comerciales y montos relacionados.</CardDescription>
              <Separator className="my-4" />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-advanceDays`}>Días de anticipación</Label>
                <Input autoComplete="off" id={`${uid}-advanceDays`} inputMode="numeric" {...register("advanceDays")} />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-cutoffTime`}>Hora límite de pedido</Label>
                <Input autoComplete="off" id={`${uid}-cutoffTime`} type="time" {...register("cutoffTime")} />
              </div>
              <div className={`${fieldGap} sm:col-span-2`}>
                <Label htmlFor={`${uid}-paymentTerms`}>Términos de pago</Label>
                <Input autoComplete="off" id={`${uid}-paymentTerms`} {...register("paymentTerms")} />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-creditLimit`}>Límite de crédito</Label>
                <Input autoComplete="off" id={`${uid}-creditLimit`} inputMode="decimal" {...register("creditLimit")} />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-minimumOrderTotal`}>Compra mínima</Label>
                <Input
                  autoComplete="off"
                  id={`${uid}-minimumOrderTotal`}
                  inputMode="decimal"
                  {...register("minimumOrderTotal")}
                />
              </div>
              <Controller
                control={control}
                name="forceToPay"
                render={({ field }) => (
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3 sm:col-span-2">
                    <div className="space-y-0.5">
                      <Label htmlFor={`${uid}-forceToPay`}>Exigir cobro antes de despachar</Label>
                      <p className="text-muted-foreground text-xs leading-snug">
                        Equivale al indicador «forzar cobro» en tu base de datos.
                      </p>
                    </div>
                    <Switch checked={field.value} id={`${uid}-forceToPay`} onCheckedChange={field.onChange} />
                  </div>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-lg">Notas y visibilidad</CardTitle>
              <Separator className="my-4" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-deliveryNotes`}>Notas de entrega</Label>
                <Textarea
                  className="min-h-[88px]"
                  id={`${uid}-deliveryNotes`}
                  {...register("deliveryNotes")}
                />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-notes`}>Notas internas</Label>
                <Textarea className="min-h-[88px]" id={`${uid}-notes`} {...register("notes")} />
              </div>
              <Controller
                control={control}
                name="shareInDirectory"
                render={({ field }) => (
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3">
                    <div className="space-y-0.5">
                      <Label htmlFor={`${uid}-shareInDirectory`}>Compartir en directorio interno Zumo</Label>
                      <p className="text-muted-foreground text-xs leading-snug">
                        Permitir referencia del cliente dentro de herramientas Zumo.
                      </p>
                    </div>
                    <Switch
                      checked={field.value}
                      id={`${uid}-shareInDirectory`}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="shrink-0 border-t bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-end gap-2">
          <Button disabled={isSubmitting} type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
