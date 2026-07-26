"use client";

import dynamic from "next/dynamic";
import { useMemo, type ReactNode } from "react";

import { Copy, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCustomerFullDetailViaProxy } from "@/lib/dashboard-customers";
import {
  fetchCustomerDeliveryViaProxy,
  fetchDeliveryZonesViaProxy,
  formatWeekdayListEs,
  WEEKDAYS_SOURCE_LABEL,
} from "@/lib/delivery";
import { normalizeWazeUrl, parseWazeCoordinates } from "@/lib/waze-url";

const MarketAdminMapPreview = dynamic(
  () => import("@/components/admin/market-admin-map-preview").then((m) => m.MarketAdminMapPreview),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full rounded-md" /> },
);

function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function formatAddress(
  line1: string | null,
  line2: string | null,
  city: string | null,
  region: string | null,
  postalCode: string | null,
): string {
  const lines = [line1, line2, [city, region].filter(Boolean).join(", "), postalCode]
    .map((part) => part?.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines.join(" · ") : "—";
}

function ReadonlyField({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-muted-foreground text-xs">{label}</p>
      <p className="text-sm leading-snug">{value.trim() || "—"}</p>
    </div>
  );
}

function WazeLogo({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 2C6.9 2 2.75 5.94 2.75 10.8c0 1.02.2 2 .58 2.9-.16.62-.5 1.2-1.02 1.62a.9.9 0 0 0 .5 1.6c1.03.06 2-.28 2.77-.9A10.6 10.6 0 0 0 12 17.6c5.1 0 9.25-3.94 9.25-8.8S17.1 2 12 2Zm-3.1 9.3a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm6.2 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4ZM12 15.2c-1.9 0-3.6-1-4.4-2.5a.6.6 0 0 1 1.05-.58c.6 1.1 1.9 1.88 3.35 1.88s2.75-.78 3.35-1.88a.6.6 0 1 1 1.05.58c-.8 1.5-2.5 2.5-4.4 2.5Z" />
      <circle cx="7" cy="20" r="1.6" />
      <circle cx="15" cy="20" r="1.6" />
    </svg>
  );
}

function WazeLocationActions({
  lat,
  lng,
  wazeUrl,
}: Readonly<{ lat: number; lng: number; wazeUrl: string | null }>) {
  const navigateUrl =
    wazeUrl ?? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(navigateUrl);
      toast.success("Enlace de Waze copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        asChild
        className="flex-1 gap-2 bg-[#33ccff] text-white hover:bg-[#2bb8e6]"
        variant="secondary"
      >
        <a href={navigateUrl} rel="noreferrer" target="_blank">
          <WazeLogo className="h-4 w-4" />
          Abrir en Waze
        </a>
      </Button>
      <Button
        aria-label="Copiar enlace de Waze"
        size="icon"
        title="Copiar enlace de Waze"
        variant="outline"
        onClick={() => void copyUrl()}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="space-y-3">
      <h3 className="font-medium text-sm">{title}</h3>
      {children}
    </section>
  );
}

export function MarketCustomerDetailSheet({
  customerId,
  fallbackName,
  fallbackLat,
  fallbackLng,
  onClose,
}: Readonly<{
  customerId: number | null;
  fallbackName?: string;
  fallbackLat?: number;
  fallbackLng?: number;
  onClose: () => void;
}>) {
  const open = customerId != null && customerId > 0;

  const detailQuery = useQuery({
    queryKey: ["market-customer-detail", customerId],
    queryFn: () => fetchCustomerFullDetailViaProxy(customerId!),
    enabled: open,
    staleTime: 60_000,
  });

  const deliveryQuery = useQuery({
    queryKey: ["market-customer-delivery", customerId],
    queryFn: async () => {
      const [delivery, zones] = await Promise.all([
        fetchCustomerDeliveryViaProxy(customerId!),
        fetchDeliveryZonesViaProxy(),
      ]);
      return { delivery, zones };
    },
    enabled: open,
    staleTime: 60_000,
  });

  const detail = detailQuery.data;
  const delivery = deliveryQuery.data?.delivery ?? null;
  const zones = deliveryQuery.data?.zones ?? [];

  const displayName = detail?.name ?? fallbackName ?? "Cliente";
  const parsedWaze = parseWazeCoordinates(detail?.wazeAddress);
  const lat = parsedWaze?.lat ?? detail?.lat ?? fallbackLat ?? null;
  const lng = parsedWaze?.lng ?? detail?.lng ?? fallbackLng ?? null;
  const wazeUrl = normalizeWazeUrl(detail?.wazeAddress) ?? (lat != null && lng != null ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : null);

  const zoneName = useMemo(() => {
    const zoneId = delivery?.overrides.deliveryZoneId;
    if (zoneId == null) return "Sin zona (global)";
    return zones.find((z) => z.zoneId === zoneId)?.name ?? "—";
  }, [delivery?.overrides.deliveryZoneId, zones]);

  const deliveryDays = useMemo(() => {
    if (!delivery) return "—";
    const override = delivery.overrides.deliveryDaysOverride;
    if (override?.length) return formatWeekdayListEs(override);
    return formatWeekdayListEs(delivery.resolvedSchedule.weekdays);
  }, [delivery]);

  const primaryEmail =
    detail?.email?.trim() ||
    detail?.contacts.find((c) => c.email?.trim())?.email?.trim() ||
    detail?.orderingEmail?.trim() ||
    "—";

  const loading = detailQuery.isLoading || deliveryQuery.isLoading;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-md" side="right">
        <SheetHeader className="shrink-0 border-b pb-4">
          <SheetTitle>{displayName}</SheetTitle>
          <SheetDescription>Cliente con ubicación en el mapa</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="mx-auto size-20 rounded-lg" />
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton className="h-9 w-full" key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-20 items-center justify-center rounded-lg border bg-muted/30 font-semibold text-lg text-muted-foreground">
                  {customerInitials(displayName)}
                </div>
                <Badge className="bg-green-600 hover:bg-green-600">Ya es mi cliente</Badge>
              </div>

              {lat != null && lng != null ? (
                <MarketAdminMapPreview lat={lat} lng={lng} markerColor="#16a34a" />
              ) : (
                <p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
                  Sin coordenadas para mostrar en el mapa.
                </p>
              )}

              <Section title="Información">
                <div className="space-y-3 rounded-lg border bg-background p-3">
                  <ReadonlyField label="Nombre" value={displayName} />
                  <ReadonlyField
                    label="Ubicación"
                    value={formatAddress(
                      detail?.addressLine1 ?? null,
                      detail?.addressLine2 ?? null,
                      detail?.city ?? null,
                      detail?.region ?? null,
                      detail?.postalCode ?? null,
                    )}
                  />
                  <ReadonlyField
                    label="Identificación"
                    value={detail?.governmentId ?? "—"}
                  />
                  <ReadonlyField label="Correo" value={primaryEmail} />
                  {detail?.clientCode ? (
                    <ReadonlyField label="Código cliente" value={detail.clientCode} />
                  ) : null}
                  {detail?.phone ? (
                    <ReadonlyField label="Teléfono" value={detail.phone} />
                  ) : null}
                </div>
              </Section>

              {delivery ? (
                <>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="font-medium text-sm">Horario efectivo</p>
                    <p className="mt-1 text-muted-foreground text-sm">
                      Entregas: {formatWeekdayListEs(delivery.resolvedSchedule.weekdays)} · Corte{" "}
                      {delivery.resolvedSchedule.cutoffTime} (
                      {delivery.resolvedSchedule.cutoffType === "flexible"
                        ? "flexible"
                        : "estricto"}
                      )
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        Fuente:{" "}
                        {WEEKDAYS_SOURCE_LABEL[delivery.resolvedSchedule.weekdaysSource] ??
                          delivery.resolvedSchedule.weekdaysSource}
                      </Badge>
                      {delivery.resolvedSchedule.sameDayEnabled ? (
                        <Badge variant="outline">
                          Mismo día hasta {delivery.resolvedSchedule.sameDayCutoffTime}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <Section title="Logística">
                    <div className="space-y-3 rounded-lg border bg-background p-3">
                      <ReadonlyField label="Días de entrega" value={deliveryDays} />
                      <ReadonlyField label="Zona de entrega" value={zoneName} />
                    </div>
                  </Section>
                </>
              ) : null}

              {wazeUrl && lat != null && lng != null ? (
                <Section title="Waze">
                  <div className="space-y-2 rounded-lg border bg-background p-3">
                    <WazeLocationActions lat={lat} lng={lng} wazeUrl={wazeUrl} />
                    <div className="flex items-start gap-2 rounded-md border bg-muted/20 px-2.5 py-2">
                      <p className="min-w-0 flex-1 break-all text-xs">{wazeUrl}</p>
                      <Button
                        aria-label="Copiar enlace de Waze"
                        className="size-7 shrink-0"
                        size="icon"
                        type="button"
                        variant="outline"
                        onClick={() => void navigator.clipboard.writeText(wazeUrl).then(() => toast.success("Enlace copiado"))}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {lat.toFixed(6)}, {lng.toFixed(6)}
                    </p>
                  </div>
                </Section>
              ) : null}

              {customerId != null ? (
                <Button asChild className="w-full" variant="outline">
                  <a href={`/clients/${customerId}`}>
                    <ExternalLink className="mr-2 size-4" />
                    Ver ficha completa
                  </a>
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
