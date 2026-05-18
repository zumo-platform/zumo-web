"use client";

import { useId, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { Loader2, Info } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PhoneNumberField } from "@/components/auth/phone-number-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

const optionalCompanyEmailSchema = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .min(1)
    .email("Introduce un correo válido para la empresa o déjalo vacío."),
]);

const formSchema = z.object({
  name: z.string().trim().min(1, "El nombre comercial es obligatorio."),
  legalName: z.string().optional(),
  governmentId: z.string().optional(),
  /** Correo de la empresa; puede repetir el del contacto. */
  email: optionalCompanyEmailSchema,
  clientCode: z.string().trim().min(1, "El código cliente es obligatorio."),
  primaryContactName: z
    .string()
    .trim()
    .min(1, "El nombre del contacto es obligatorio."),
  primaryContactEmail: z
    .string()
    .trim()
    .min(1, "El correo del contacto es obligatorio.")
    .email("Introduce un correo válido."),
  addressLine1: z.string().trim().min(1, "La dirección línea 1 es obligatoria."),
  addressLine2: z.string().optional(),
  /** Cantón — se guarda en el mismo campo «ciudad» en el servidor. */
  city: z.string().trim().min(1, "El cantón es obligatorio."),
  region: z.string().trim().min(1, "La provincia es obligatoria."),
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

function RequiredIndicator() {
  return (
    <abbr className="ml-0.5 cursor-help text-destructive no-underline" title="Campo obligatorio">
      *
    </abbr>
  );
}

function optionalTrim(value: string | undefined): string | undefined {
  const t = (value ?? "").trim();
  return t.length ? t : undefined;
}

function prefilledPrimaryPhone(
  initialPrimaryPhoneE164: string | undefined,
): { country: CountryCode; national: string } {
  const raw = initialPrimaryPhoneE164?.trim();
  if (!raw) return { country: "CR", national: "" };
  const parsed = parsePhoneNumberFromString(raw);
  if (!parsed?.isValid()) return { country: "CR", national: "" };
  return {
    country: (parsed.country ?? "CR") as CountryCode,
    national: parsed.nationalNumber,
  };
}

export function AddCustomerForm({
  onCancel,
  onSaved,
  initialPrimaryPhoneE164,
  showInboxCreationHint,
}: Readonly<{
  onCancel: () => void;
  onSaved: () => void;
  /** Ej. número en E.164 pre-cargado desde el inbox (`?phone=…`). */
  initialPrimaryPhoneE164?: string;
  showInboxCreationHint?: boolean;
}>) {
  const uid = useId();
  const pf = prefilledPrimaryPhone(initialPrimaryPhoneE164);
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(pf.country);
  const [phoneNational, setPhoneNational] = useState(pf.national);
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
      toast.error("Introduce un teléfono válido del contacto para el país seleccionado.");
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
      primaryContactEmail: values.primaryContactEmail.trim(),
      clientCode: values.clientCode.trim(),
      addressLine1: values.addressLine1.trim(),
      region: values.region.trim(),
      city: values.city.trim(),
      forceToPay: values.forceToPay,
      shareInDirectory: values.shareInDirectory,
      advanceDays: advanceDaysParsed,
    };

    const optionalStringFields = [
      "legalName",
      "governmentId",
      "email",
      "addressLine2",
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
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      const r = raw as Record<string, unknown>;
      let proxyHint = "";
      if (typeof process.env !== "undefined" && process.env.NODE_ENV === "development") {
        const upstreamHdr = res.headers.get("x-zumo-proxy-upstream");
        if (upstreamHdr) {
          try {
            const u = new URL(upstreamHdr);
            proxyHint = `Proxy → ${u.host}${u.pathname}`;
          } catch {
            proxyHint = `Proxy → ${upstreamHdr}`;
          }
        }
      }
      let msg =
        typeof r.message === "string"
          ? r.message
          : typeof r.error === "string"
            ? r.error
            : "";
      if (
        msg === "" &&
        typeof r.raw === "string" &&
        /not found/i.test(r.raw)
      ) {
        msg =
          'El servidor devolvió "Not Found"; suele indicar una API_URL incorrecta o un backend sin la ruta POST /dashboard/customers.';
      }
      if (msg === "" && res.status === 404) {
        msg =
          "No encontramos esa ruta en el API (404). Verifica API_URL o NEXT_PUBLIC_API_URL en .env.local y que el último deploy del backend incluya POST /dashboard/customers.";
      }
      if (!msg.trim()) {
        msg = "No se pudo crear el cliente. Inténtalo de nuevo.";
      }
      toast.error(proxyHint.trim() ? `${msg} (${proxyHint})` : msg);
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
          {showInboxCreationHint ? (
            <Alert variant="default">
              <Info aria-hidden className="text-muted-foreground" />
              <AlertTitle>Cliente desde WhatsApp</AlertTitle>
              <AlertDescription>
                Creando cliente desde un mensaje de WhatsApp. El teléfono está pre-cargado.
              </AlertDescription>
            </Alert>
          ) : null}
          <p className="text-muted-foreground text-sm leading-relaxed">
            Los datos siguen tu esquema de clientes en Zumo. No se guarda nada hasta que pulses{" "}
            <span className="font-medium text-foreground">Guardar</span>.
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            <abbr className="text-destructive no-underline" title="Campo obligatorio">
              *
            </abbr>{" "}
            Obligatorio
          </p>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-lg">Información general</CardTitle>
              <CardDescription>Identidad fiscal y datos comerciales del cliente.</CardDescription>
              <Separator className="my-4" />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className={`${fieldGap} sm:col-span-2`}>
                <Label htmlFor={`${uid}-name`}>
                  Nombre comercial
                  <RequiredIndicator />
                </Label>
                <Input
                  aria-invalid={Boolean(errors.name)}
                  aria-required
                  id={`${uid}-name`}
                  autoComplete="organization"
                  placeholder="Restaurante Oro"
                  {...register("name")}
                />
                {errors.name ? (
                  <p className="text-destructive text-xs">{errors.name.message}</p>
                ) : null}
              </div>
              <div className={`${fieldGap} sm:col-span-2`}>
                <Label htmlFor={`${uid}-clientCode`}>
                  Código cliente
                  <RequiredIndicator />
                </Label>
                <Input
                  aria-invalid={Boolean(errors.clientCode)}
                  aria-required
                  autoComplete="off"
                  id={`${uid}-clientCode`}
                  placeholder="Ej. CLI-1024"
                  {...register("clientCode")}
                />
                {errors.clientCode ? (
                  <p className="text-destructive text-xs">{errors.clientCode.message}</p>
                ) : null}
              </div>
              <div className={`${fieldGap} sm:col-span-2`}>
                <Label htmlFor={`${uid}-email`}>Correo electrónico (empresa)</Label>
                <Input
                  aria-invalid={Boolean(errors.email)}
                  autoComplete="email"
                  id={`${uid}-email`}
                  inputMode="email"
                  placeholder="Ej. facturacion@empresa.com"
                  type="email"
                  {...register("email")}
                />
                <p className="mt-1 text-muted-foreground text-xs leading-snug">
                  Opcional. Puede ser el mismo que el correo del contacto.
                </p>
                {errors.email ? (
                  <p className="text-destructive text-xs">{errors.email.message}</p>
                ) : null}
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-legalName`}>Razón social</Label>
                <Input
                  autoComplete="organization"
                  id={`${uid}-legalName`}
                  placeholder="Restaurante Oro Sociedad Anónima"
                  {...register("legalName")}
                />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-governmentId`}>Documento fiscal (NIT / ID)</Label>
                <Input
                  autoComplete="off"
                  id={`${uid}-governmentId`}
                  placeholder="Ej. 3-101-654321"
                  {...register("governmentId")}
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
                <Label htmlFor={`${uid}-primaryContactName`}>
                  Nombre del contacto
                  <RequiredIndicator />
                </Label>
                <Input
                  aria-invalid={Boolean(errors.primaryContactName)}
                  aria-required
                  autoComplete="name"
                  id={`${uid}-primaryContactName`}
                  placeholder="Ej. María José Ramírez"
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
                label="Teléfono del contacto"
                locale="es"
                national={phoneNational}
                required
                invalid={phoneSubmitError}
                placeholder="88886666"
                onCountryChange={setPhoneCountry}
                onNationalChange={(v) => {
                  setPhoneNational(v);
                  setPhoneSubmitError(false);
                }}
              />
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-primaryContactEmail`}>
                  Correo del contacto
                  <RequiredIndicator />
                </Label>
                <Input
                  aria-invalid={Boolean(errors.primaryContactEmail)}
                  aria-required
                  autoComplete="email"
                  id={`${uid}-primaryContactEmail`}
                  inputMode="email"
                  placeholder="Ej. nombre@ejemplo.com"
                  type="email"
                  {...register("primaryContactEmail")}
                />
                {errors.primaryContactEmail ? (
                  <p className="text-destructive text-xs">{errors.primaryContactEmail.message}</p>
                ) : null}
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
                <Label htmlFor={`${uid}-addressLine1`}>
                  Dirección línea 1
                  <RequiredIndicator />
                </Label>
                <Input
                  aria-invalid={Boolean(errors.addressLine1)}
                  aria-required
                  autoComplete="street-address"
                  id={`${uid}-addressLine1`}
                  placeholder="Ej. Del parque municipal, 125 m norte, local 3"
                  {...register("addressLine1")}
                />
                {errors.addressLine1 ? (
                  <p className="text-destructive text-xs">{errors.addressLine1.message}</p>
                ) : null}
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-region`}>
                  Provincia
                  <RequiredIndicator />
                </Label>
                <Input
                  aria-invalid={Boolean(errors.region)}
                  aria-required
                  autoComplete="address-level1"
                  id={`${uid}-region`}
                  placeholder="Ej. Cartago"
                  {...register("region")}
                />
                {errors.region ? (
                  <p className="text-destructive text-xs">{errors.region.message}</p>
                ) : null}
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-city`}>
                  Cantón
                  <RequiredIndicator />
                </Label>
                <Input
                  aria-invalid={Boolean(errors.city)}
                  aria-required
                  autoComplete="address-level2"
                  id={`${uid}-city`}
                  placeholder="Ej. La Unión"
                  {...register("city")}
                />
                {errors.city ? (
                  <p className="text-destructive text-xs">{errors.city.message}</p>
                ) : null}
              </div>
              <div className={`${fieldGap} sm:col-span-2`}>
                <Label htmlFor={`${uid}-addressLine2`}>Dirección línea 2</Label>
                <Input
                  autoComplete="off"
                  id={`${uid}-addressLine2`}
                  placeholder="Edificio, piso u otra referencia"
                  {...register("addressLine2")}
                />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-postalCode`}>Código postal</Label>
                <Input
                  autoComplete="postal-code"
                  id={`${uid}-postalCode`}
                  placeholder="Ej. 30301"
                  {...register("postalCode")}
                />
              </div>
              <div className={`${fieldGap} sm:col-span-2`}>
                <Label htmlFor={`${uid}-wazeAddress`}>Enlace Waze / referencia</Label>
                <Input
                  autoComplete="off"
                  id={`${uid}-wazeAddress`}
                  placeholder="Enlace de Waze o indicaciones breves"
                  {...register("wazeAddress")}
                />
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
                <Input autoComplete="off" id={`${uid}-advanceDays`} inputMode="numeric" placeholder="Ej. 2" {...register("advanceDays")} />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-cutoffTime`}>Hora límite de pedido</Label>
                <Input autoComplete="off" id={`${uid}-cutoffTime`} placeholder="15:30" type="time" {...register("cutoffTime")} />
              </div>
              <div className={`${fieldGap} sm:col-span-2`}>
                <Label htmlFor={`${uid}-paymentTerms`}>Términos de pago</Label>
                <Input autoComplete="off" id={`${uid}-paymentTerms`} placeholder="Ej. Neto 15 días" {...register("paymentTerms")} />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-creditLimit`}>Límite de crédito</Label>
                <Input autoComplete="off" id={`${uid}-creditLimit`} inputMode="decimal" placeholder="Ej. 500000" {...register("creditLimit")} />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-minimumOrderTotal`}>Compra mínima</Label>
                <Input
                  autoComplete="off"
                  id={`${uid}-minimumOrderTotal`}
                  inputMode="decimal"
                  placeholder="Ej. 25000"
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
                  placeholder="Ej. entrada lateral, persona que recibe, ventana horaria..."
                  {...register("deliveryNotes")}
                />
              </div>
              <div className={fieldGap}>
                <Label htmlFor={`${uid}-notes`}>Notas internas</Label>
                <Textarea
                  className="min-h-[88px]"
                  id={`${uid}-notes`}
                  placeholder="Solo equipo interno: preferencias o contexto recurrente del cliente."
                  {...register("notes")}
                />
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
