"use client";

import { useEffect, useState } from "react";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createStageViaProxy,
  deleteStageViaProxy,
  fetchPipelineViaProxy,
  updateStageViaProxy,
  type PipelineStage,
} from "@/lib/dashboard-pipeline";

export function PipelineStagesView() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const board = await fetchPipelineViaProxy();
    setStages(board.stages);
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function add() {
    const label = newLabel.trim();
    if (!label || busy) return;
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

  async function rename(stageId: string, label: string) {
    try {
      await updateStageViaProxy(stageId, { label });
      toast.success("Etapa actualizada");
    } catch {
      toast.error("No se pudo renombrar.");
      void reload();
    }
  }

  async function remove(stageId: string) {
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-semibold text-lg">Etapas del pipeline</h1>
        <p className="text-muted-foreground text-sm">
          Columnas del tablero de ventas. Las etapas del sistema no se pueden eliminar ni renombrar.
        </p>
      </div>

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

      {loading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        <ul className="divide-y rounded-lg border">
          {stages.map((s) => (
            <li key={s.stageId ?? s.key} className="flex items-center gap-2 p-2">
              {s.kind === "custom" && s.stageId ? (
                <Input
                  defaultValue={s.label}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== s.label) void rename(s.stageId!, v);
                  }}
                />
              ) : (
                <span className="flex-1 px-3 py-2 text-sm">{s.label}</span>
              )}
              <Badge variant={s.kind === "system" ? "secondary" : "outline"}>
                {s.kind === "system" ? "Sistema" : "Personalizada"}
              </Badge>
              {s.isTerminal ? (
                <Badge variant="outline" className="text-xs">
                  Terminal
                </Badge>
              ) : null}
              {s.kind === "custom" && s.stageId ? (
                <Button
                  aria-label="Eliminar"
                  disabled={busy}
                  size="icon"
                  variant="ghost"
                  onClick={() => void remove(s.stageId!)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : (
                <div className="size-9 shrink-0" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
