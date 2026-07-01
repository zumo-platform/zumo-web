"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { patchDashboardSettingsViaProxy } from "@/lib/dashboard-settings";
import type { SupplierSettings } from "@/lib/dashboard-types";

const READONLY_TOOLTIP = "Solo administradores pueden cambiar esta configuraci\u00f3n";

const COPY = {
  engineTitle: "Motor de precios",
  engineLead:
    "Calcul\u00e1 tus precios autom\u00e1ticamente a partir del costo, con margen o sobreprecio por tipo de cliente.",
  engineDetail:
    "Activado: defin\u00eds niveles de precio (margen, base, rendimiento, banda) y Zumo calcula el precio de cada producto. Desactivado (recomendado al inicio): us\u00e1s un precio fijo por producto.",
  engineLabel: "Motor de precios",
} as const;

export function SettingsPricingForm({
  initialPricing,
  canEdit,
}: Readonly<{
  initialPricing: SupplierSettings["pricing"];
  canEdit: boolean;
}>) {
  const router = useRouter();
  const [engineEnabled, setEngineEnabled] = useState(initialPricing.engineEnabled);
  const [savingEngine, setSavingEngine] = useState(false);

  async function saveEngine(next: boolean) {
    if (!canEdit || savingEngine) return;
    const prev = engineEnabled;
    setEngineEnabled(next);
    setSavingEngine(true);
    try {
      const result = await patchDashboardSettingsViaProxy({ pricingEngineEnabled: next });
      const pricing = result.pricing;
      if (!pricing) throw new Error("Respuesta de configuraci\u00f3n inv\u00e1lida.");
      setEngineEnabled(pricing.engineEnabled);
      toast.success(
        pricing.engineEnabled
          ? "Motor de precios activado"
          : "Motor de precios desactivado \u2014 precio fijo por producto",
      );
      router.refresh();
    } catch (err) {
      setEngineEnabled(prev);
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSavingEngine(false);
    }
  }

  const controlsDisabled = !canEdit || savingEngine;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h2 className="font-semibold text-base">{COPY.engineTitle}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{COPY.engineLead}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{COPY.engineDetail}</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex shrink-0 items-center gap-2 pt-1">
                  {savingEngine ? (
                    <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />
                  ) : null}
                  <Switch
                    checked={engineEnabled}
                    disabled={controlsDisabled}
                    id="pricing-engine-enabled"
                    onCheckedChange={(checked) => void saveEngine(checked)}
                  />
                  <Label className="sr-only" htmlFor="pricing-engine-enabled">
                    {COPY.engineLabel}
                  </Label>
                </div>
              </TooltipTrigger>
              {!canEdit ? <TooltipContent side="left">{READONLY_TOOLTIP}</TooltipContent> : null}
            </Tooltip>
          </div>
        </section>

        {engineEnabled ? (
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="font-semibold text-base">Niveles de precio</h2>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              Definí reglas de margen o sobreprecio por tipo de cliente y recalculá precios cuando
              cambien tus costos.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/settings/price-levels">Administrar niveles</Link>
            </Button>
          </section>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
