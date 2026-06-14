"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomStatusFormSheet } from "@/components/workspace/custom-status-form-sheet";
import { OrderFlowSettingsSkeleton } from "@/components/workspace/workspace-skeletons";
import {
  DEFAULT_SYSTEM_STATUS_CATALOG,
  deleteCustomStatusViaProxy,
  fetchSupplierFlow,
  saveSupplierFlow,
  updateCustomStatusViaProxy,
  type EffectiveStatusItem,
  type SupplierCustomStatus,
} from "@/lib/order-status-flow";
import { cn } from "@/lib/utils";

type FlowRow =
  | { kind: "system"; key: string; label: string; isMandatory?: boolean }
  | { kind: "custom"; statusId: string; key: string; label: string; color: string | null };

function defaultSystemLabel(key: string): string {
  return DEFAULT_SYSTEM_STATUS_CATALOG.find((s) => s.key === key)?.label ?? key;
}

function buildSystemLabelsFromPayload(overrides: Record<string, string>): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const status of DEFAULT_SYSTEM_STATUS_CATALOG) {
    labels[status.key] = overrides[status.key]?.trim() || status.label;
  }
  return labels;
}

function buildSystemLabelOverrides(labels: Record<string, string>): Record<string, string> {
  const overrides: Record<string, string> = {};
  for (const status of DEFAULT_SYSTEM_STATUS_CATALOG) {
    const label = labels[status.key]?.trim() || status.label;
    if (label !== status.label) {
      overrides[status.key] = label;
    }
  }
  return overrides;
}

function flowItemToRow(item: EffectiveStatusItem): FlowRow | null {
  if (item.isFloating) return null;
  if (item.kind === "custom") {
    if (!item.statusId) return null;
    return {
      kind: "custom",
      statusId: item.statusId,
      key: item.key,
      label: item.label,
      color: item.color,
    };
  }
  return {
    kind: "system",
    key: item.key,
    label: item.label,
    isMandatory: item.isMandatory,
  };
}

function rowsToPayload(rows: FlowRow[]) {
  return rows.map((row) =>
    row.kind === "system"
      ? { kind: "system" as const, key: row.key }
      : { kind: "custom" as const, statusId: row.statusId },
  );
}

function SortableFlowRow({
  row,
  onRemove,
}: Readonly<{
  row: FlowRow;
  onRemove: () => void;
}>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.kind === "system" ? `system:${row.key}` : `custom:${row.statusId}`,
    disabled: row.kind === "system" && row.isMandatory,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const removable = !(row.kind === "system" && row.isMandatory);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 shadow-sm",
        isDragging && "opacity-70",
      )}
    >
      <button
        aria-label="Reordenar"
        className={cn(
          "touch-none text-muted-foreground",
          row.kind === "system" && row.isMandatory && "cursor-not-allowed opacity-40",
        )}
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      {row.kind === "custom" && row.color ? (
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: row.color }}
        />
      ) : null}
      <span className="flex-1 text-sm">{row.label}</span>
      {row.kind === "system" && row.isMandatory ? (
        <Badge variant="secondary">Obligatorio</Badge>
      ) : null}
      <Button
        disabled={!removable}
        size="sm"
        title={
          removable
            ? "Quitar del flujo"
            : "Este estado es obligatorio y no se puede quitar del flujo."
        }
        type="button"
        variant="ghost"
        onClick={onRemove}
      >
        Quitar del flujo
      </Button>
    </div>
  );
}

