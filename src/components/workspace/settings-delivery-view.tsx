"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeliveryWeekdaysPicker } from "@/components/workspace/delivery-weekdays-picker";
import {
  createDeliveryZoneViaProxy,
  deleteDeliveryZoneViaProxy,
  fetchDeliverySettingsViaProxy,
  fetchDeliveryZonesViaProxy,
  formatWeekdayListEs,
  patchDeliverySettingsViaProxy,
  patchDeliveryZoneViaProxy,
  type DeliverySettingsRow,
  type DeliveryZoneRow,
} from "@/lib/delivery";
import { canMutateInventory } from "@/lib/roles";
import { workspaceTableCardClassName } from "@/lib/workspace-layout";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

function ZoneFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: DeliveryZoneRow | null;
  onSaved: () => Promise<void>;
}>) {
  const [name, setName] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setWeekdays(initial?.deliveryWeekdays ?? []);
    setUseCustomDays(Boolean(initial?.deliveryWeekdays?.length));
  }, [open, initial]);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("El nombre de la zona es obligatorio.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: trimmed,
        deliveryWeekdays: useCustomDays ? weekdays : null,
      };
      const result = initial
        ? await patchDeliveryZoneViaProxy(initial.zoneId, payload)
        : await createDeliveryZoneViaProxy(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial ? "Zona actualizada." : "Zona creada.");
      onOpenChange(false);
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{initial ? "Editar zona" : "Nueva zona de entrega"}</AlertDialogTitle>
          <AlertDialogDescription>
            Asigná clientes a una zona para aplicar días de entrega distintos al horario global.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="zone-name">Nombre</Label>
            <Input
              id="zone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. San José centro"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">Días personalizados</p>
              <p className="text-muted-foreground text-xs">
                Si está desactivado, la zona hereda los días globales.
              </p>
            </div>
            <Switch checked={useCustomDays} onCheckedChange={setUseCustomDays} />
          </div>
          {useCustomDays ? (
            <DeliveryWeekdaysPicker value={weekdays} onChange={setWeekdays} />
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <Button disabled={busy} type="button" onClick={() => void handleSubmit()}>
            {busy ? "Guardando…" : "Guardar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SettingsDeliveryView() {
  const { role } = useWorkspacePermissions();
  const canEdit = canMutateInventory(role);

  const [settings, setSettings] = useState<DeliverySettingsRow | null>(null);
  const [zones, setZones] = useState<DeliveryZoneRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [zoneFormOpen, setZoneFormOpen] = useState(false);
  const [editZone, setEditZone] = useState<DeliveryZoneRow | null>(null);
  const [deleteZone, setDeleteZone] = useState<DeliveryZoneRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [nextSettings, nextZones] = await Promise.all([
        fetchDeliverySettingsViaProxy(),
        fetchDeliveryZonesViaProxy(),
      ]);
      setSettings(nextSettings);
      setZones(nextZones);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cargar la logística.");
      setSettings(null);
      setZones([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function saveSettings(patch: Partial<DeliverySettingsRow>) {
    if (!canEdit || !settings) return;
    setSaving(true);
    try {
      const result = await patchDeliverySettingsViaProxy(patch);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSettings(result.settings);
      toast.success("Configuración guardada.");
    } finally {
      setSaving(false);
    }
  }

  if ((settings === null || zones === null) && !error) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Cargando logística…
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
        {error ?? "No pudimos cargar la configuración de entregas."}
      </div>
    );
  }

  async function confirmDeleteZone() {
    if (!deleteZone) return;
    setDeleteBusy(true);
    try {
      const result = await deleteDeliveryZoneViaProxy(deleteZone.zoneId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Zona eliminada.");
      setDeleteZone(null);
      await reload();
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-semibold text-lg tracking-tight">Logística</h2>
        <p className="text-muted-foreground text-sm">
          Días de entrega, hora límite de pedido y asignación automática de fechas en borradores de WhatsApp.
        </p>
      </div>

      <section className="space-y-4 rounded-lg border p-4">
        <div>
          <h3 className="font-medium">Horario global</h3>
          <p className="text-muted-foreground text-sm">
            Zona horaria: <span className="font-mono">{settings.timezone}</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label>Días de entrega</Label>
          <DeliveryWeekdaysPicker
            disabled={!canEdit || saving}
            value={settings.defaultDeliveryWeekdays}
            onChange={(defaultDeliveryWeekdays) =>
              void saveSettings({ defaultDeliveryWeekdays })
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cutoff-time">Hora límite de pedido</Label>
            <Input
              disabled={!canEdit || saving}
              id="cutoff-time"
              type="time"
              value={settings.cutoffTime}
              onChange={(e) => setSettings({ ...settings, cutoffTime: e.target.value })}
              onBlur={() => void saveSettings({ cutoffTime: settings.cutoffTime })}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de corte</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!canEdit || saving}
                size="sm"
                type="button"
                variant={settings.cutoffType === "strict" ? "default" : "outline"}
                onClick={() => void saveSettings({ cutoffType: "strict" })}
              >
                Estricto
              </Button>
              <Button
                disabled={!canEdit || saving}
                size="sm"
                type="button"
                variant={settings.cutoffType === "flexible" ? "default" : "outline"}
                onClick={() => void saveSettings({ cutoffType: "flexible" })}
              >
                Flexible (pedido tardío)
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Flexible permite pedidos después del corte con confirmación manual.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-3">
          <div>
            <p className="font-medium text-sm">Asignar fecha automáticamente</p>
            <p className="text-muted-foreground text-xs">
              Los borradores de WhatsApp reciben la próxima fecha de entrega calculada.
            </p>
          </div>
          <Switch
            checked={settings.autoAssignNextDeliveryDate}
            disabled={!canEdit || saving}
            onCheckedChange={(checked) =>
              void saveSettings({ autoAssignNextDeliveryDate: checked })
            }
          />
        </div>

        <div className="space-y-3 rounded-md border px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">Entrega el mismo día</p>
              <p className="text-muted-foreground text-xs">
                Permite entregas hoy si el pedido llega antes de una hora límite.
              </p>
            </div>
            <Switch
              checked={settings.defaultSameDayEnabled}
              disabled={!canEdit || saving}
              onCheckedChange={(checked) =>
                void saveSettings({
                  defaultSameDayEnabled: checked,
                  defaultSameDayCutoffTime: checked
                    ? settings.defaultSameDayCutoffTime ?? "12:00"
                    : null,
                })
              }
            />
          </div>
          {settings.defaultSameDayEnabled ? (
            <div className="space-y-2">
              <Label htmlFor="same-day-cutoff">Corte entrega hoy</Label>
              <Input
                disabled={!canEdit || saving}
                id="same-day-cutoff"
                type="time"
                value={settings.defaultSameDayCutoffTime ?? "12:00"}
                onChange={(e) =>
                  setSettings({ ...settings, defaultSameDayCutoffTime: e.target.value })
                }
                onBlur={() =>
                  void saveSettings({
                    defaultSameDayCutoffTime: settings.defaultSameDayCutoffTime,
                  })
                }
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-medium">Zonas de entrega</h3>
            <p className="text-muted-foreground text-sm">
              Rutas o áreas con días de entrega distintos al horario global.
            </p>
          </div>
          {canEdit ? (
            <Button
              type="button"
              onClick={() => {
                setEditZone(null);
                setZoneFormOpen(true);
              }}
            >
              <Plus aria-hidden className="size-4" />
              Nueva zona
            </Button>
          ) : null}
        </div>

        <div className={workspaceTableCardClassName}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Días</TableHead>
                <TableHead className="w-24">Estado</TableHead>
                {canEdit ? <TableHead className="w-12" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(zones ?? []).length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={canEdit ? 4 : 3}>
                    No hay zonas configuradas.
                  </TableCell>
                </TableRow>
              ) : (
                (zones ?? []).map((zone) => (
                  <TableRow key={zone.zoneId}>
                    <TableCell className="font-medium">{zone.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {zone.deliveryWeekdays?.length
                        ? formatWeekdayListEs(zone.deliveryWeekdays)
                        : "Hereda global"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={zone.isActive ? "secondary" : "outline"}>
                        {zone.isActive ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    {canEdit ? (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-label="Acciones de zona" size="icon" variant="ghost">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditZone(zone);
                                setZoneFormOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteZone(zone)}
                            >
                              <Trash2 className="size-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <ZoneFormDialog
        initial={editZone}
        open={zoneFormOpen}
        onOpenChange={setZoneFormOpen}
        onSaved={reload}
      />

      <AlertDialog open={Boolean(deleteZone)} onOpenChange={(open) => !open && setDeleteZone(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar zona?</AlertDialogTitle>
            <AlertDialogDescription>
              Los clientes asignados a «{deleteZone?.name}» quedarán sin zona.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancelar</AlertDialogCancel>
            <Button
              disabled={deleteBusy}
              type="button"
              variant="destructive"
              onClick={() => void confirmDeleteZone()}
            >
              {deleteBusy ? "Eliminando…" : "Eliminar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
