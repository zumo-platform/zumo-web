"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createWarehouseViaProxy,
  updateWarehouseViaProxy,
  WAREHOUSE_PURPOSE_OPTIONS,
  type CreateWarehousePayload,
  type DashboardWarehouseRow,
  type WarehousePurpose,
} from "@/lib/inventory";

const EMPTY_FORM: CreateWarehousePayload = {
  name: "",
  code: null,
  kind: "physical",
  purpose: "none",
  isSellable: true,
  countsForReorder: true,
  isDefault: false,
  address: null,
};

export function WarehouseFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: DashboardWarehouseRow | null;
  onSaved: () => void;
}>) {
  const [form, setForm] = useState<CreateWarehousePayload>(EMPTY_FORM);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        code: initial.code,
        kind: initial.kind === "virtual" ? "virtual" : "physical",
        purpose: (initial.purpose as WarehousePurpose) ?? "none",
        isSellable: initial.isSellable,
        countsForReorder: initial.countsForReorder,
        isDefault: initial.isDefault,
        address: null,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, initial]);

  async function save() {
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    setPending(true);
    try {
      if (initial) {
        const result = await updateWarehouseViaProxy(initial.warehouseId, form);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Bodega actualizada.");
      } else {
        const result = await createWarehouseViaProxy(form);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Bodega creada.");
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar bodega" : "Crear bodega"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="wh-name">Nombre</Label>
            <Input
              id="wh-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wh-code">Código (opcional)</Label>
            <Input
              id="wh-code"
              value={form.code ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.trim() || null }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select
              value={form.kind}
              onValueChange={(value: "physical" | "virtual") =>
                setForm((f) => ({
                  ...f,
                  kind: value,
                  isSellable: value === "physical",
                  countsForReorder: value === "physical",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="physical">Física</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.kind === "virtual" ? (
            <div className="grid gap-2">
              <Label>Propósito</Label>
              <Select
                value={form.purpose ?? "quarantine"}
                onValueChange={(value: WarehousePurpose) =>
                  setForm((f) => ({ ...f, purpose: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WAREHOUSE_PURPOSE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="wh-sellable">Cuenta como disponible</Label>
            <Switch
              id="wh-sellable"
              checked={form.isSellable ?? false}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isSellable: checked }))}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="wh-reorder">Cuenta para reabastecimiento</Label>
            <Switch
              id="wh-reorder"
              checked={form.countsForReorder ?? false}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, countsForReorder: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="wh-default">Predeterminada</Label>
            <Switch
              id="wh-default"
              checked={form.isDefault ?? false}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isDefault: checked }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wh-address">Dirección (opcional)</Label>
            <Textarea
              id="wh-address"
              rows={2}
              value={form.address ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value.trim() || null }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={pending} type="button" onClick={() => void save()}>
            {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
