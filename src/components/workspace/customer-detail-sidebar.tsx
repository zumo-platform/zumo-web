"use client";

import type { ReactNode } from "react";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomerDiscountListsSection } from "@/components/workspace/customer-discount-lists-section";
import { CustomerEmailOrderingToggle } from "@/components/workspace/customer-email-ordering-toggle";
import { CustomerPriceLevelField } from "@/components/workspace/customer-price-level-field";
import {
  CustomerDraftField,
  CustomerDraftReadonly,
} from "@/components/workspace/customer-draft-field";
import type { CustomerDraftState, CustomerDiscountListSummary } from "@/lib/dashboard-customers";
import { normalizeWazeUrl, parseWazeCoordinates } from "@/lib/waze-url";

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

function CustomerWazeField({
  value,
  storedLat,
  storedLng,
  onChange,
}: Readonly<{
  value: string;
  storedLat: number | null;
  storedLng: number | null;
  onChange: (value: string) => void;
}>) {
  const wazeUrl = normalizeWazeUrl(value);
  const parsed = parseWazeCoordinates(value);
  const lat = parsed?.lat ?? storedLat;
  const lng = parsed?.lng ?? storedLng;

  async function copyUrl() {
    if (!wazeUrl) return;
    try {
      await navigator.clipboard.writeText(wazeUrl);
      toast.success("Enlace de Waze copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  return (
    <div className="space-y-1.5">
      <CustomerDraftField
        label="Enlace Waze"
        placeholder="https://waze.com/ul?ll=…"
        value={value}
        onChange={onChange}
      />
      {value.trim() && wazeUrl ? (
        <div className="space-y-1 rounded-md border bg-muted/20 px-2.5 py-2">
          <div className="flex items-start gap-2">
            <a
              className="min-w-0 flex-1 truncate text-primary text-xs underline underline-offset-2"
              href={wazeUrl}
              rel="noreferrer"
              target="_blank"
            >
              {value.trim()}
            </a>
            <Button
              aria-label="Copiar enlace de Waze"
              className="size-7 shrink-0"
              size="icon"
              title="Copiar enlace de Waze"
              type="button"
              variant="outline"
              onClick={() => void copyUrl()}
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
          {lat != null && lng != null ? (
            <p className="text-muted-foreground text-xs tabular-nums">
              Coordenadas: {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Guardá un enlace Waze con <code className="text-[11px]">ll=lat,lng</code> para
              ubicar al cliente en el mapa.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function CustomerDetailSidebar({
  customerId,
  createdAt,
  draft,
  discountLists,
  labelsSlot,
  emailOrderingEnabled,
  storedLat,
  storedLng,
  onEmailOrderingChange,
  onDraftChange,
  onOrderingEmailPersist,
}: Readonly<{
  customerId: number;
  createdAt: string | null;
  draft: CustomerDraftState;
  discountLists: readonly CustomerDiscountListSummary[];
  labelsSlot?: ReactNode;
  emailOrderingEnabled: boolean;
  storedLat: number | null;
  storedLng: number | null;
  onEmailOrderingChange: (enabled: boolean) => void;
  onDraftChange: (patch: Partial<CustomerDraftState>) => void;
  /** Persist official order email immediately (does not wait for page Guardar). */
  onOrderingEmailPersist?: (orderingEmail: string) => void | Promise<void>;
}>) {
  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-r bg-muted/20 lg:w-72 xl:w-80">
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 p-5">
          <h2 className="font-semibold text-sm">Detalle del cliente</h2>
          <div className="mx-auto flex size-20 items-center justify-center rounded-lg border bg-background text-muted-foreground text-xs">
            Logo
          </div>

          <div className="space-y-4">
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
            <div className="space-y-1.5">
              <CustomerDraftField
                label="Correo oficial de pedidos"
                placeholder="pedidos@sucliente.com"
                value={draft.orderingEmail}
                onChange={(orderingEmail) => {
                  onDraftChange({ orderingEmail });
                  void onOrderingEmailPersist?.(orderingEmail);
                }}
              />
              <p className="text-muted-foreground text-xs leading-relaxed">
                Dirección desde la que este cliente envía sus pedidos por correo (ej.
                pedidos@sucliente.com). Los correos desde esta dirección se reconocen
                automáticamente como pedidos oficiales.
              </p>
            </div>
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
            <CustomerWazeField
              storedLat={storedLat}
              storedLng={storedLng}
              value={draft.wazeAddress}
              onChange={(wazeAddress) => onDraftChange({ wazeAddress })}
            />
            <CustomerDraftField
              label="Código cliente"
              placeholder="Código"
              value={draft.clientCode}
              onChange={(clientCode) => onDraftChange({ clientCode })}
            />
            <CustomerPriceLevelField
              value={draft.priceLevelId}
              onChange={(priceLevelId) => onDraftChange({ priceLevelId })}
            />
            <CustomerEmailOrderingToggle
              customerId={customerId}
              enabled={emailOrderingEnabled}
              onChange={onEmailOrderingChange}
            />
            <CustomerDiscountListsSection lists={discountLists} />
            {labelsSlot}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