export function SettingsOrderFlowView({ canEdit }: Readonly<{ canEdit: boolean }>) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mandatoryRows, setMandatoryRows] = useState<FlowRow[]>([]);
  const [configRows, setConfigRows] = useState<FlowRow[]>([]);
  const [savedConfigRows, setSavedConfigRows] = useState<FlowRow[]>([]);
  const [systemLabels, setSystemLabels] = useState<Record<string, string>>({});
  const [savedSystemLabels, setSavedSystemLabels] = useState<Record<string, string>>({});
  const [customStatuses, setCustomStatuses] = useState<SupplierCustomStatus[]>([]);
  const [savedCustomStatuses, setSavedCustomStatuses] = useState<SupplierCustomStatus[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SupplierCustomStatus | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const applyFlow = useCallback((flow: EffectiveStatusItem[]) => {
    const mandatory: FlowRow[] = [];
    const configurable: FlowRow[] = [];
    for (const item of flow) {
      const row = flowItemToRow(item);
      if (!row) continue;
      if (row.kind === "system" && row.isMandatory) mandatory.push(row);
      else configurable.push(row);
    }
    setMandatoryRows(mandatory);
    setConfigRows(configurable);
    setSavedConfigRows(configurable);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { flow, customStatuses: customs, systemStatusLabels, fromApi } =
        await fetchSupplierFlow();
      setApiAvailable(fromApi);
      setCustomStatuses(customs);
      setSavedCustomStatuses(customs);
      const labels = buildSystemLabelsFromPayload(systemStatusLabels);
      setSystemLabels(labels);
      setSavedSystemLabels(labels);
      applyFlow(flow);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el flujo.");
    } finally {
      setLoading(false);
    }
  }, [applyFlow]);

  useEffect(() => {
    void load();
  }, [load]);

  const isFlowDirty = useMemo(
    () => JSON.stringify(configRows) !== JSON.stringify(savedConfigRows),
    [configRows, savedConfigRows],
  );

  const isLabelsDirty = useMemo(() => {
    if (JSON.stringify(systemLabels) !== JSON.stringify(savedSystemLabels)) return true;
    return customStatuses.some((status) => {
      const saved = savedCustomStatuses.find((s) => s.statusId === status.statusId);
      return saved?.label !== status.label;
    });
  }, [systemLabels, savedSystemLabels, customStatuses, savedCustomStatuses]);

  const isDirty = isFlowDirty || isLabelsDirty;

  const sortableIds = configRows.map((row) =>
    row.kind === "system" ? `system:${row.key}` : `custom:${row.statusId}`,
  );

  const cancelledLabel = systemLabels.cancelled ?? defaultSystemLabel("cancelled");

  function isInConfigurableFlow(key: string, statusId?: string): boolean {
    return configRows.some((row) =>
      statusId
        ? row.kind === "custom" && row.statusId === statusId
        : row.kind === "system" && row.key === key,
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setConfigRows((rows) => arrayMove(rows, oldIndex, newIndex));
  }

  function removeFromFlow(row: FlowRow) {
    setConfigRows((rows) =>
      rows.filter((r) =>
        r.kind === "system" && row.kind === "system"
          ? r.key !== row.key
          : r.kind === "custom" && row.kind === "custom"
            ? r.statusId !== row.statusId
            : true,
      ),
    );
  }

  function addSystemToFlow(key: string) {
    const meta = DEFAULT_SYSTEM_STATUS_CATALOG.find((s) => s.key === key);
    if (!meta || meta.isMandatory || meta.isFloating) return;
    if (isInConfigurableFlow(key)) return;
    setConfigRows((rows) => [
      ...rows,
      {
        kind: "system",
        key,
        label: systemLabels[key] ?? meta.label,
      },
    ]);
  }

  function addCustomToFlow(status: SupplierCustomStatus) {
    setCustomStatuses((prev) => {
      const exists = prev.some((s) => s.statusId === status.statusId);
      return exists ? prev.map((s) => (s.statusId === status.statusId ? status : s)) : [...prev, status];
    });
    setConfigRows((rows) => {
      if (rows.some((r) => r.kind === "custom" && r.statusId === status.statusId)) return rows;
      return [
        ...rows,
        {
          kind: "custom",
          statusId: status.statusId,
          key: status.key,
          label: status.label,
          color: status.color,
        },
      ];
    });
  }

  function updateSystemLabel(key: string, value: string) {
    setSystemLabels((prev) => ({ ...prev, [key]: value }));
    setMandatoryRows((rows) =>
      rows.map((row) => (row.kind === "system" && row.key === key ? { ...row, label: value } : row)),
    );
    setConfigRows((rows) =>
      rows.map((row) =>
        row.kind === "system" && row.key === key ? { ...row, label: value } : row,
      ),
    );
  }

  function updateCustomLabel(statusId: string, value: string) {
    setCustomStatuses((prev) =>
      prev.map((status) => (status.statusId === statusId ? { ...status, label: value } : status)),
    );
    setConfigRows((rows) =>
      rows.map((row) =>
        row.kind === "custom" && row.statusId === statusId ? { ...row, label: value } : row,
      ),
    );
  }

  async function handleSave() {
    if (!canEdit || !isDirty) return;
    setSaving(true);
    try {
      for (const status of customStatuses) {
        const saved = savedCustomStatuses.find((s) => s.statusId === status.statusId);
        if (saved && saved.label !== status.label) {
          const updated = await updateCustomStatusViaProxy(status.statusId, { label: status.label });
          setCustomStatuses((prev) =>
            prev.map((s) => (s.statusId === updated.statusId ? updated : s)),
          );
        }
      }

      const payload = [...mandatoryRows, ...configRows];
      const result = await saveSupplierFlow(
        rowsToPayload(payload),
        buildSystemLabelOverrides(systemLabels),
      );

      applyFlow(result.flow);
      const labels = buildSystemLabelsFromPayload(result.systemStatusLabels);
      setSystemLabels(labels);
      setSavedSystemLabels(labels);
      setCustomStatuses(result.customStatuses);
      setSavedCustomStatuses(result.customStatuses);
      toast.success("Cambios guardados.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  function discardChanges() {
    setConfigRows(savedConfigRows);
    setSystemLabels(savedSystemLabels);
    setCustomStatuses(savedCustomStatuses);
    setMandatoryRows((rows) =>
      rows.map((row) =>
        row.kind === "system"
          ? { ...row, label: savedSystemLabels[row.key] ?? defaultSystemLabel(row.key) }
          : row,
      ),
    );
  }

  async function confirmDeleteCustom() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCustomStatusViaProxy(deleteTarget.statusId);
      toast.success("Estado eliminado.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el estado.");
    } finally {
      setDeleting(false);
    }
  }

  const catalogCustoms = customStatuses.filter((s) => showDeleted || !s.deletedAt);

  if (loading) {
    return <OrderFlowSettingsSkeleton />;
  }

  return (
    <div className="space-y-8 pb-24">
      <div className="space-y-1">
        <h2 className="font-semibold text-xl tracking-tight">Flujo de pedidos</h2>
        <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
          Los estados del sistema ya vienen configurados por defecto. Podés renombrarlos, quitarlos
          del flujo (excepto los obligatorios), agregar estados personalizados y reordenar el flujo
          después de Confirmado. Cancelado está disponible desde cualquier estado.
        </p>
      </div>

      {!apiAvailable ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          Los estados por defecto se muestran en modo local, pero el servidor aún no tiene el
          flujo de pedidos desplegado. No podés crear estados personalizados hasta que se aplique
          el deploy del backend con las migraciones 0011 y 0012.
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-medium text-sm">Estados</h3>
            <p className="text-muted-foreground text-xs">
              Todos los estados del sistema están listos para usar; no hace falta crearlos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                checked={showDeleted}
                type="checkbox"
                onChange={(e) => setShowDeleted(e.target.checked)}
              />
              Mostrar eliminados
            </label>
            <Button
              className="gap-1.5"
              disabled={!canEdit || !apiAvailable}
              size="sm"
              type="button"
              onClick={() => setPickerOpen(true)}
            >
              <Plus className="size-4" />
              Nuevo estado
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Clave</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">En flujo</th>
                <th className="px-3 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_SYSTEM_STATUS_CATALOG.map((status) => {
                const inMandatory = status.isMandatory;
                const inFlow = status.isFloating
                  ? true
                  : inMandatory || isInConfigurableFlow(status.key);
                const canRemoveFromFlow =
                  !status.isMandatory && !status.isFloating && isInConfigurableFlow(status.key);

                return (
                  <tr key={status.key} className="border-t">
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 max-w-xs"
                        disabled={!canEdit}
                        maxLength={40}
                        value={systemLabels[status.key] ?? status.label}
                        onChange={(e) => updateSystemLabel(status.key, e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{status.key}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">Sistema</Badge>
                      {status.isMandatory ? (
                        <Badge className="ml-1" variant="secondary">
                          Obligatorio
                        </Badge>
                      ) : null}
                      {status.isFloating ? (
                        <Badge className="ml-1" variant="destructive">
                          Flotante
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {status.isFloating
                        ? "Siempre disponible"
                        : inFlow
                          ? "Sí"
                          : "No"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canRemoveFromFlow ? (
                        <Button
                          disabled={!canEdit}
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() =>
                            removeFromFlow({
                              kind: "system",
                              key: status.key,
                              label: systemLabels[status.key] ?? status.label,
                            })
                          }
                        >
                          Quitar del flujo
                        </Button>
                      ) : !status.isMandatory && !status.isFloating && !inFlow ? (
                        <Button
                          disabled={!canEdit}
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => addSystemToFlow(status.key)}
                        >
                          Agregar al flujo
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}

              {catalogCustoms.map((status) => {
                const inFlow = isInConfigurableFlow(status.key, status.statusId);
                return (
                  <tr key={status.statusId} className="border-t">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {status.color ? (
                          <span
                            aria-hidden
                            className="size-3 shrink-0 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                        ) : null}
                        <Input
                          className="h-8 max-w-xs"
                          disabled={!canEdit || Boolean(status.deletedAt)}
                          maxLength={40}
                          value={status.label}
                          onChange={(e) => updateCustomLabel(status.statusId, e.target.value)}
                        />
                        {status.deletedAt ? (
                          <span className="text-muted-foreground text-xs">(eliminado)</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{status.key}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">Personalizado</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{inFlow ? "Sí" : "No"}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {!status.deletedAt && !inFlow ? (
                          <Button
                            disabled={!canEdit}
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => addCustomToFlow(status)}
                          >
                            Agregar al flujo
                          </Button>
                        ) : null}
                        {!status.deletedAt && inFlow ? (
                          <Button
                            disabled={!canEdit}
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() =>
                              removeFromFlow({
                                kind: "custom",
                                statusId: status.statusId,
                                key: status.key,
                                label: status.label,
                                color: status.color,
                              })
                            }
                          >
                            Quitar del flujo
                          </Button>
                        ) : null}
                        {!status.deletedAt ? (
                          <Button
                            disabled={!canEdit || inFlow}
                            size="icon-sm"
                            title={
                              inFlow
                                ? "Quitá el estado del flujo antes de eliminarlo."
                                : "Eliminar estado"
                            }
                            type="button"
                            variant="ghost"
                            onClick={() => setDeleteTarget(status)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium text-sm">Estados obligatorios</h3>
        <div className="flex flex-wrap items-center gap-2">
          {mandatoryRows.map((row, index) => (
            <div key={row.key} className="flex items-center gap-2">
              {index > 0 ? <span className="text-muted-foreground text-sm">→</span> : null}
              <Badge className="gap-1" variant="outline">
                {systemLabels[row.key] ?? row.label}
                <span className="text-[10px] text-muted-foreground uppercase">Obligatorio</span>
              </Badge>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium text-sm">Flujo configurable</h3>
        {configRows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay estados configurables en el flujo. Agregá estados desde la tabla de arriba.
          </p>
        ) : (
          <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {configRows.map((row) => (
                  <SortableFlowRow
                    key={row.kind === "system" ? row.key : row.statusId}
                    row={{
                      ...row,
                      label:
                        row.kind === "system"
                          ? (systemLabels[row.key] ?? row.label)
                          : row.label,
                    }}
                    onRemove={() => removeFromFlow(row)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-medium text-sm">Estado flotante</h3>
        <Badge variant="destructive">{cancelledLabel}</Badge>
        <p className="text-muted-foreground text-xs">
          Disponible desde cualquier estado; no se reordena.
        </p>
      </section>

      {isDirty ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-end gap-2">
            <Button disabled={saving} type="button" variant="outline" onClick={discardChanges}>
              Descartar
            </Button>
            <Button disabled={saving || !canEdit} type="button" onClick={() => void handleSave()}>
              {saving ? <Loader2 aria-hidden className="size-4 animate-spin" /> : "Guardar cambios"}
            </Button>
          </div>
        </div>
      ) : null}

      <CustomStatusFormSheet
        open={pickerOpen}
        onCreated={(status) => {
          addCustomToFlow(status);
          setSavedCustomStatuses((prev) => [...prev, status]);
        }}
        onOpenChange={setPickerOpen}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estado?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{deleteTarget?.label}&quot;. Los pedidos que ya lo tengan seguirán
              mostrándolo como retirado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={() => void confirmDeleteCustom()}>
              {deleting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
