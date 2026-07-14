"use client";

import { useEffect, useState } from "react";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createBusinessTypeViaProxy,
  deleteBusinessTypeViaProxy,
  fetchBusinessTypesViaProxy,
  updateBusinessTypeViaProxy,
  type BusinessType,
} from "@/lib/dashboard-pipeline";

export function BusinessTypesView() {
  const [rows, setRows] = useState<BusinessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    setRows(await fetchBusinessTypesViaProxy());
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
      await createBusinessTypeViaProxy(label);
      setNewLabel("");
      await reload();
      toast.success("Tipo de negocio creado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function rename(id: string, label: string) {
    try {
      await updateBusinessTypeViaProxy(id, label);
      toast.success("Tipo actualizado");
    } catch {
      toast.error("No se pudo renombrar.");
      void reload();
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteBusinessTypeViaProxy(id);
      await reload();
      toast.success("Tipo eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-semibold text-lg">Tipos de negocio</h1>
        <p className="text-muted-foreground text-sm">
          Categorías para clasificar clientes y oportunidades.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nuevo tipo de negocio"
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
          {rows.map((r) => (
            <li key={r.businessTypeId} className="flex items-center gap-2 p-2">
              <Input
                defaultValue={r.label}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== r.label) void rename(r.businessTypeId, v);
                }}
              />
              <Badge variant="outline" className="shrink-0 font-mono text-xs">
                {r.key}
              </Badge>
              <Button
                aria-label="Eliminar"
                disabled={busy}
                size="icon"
                variant="ghost"
                onClick={() => void remove(r.businessTypeId)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
