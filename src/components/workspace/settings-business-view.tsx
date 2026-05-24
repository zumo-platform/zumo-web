"use client";

import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SupplierSettings } from "@/lib/dashboard-types";

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
  const connected = Boolean(business.whatsappConnectedAt || business.whatsappPhoneE164);

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
