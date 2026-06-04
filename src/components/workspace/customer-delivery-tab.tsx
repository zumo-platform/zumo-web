"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { DeliveryWeekdaysPicker } from "@/components/workspace/delivery-weekdays-picker";
import {
  fetchCustomerDeliveryViaProxy,
  fetchDeliveryZonesViaProxy,
  formatWeekdayListEs,
  patchCustomerDeliveryViaProxy,
  WEEKDAYS_SOURCE_LABEL,
  type CustomerDeliveryOverrides,
  type DeliveryZoneRow,
  type ResolvedDeliverySchedule,
} from "@/lib/delivery";
import { canMutateInventory } from "@/lib/roles";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

const NONE_ZONE = "__none__";

export function CustomerDeliveryTab({ customerId }: Readonly<{ customerId: number }>) {
  const { role } = useWorkspacePermissions();
  const canEdit = canMutateInventory(role);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<DeliveryZoneRow[]>([]);
  const [overrides, setOverrides] = useState<CustomerDeliveryOverrides | null>(null);
  const [resolved, setResolved] = useState<ResolvedDeliverySchedule | null>(null);
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [customSameDay, setCustomSameDay] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [delivery, zoneRows] = await Promise.all([
        fetchCustomerDeliveryViaProxy(customerId),
        fetchDeliveryZonesViaProxy(),
      ]);
      setZones(zoneRows);
      if (delivery) {
        setOverrides(delivery.overrides);
        setResolved(delivery.resolvedSchedule);
        setUseCustomDays(Boolean(delivery.overrides.deliveryDaysOverride?.length));
        setCustomSameDay(delivery.overrides.sameDayEnabled != null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos cargar la logística del cliente.");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Partial<CustomerDeliveryOverrides>) {
    if (!canEdit) return;
    setSaving(true);
    try {
      const result = await patchCustomerDeliveryViaProxy(customerId, patch);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOverrides(result.overrides);
      setResolved(result.resolvedSchedule);
      toast.success("Logística del cliente guardada.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Cargando logística…
      </div>
    );
  }

  if (!overrides || !resolved) {
    return (
      <p className="py-8 text-muted-foreground text-sm">
        No pudimos cargar la configuración de entrega de este cliente.
      </p>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="font-medium text-sm">Horario efectivo</p>
        <p className="mt-1 text-muted-foreground text-sm">
          Entregas: {formatWeekdayListEs(resolved.weekdays)} · Corte {resolved.cutoffTime} (
          {resolved.cutoffType === "flexible" ? "flexible" : "estricto"})
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">
            Fuente: {WEEKDAYS_SOURCE_LABEL[resolved.weekdaysSource] ?? resolved.weekdaysSource}
          </Badge>
          {resolved.sameDayEnabled ? (
            <Badge variant="outline">Mismo día hasta {resolved.sameDayCutoffTime}</Badge>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Zona de entrega</Label>
        <Select
          disabled={!canEdit || saving}
          value={
            overrides.deliveryZoneId != null ? String(overrides.deliveryZoneId) : NONE_ZONE
          }
          onValueChange={(value) =>
            void save({
              deliveryZoneId: value === NONE_ZONE ? null : Number(value),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sin zona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_ZONE}>Sin zona (global)</SelectItem>
            {zones.map((zone) => (
              <SelectItem key={zone.zoneId} value={String(zone.zoneId)}>
                {zone.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-sm">Días personalizados</p>
            <p className="text-muted-foreground text-xs">
              Reemplaza los días de la zona o del horario global.
            </p>
          </div>
          <Switch
            checked={useCustomDays}
            disabled={!canEdit || saving}
            onCheckedChange={(checked) => {
              setUseCustomDays(checked);
              void save({
                deliveryDaysOverride: checked ? overrides.deliveryDaysOverride ?? [1, 2, 3, 4, 5] : null,
              });
            }}
          />
        </div>
        {useCustomDays ? (
          <DeliveryWeekdaysPicker
            disabled={!canEdit || saving}
            value={overrides.deliveryDaysOverride ?? []}
            onChange={(deliveryDaysOverride) => void save({ deliveryDaysOverride })}
          />
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-sm">Entrega el mismo día</p>
            <p className="text-muted-foreground text-xs">
              Dejar vacío para heredar la configuración global.
            </p>
          </div>
          <Switch
            checked={customSameDay}
            disabled={!canEdit || saving}
            onCheckedChange={(checked) => {
              setCustomSameDay(checked);
              void save({
                sameDayEnabled: checked ? true : null,
                sameDayCutoffTime: checked
                  ? overrides.sameDayCutoffTime ?? "12:00"
                  : null,
              });
            }}
          />
        </div>
        {customSameDay ? (
          <div className="space-y-2">
            <Label htmlFor="customer-same-day-cutoff">Corte entrega hoy</Label>
            <Input
              disabled={!canEdit || saving}
              id="customer-same-day-cutoff"
              type="time"
              value={overrides.sameDayCutoffTime ?? "12:00"}
              onChange={(e) =>
                setOverrides({ ...overrides, sameDayCutoffTime: e.target.value })
              }
              onBlur={() =>
                void save({ sameDayCutoffTime: overrides.sameDayCutoffTime ?? "12:00" })
              }
            />
          </div>
        ) : null}
      </div>

      {canEdit ? (
        <div className="flex justify-end">
          <Button disabled={saving} type="button" variant="outline" onClick={() => void load()}>
            Recargar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
