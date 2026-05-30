"use client";

import { useState } from "react";

import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { patchDashboardSettingsViaProxy } from "@/lib/dashboard-settings";
import type { SupplierSettings } from "@/lib/dashboard-types";
import type { MarketingLocale } from "@/lib/marketing-locale";
import {
  WORKSPACE_LOCALE_OPTIONS,
  parseWorkspaceLocale,
  setWorkspaceLocaleCookie,
} from "@/lib/workspace-locale";

const READONLY_TOOLTIP = "Solo administradores pueden cambiar esta configuración";

function formatConnectedAt(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SettingsBusinessView({
  business,
  canEdit,
}: Readonly<{
  business: SupplierSettings["business"];
  canEdit: boolean;
}>) {
  const router = useRouter();
  const connected = Boolean(business.whatsappConnectedAt || business.whatsappPhoneE164);
  const [defaultLocale, setDefaultLocale] = useState<MarketingLocale>(
    parseWorkspaceLocale(business.defaultLocale),
  );
  const [savingLocale, setSavingLocale] = useState(false);

  async function saveLocale(next: MarketingLocale) {
    if (!canEdit || savingLocale || next === defaultLocale) return;
    const prev = defaultLocale;
    setDefaultLocale(next);
    setSavingLocale(true);
    try {
      const result = await patchDashboardSettingsViaProxy({ defaultLocale: next });
      const saved = result.business?.defaultLocale ?? next;
      setDefaultLocale(saved);
      setWorkspaceLocaleCookie(saved);
      toast.success(saved === "en" ? "Default language updated" : "Idioma predeterminado actualizado");
      router.refresh();
    } catch (err) {
      setDefaultLocale(prev);
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSavingLocale(false);
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="font-semibold text-2xl tracking-tight">{business.businessName}</h2>
            <p className="text-muted-foreground text-sm">{business.businessEmail}</p>
          </div>
          {canEdit ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button className="gap-1.5" disabled size="sm" type="button" variant="outline">
                    <Pencil aria-hidden className="size-3.5" />
                    Editar
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Próximamente</TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <h3 className="mb-4 font-medium text-sm">Idioma</h3>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Idioma predeterminado para tu equipo, el panel y las respuestas del asistente
              de pedidos por WhatsApp (clasificación, extracción y mensajes al cliente).
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex max-w-xs items-center gap-2">
                  {savingLocale ? (
                    <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : null}
                  <Select
                    disabled={!canEdit || savingLocale}
                    value={defaultLocale}
                    onValueChange={(value) => void saveLocale(parseWorkspaceLocale(value))}
                  >
                    <SelectTrigger id="default-locale">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKSPACE_LOCALE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="sr-only" htmlFor="default-locale">
                    Idioma predeterminado
                  </Label>
                </div>
              </TooltipTrigger>
              {!canEdit ? <TooltipContent side="bottom">{READONLY_TOOLTIP}</TooltipContent> : null}
            </Tooltip>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <h3 className="mb-4 font-medium text-sm">WhatsApp</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-muted-foreground">Estado</dt>
              <dd>
                <Badge variant={connected ? "secondary" : "outline"}>
                  {connected ? "Conectado" : "Desconectado"}
                </Badge>
              </dd>
            </div>
            {business.whatsappPhoneE164 ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-muted-foreground">Teléfono</dt>
                <dd className="font-mono">{business.whatsappPhoneE164}</dd>
              </div>
            ) : null}
            {business.whatsappConnectedAt ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-muted-foreground">Conectado desde</dt>
                <dd>{formatConnectedAt(business.whatsappConnectedAt)}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>
    </TooltipProvider>
  );
}
