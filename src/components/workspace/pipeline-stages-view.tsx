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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createStageViaProxy,
  deleteStageViaProxy,
  fetchPipelineSettingsViaProxy,
  savePipelineFlowViaProxy,
  stagesToFlowEntries,
  updateStageViaProxy,
  type PipelineStage,
} from "@/lib/dashboard-pipeline";
import { cn } from "@/lib/utils";

type FlowRow = {
  kind: "system" | "custom";
  key: string;
  label: string;
  isTerminal: boolean;
  stageId?: string;
};

function stageToRow(stage: PipelineStage): FlowRow {
  return {
    kind: stage.kind,
    key: stage.key,
    label: stage.label,
    isTerminal: stage.isTerminal,
    stageId: stage.stageId,
  };
}

function SortableFlowRow({
  row,
  onLabelChange,
  onRemove,
  canEdit,
}: Readonly<{
  row: FlowRow;
  onLabelChange: (value: string) => void;
  onRemove?: () => void;
  canEdit: boolean;
}>) {
  const id = row.kind === "system" ? `system:${row.key}` : `custom:${row.stageId}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !canEdit || row.isTerminal,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm",
        isDragging && "opacity-70",
      )}
    >
      <button
        aria-label="Reordenar"
        className={cn(
          "touch-none text-muted-foreground",
          (!canEdit || row.isTerminal) && "cursor-not-allowed opacity-40",
        )}
        disabled={!canEdit || row.isTerminal}
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      {canEdit && row.kind === "system" ? (
        <Input
          className="flex-1"
          value={row.label}
          onChange={(e) => onLabelChange(e.target.value)}
        />
      ) : canEdit && row.kind === "custom" && row.stageId ? (
        <Input
          className="flex-1"
          defaultValue={row.label}
          onBlur={(e) => {
            const value = e.target.value.trim();
            if (value && value !== row.label) onLabelChange(value);
          }}
        />
      ) : (
        <span className="flex-1 px-3 py-2 text-sm">{row.label}</span>
      )}

      <Badge variant={row.kind === "system" ? "secondary" : "outline"}>
        {row.kind === "system" ? "Sistema" : "Personalizada"}
      </Badge>

      {row.isTerminal ? (
        <Badge className="text-xs" variant="outline">
          Terminal
        </Badge>
      ) : null}

      {canEdit && row.kind === "custom" && row.stageId && onRemove ? (
        <Button aria-label="Eliminar" size="icon" type="button" variant="ghost" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      ) : (
        <div className="size-9 shrink-0" />
      )}
    </div>
  );
}

function TerminalRow({ row }: Readonly<{ row: FlowRow }>) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 p-2">
      <div className="size-4 shrink-0" />
      <span className="flex-1 px-3 py-2 text-sm">{row.label}</span>
      <Badge variant="secondary">Sistema</Badge>
      <Badge className="text-xs" variant="outline">
        Terminal
      </Badge>
      <div className="size-9 shrink-0" />
    </div>
  );
}

export function PipelineStagesView({ canEdit = true }: Readonly<{ canEdit?: boolean }>) {
  const [rows, setRows] = useState<FlowRow[]>([]);
  const [savedRows, setSavedRows] = useState<FlowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortableRows = useMemo(
    () => rows.filter((row) => !row.isTerminal),
    [rows],
  );
  const terminalRow = useMemo(() => rows.find((row) => row.isTerminal) ?? null, [rows]);

  const sortableIds = useMemo(
    () =>
      sortableRows.map((row) =>
        row.kind === "system" ? `system:${row.key}` : `custom:${row.stageId}`,
      ),
    [sortableRows],
  );

  const isDirty = useMemo(
    () => JSON.stringify(rows) !== JSON.stringify(savedRows),
    [rows, savedRows],
  );

  const applyStages = useCallback((stages: PipelineStage[]) => {
    const next = stages.map(stageToRow);
    setRows(next);
    setSavedRows(next);
  }, []);

  async function reload() {
    const settings = await fetchPipelineSettingsViaProxy();
    applyStages(settings.stages);
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  function updateRowLabel(key: string, stageId: string | undefined, label: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (stageId) return row.stageId === stageId ? { ...row, label } : row;
        return row.kind === "system" && row.key === key ? { ...row, label } : row;
      }),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!canEdit) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    setRows((prev) => {
      const movable = prev.filter((row) => !row.isTerminal);
      const terminal = prev.find((row) => row.isTerminal);
      const reordered = arrayMove(movable, oldIndex, newIndex);
      return terminal ? [...reordered, terminal] : reordered;
    });
  }

  async function add() {
    const label = newLabel.trim();
    if (!label || busy || !canEdit) return;
    setBusy(true);
    try {
      await createStageViaProxy({ label });
      setNewLabel("");
      await reload();
      toast.success("Etapa creada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(stageId: string) {
    if (!canEdit) return;
    setBusy(true);
    try {
      await deleteStageViaProxy(stageId);
      await reload();
      toast.success("Etapa eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!canEdit || !isDirty || saving) return;
    setSaving(true);
    try {
      for (const row of rows) {
        if (row.kind !== "custom" || !row.stageId) continue;
        const saved = savedRows.find((s) => s.stageId === row.stageId);
        if (saved && saved.label !== row.label) {
          await updateStageViaProxy(row.stageId, { label: row.label });
        }
      }

      const systemLabels: Record<string, string> = {};
      for (const row of rows) {
        if (row.kind === "system") {
          systemLabels[row.key] = row.label;
        }
      }

      const stages: PipelineStage[] = rows.map((row, position) => ({
        kind: row.kind,
        key: row.key,
        label: row.label,
        color: null,
        isTerminal: row.isTerminal,
        position,
        stageId: row.stageId,
      }));

      const result = await savePipelineFlowViaProxy(stagesToFlowEntries(stages), systemLabels);
      applyStages(result.stages);
      toast.success("Flujo guardado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
      await reload();
    } finally {
      setSaving(false);
    }
  }

  function discardChanges() {
    setRows(savedRows);
  }

  if (loading) {
    return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-semibold text-lg">Etapas del pipeline</h1>
          <p className="text-muted-foreground text-sm">
            Arrastra para reordenar las columnas del tablero de ventas. «Ganado (won)» siempre queda al
            final.
          </p>
        </div>
        {canEdit && isDirty ? (
          <div className="flex gap-2">
            <Button disabled={saving} type="button" variant="outline" onClick={discardChanges}>
              Descartar
            </Button>
            <Button disabled={saving} type="button" onClick={() => void handleSave()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Guardar cambios
            </Button>
          </div>
        ) : null}
      </div>

      {canEdit ? (
        <div className="flex gap-2">
          <Input
            placeholder="Nueva etapa personalizada"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
          />
          <Button disabled={busy} onClick={() => void add()}>
            <Plus className="size-4" /> Agregar
          </Button>
        </div>
      ) : null}

      <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {sortableRows.map((row) => (
              <li key={row.kind === "system" ? row.key : row.stageId}>
                <SortableFlowRow
                  canEdit={canEdit}
                  row={row}
                  onLabelChange={(value) => updateRowLabel(row.key, row.stageId, value)}
                  onRemove={
                    row.kind === "custom" && row.stageId
                      ? () => void remove(row.stageId!)
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {terminalRow ? (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Etapa final (no se puede mover)</p>
          <TerminalRow row={terminalRow} />
        </div>
      ) : null}
    </div>
  );
}
