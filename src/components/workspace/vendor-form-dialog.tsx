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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createVendorViaProxy,
  updateVendorViaProxy,
  type CreateVendorPayload,
  type DashboardVendorRow,
} from "@/lib/inventory";

const EMPTY_FORM: CreateVendorPayload = {
  name: "",
  contactName: null,
  email: null,
  phone: null,
  defaultCurrency: "CRC",
  leadTimeDays: null,
  notes: null,
  isActive: true,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function VendorFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: DashboardVendorRow | null;
  onSaved: () => void;
}>) {
  const [form, setForm] = useState<CreateVendorPayload>(EMPTY_FORM);
  const [leadInput, setLeadInput] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        contactName: initial.contactName,
        email: initial.email,
        phone: initial.phone,
        defaultCurrency: initial.defaultCurrency,
        leadTimeDays: initial.leadTimeDays,
        notes: initial.notes,
        isActive: initial.isActive,
      });
      setLeadInput(initial.leadTimeDays != null ? String(initial.leadTimeDays) : "");
    } else {
      setForm(EMPTY_FORM);
      setLeadInput("");
    }
  }, [open, initial]);

  async function save() {
    const name = form.name.trim();
    if (!name) {
      toast.error("El nombre del proveedor es obligatorio.");
      return;
    }
    if (form.email && !EMAIL_RE.test(form.email)) {
      toast.error("El email no tiene un formato válido.");
      return;
    }
    let leadTimeDays: number | null = null;
    if (leadInput.trim() !== "") {
      const n = Number(leadInput);
      if (!Number.isFinite(n) || n < 0) {
        toast.error("Los días de entrega deben ser un número mayor o igual a 0.");
        return;
      }
      leadTimeDays = Math.trunc(n);
    }

    const payload: CreateVendorPayload = { ...form, name, leadTimeDays };

    setPending(true);
    try {
      if (initial) {
        const result = await updateVendorViaProxy(initial.vendorId, payload);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Proveedor actualizado.");
      } else {
        const result = await createVendorViaProxy(payload);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Proveedor creado.");
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar proveedor" : "Agregar proveedor"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="vendor-name">Nombre</Label>
            <Input
              id="vendor-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vendor-contact">Nombre de contacto (opcional)</Label>
            <Input
              id="vendor-contact"
              value={form.contactName ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactName: e.target.value.trim() || null }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vendor-email">Email (opcional)</Label>
            <Input
              id="vendor-email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value.trim() || null }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vendor-phone">Teléfono (opcional)</Label>
            <Input
              id="vendor-phone"
              value={form.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.trim() || null }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="vendor-currency">Moneda (opcional)</Label>
              <Input
                id="vendor-currency"
                placeholder="CRC"
                value={form.defaultCurrency ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    defaultCurrency: e.target.value.trim().toUpperCase() || null,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vendor-lead">Días de entrega (opcional)</Label>
              <Input
                id="vendor-lead"
                inputMode="numeric"
                value={leadInput}
                onChange={(e) => setLeadInput(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vendor-notes">Notas (opcional)</Label>
            <Textarea
              id="vendor-notes"
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value.trim() || null }))}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="vendor-active">Activo</Label>
            <Switch
              id="vendor-active"
              checked={form.isActive ?? true}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
            />
          </div>

          {/* TODO Phase 2: per-product vendor pricing (vendor_product_pricing) attaches here
              as a section/tab — vendor SKU, unit cost, MOQ, pack size, preferred flag. */}
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
