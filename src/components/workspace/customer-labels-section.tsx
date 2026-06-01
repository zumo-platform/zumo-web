"use client";

import { useState } from "react";

import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pastelColorForLabel, type CustomerLabelRow } from "@/lib/customer-hub";
import { addCustomerLabelViaProxy, removeCustomerLabelViaProxy } from "@/lib/customer-hub-api";

export function CustomerLabelsSection({
  customerId,
  initialLabels,
  onLabelsChanged,
}: Readonly<{
  customerId: number;
  initialLabels: readonly CustomerLabelRow[];
  onLabelsChanged?: () => void;
}>) {
  const [labels, setLabels] = useState<CustomerLabelRow[]>(() => [...initialLabels]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (labels.some((l) => l.label.trim().toLowerCase() === trimmed.toLowerCase())) {
      toast.message("Etiqueta ya asignada.");
      return;
    }
    setSaving(true);
    try {
      const created = await addCustomerLabelViaProxy(customerId, trimmed, pastelColorForLabel(trimmed));
      setLabels((prev) => {
        if (prev.some((l) => l.labelId === created.labelId)) return prev;
        return [...prev, created];
      });
      setDraft("");
      onLabelsChanged?.();
      toast.success("Etiqueta agregada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la etiqueta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(labelId: string) {
    setRemovingId(labelId);
    try {
      const ok = await removeCustomerLabelViaProxy(customerId, labelId);
      if (!ok) throw new Error("No se pudo eliminar la etiqueta.");
      setLabels((prev) => prev.filter((l) => l.labelId !== labelId));
      onLabelsChanged?.();
      toast.success("Etiqueta eliminada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar la etiqueta.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <Label className="text-muted-foreground text-xs uppercase tracking-wide">Etiquetas</Label>
      <div className="flex flex-wrap gap-1.5">
        {labels.length === 0 ? (
          <span className="text-muted-foreground text-sm">Sin etiquetas</span>
        ) : (
          labels.map((label) => (
            <Badge
              key={label.labelId}
              className="gap-1 rounded-full border border-transparent pr-1 text-foreground"
              style={{ backgroundColor: label.color?.trim() || pastelColorForLabel(label.label) }}
              variant="secondary"
            >
              {label.label}
              <button
                aria-label={`Eliminar etiqueta ${label.label}`}
                className="rounded-sm p-0.5 hover:bg-muted disabled:opacity-50"
                disabled={removingId === label.labelId}
                type="button"
                onClick={() => void handleRemove(label.labelId)}
              >
                {removingId === label.labelId ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <X className="size-3" />
                )}
              </button>
            </Badge>
          ))
        )}
      </div>
      <form className="flex gap-2" onSubmit={(e) => void handleAdd(e)}>
        <Input
          className="h-8"
          placeholder="Nueva etiqueta"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          className="shrink-0 gap-1"
          disabled={saving || !draft.trim()}
          size="sm"
          type="submit"
          variant="secondary"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Agregar
        </Button>
      </form>
    </div>
  );
}
