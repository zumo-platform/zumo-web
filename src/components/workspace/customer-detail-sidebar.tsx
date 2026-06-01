"use client";

import type { ReactNode } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CustomerDraftField,
  CustomerDraftReadonly,
} from "@/components/workspace/customer-draft-field";
import type { CustomerDraftState } from "@/lib/dashboard-customers";

function formatCreatedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function formatLocation(city: string, region: string): string {
  const parts = [city.trim(), region.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

export function CustomerDetailSidebar({
  customerId,
  createdAt,
  draft,
  labelsSlot,
  onDraftChange,
}: Readonly<{
  customerId: number;
  createdAt: string | null;
  draft: CustomerDraftState;
  labelsSlot?: ReactNode;
  onDraftChange: (patch: Partial<CustomerDraftState>) => void;
}>) {
  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-r bg-muted/20 lg:w-72 xl:w-80">
      <div className="shrink-0 space-y-5 p-5 pb-3">
        <h2 className="font-semibold text-sm">Detalle del cliente</h2>
        <div className="mx-auto flex size-20 items-center justify-center rounded-lg border bg-background text-muted-foreground text-xs">
          Logo
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 px-5 pb-5">
        <CustomerDraftReadonly label="Creado" value={formatCreatedAt(createdAt)} />
        <CustomerDraftField
          label="Nombre comercial"
          placeholder="Nombre comercial"
          value={draft.name}
          onChange={(name) => onDraftChange({ name })}
        />
        <CustomerDraftReadonly label="ID cliente" value={String(customerId)} />
        <CustomerDraftReadonly
          label="Ubicación"
          value={formatLocation(draft.city, draft.region)}
        />
        <CustomerDraftField
          label="Razón social"
          placeholder="Razón social"
          value={draft.legalName}
          onChange={(legalName) => onDraftChange({ legalName })}
        />
        <CustomerDraftField
          label="Identificación"
          placeholder="Identificación"
          value={draft.governmentId}
          onChange={(governmentId) => onDraftChange({ governmentId })}
        />
        <CustomerDraftField
          label="Nombre POC"
          placeholder="Nombre del contacto"
          value={draft.primaryContactName}
          onChange={(primaryContactName) => onDraftChange({ primaryContactName })}
        />
        <CustomerDraftField
          label="Teléfono POC"
          placeholder="+506 8888 8888"
          value={draft.primaryContactPhone}
          onChange={(primaryContactPhone) => onDraftChange({ primaryContactPhone })}
        />
        <CustomerDraftField
          label="Correo POC"
          placeholder="correo@empresa.com"
          value={draft.primaryContactEmail}
          onChange={(primaryContactEmail) => onDraftChange({ primaryContactEmail })}
        />
        <CustomerDraftField
          label="Dirección de entrega"
          multiline
          placeholder="Dirección línea 1"
          value={draft.addressLine1}
          onChange={(addressLine1) => onDraftChange({ addressLine1 })}
        />
        <CustomerDraftField
          label="Cantón / ciudad"
          placeholder="Cantón"
          value={draft.city}
          onChange={(city) => onDraftChange({ city })}
        />
        <CustomerDraftField
          label="Provincia"
          placeholder="Provincia"
          value={draft.region}
          onChange={(region) => onDraftChange({ region })}
        />
        <CustomerDraftField
          label="Código cliente"
          placeholder="Código"
          value={draft.clientCode}
          onChange={(clientCode) => onDraftChange({ clientCode })}
        />
        {labelsSlot}
        </div>
      </ScrollArea>
    </aside>
  );
}
