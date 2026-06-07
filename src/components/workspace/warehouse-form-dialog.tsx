"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { fetchCustomersViaProxy, type DashboardCustomerRow } from "@/lib/dashboard-customers";
import {
  createWarehouseViaProxy,
  fetchWarehouseCustomersViaProxy,
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
  isCustomerRestricted: false,
  restrictionStrict: false,
  allowedCustomerIds: [],
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
  const [customers, setCustomers] = useState<DashboardCustomerRow[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    void fetchCustomersViaProxy().then((rows) => setCustomers(rows ?? []));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      void (async () => {
        const allowedFromList = initial.allowedCustomers ?? [];
        const allowedCustomerIds =
          initial.allowedCustomerIds ??
          allowedFromList.map((c) => c.customerId) ??
          (initial.isCustomerRestricted
            ? (await fetchWarehouseCustomersViaProxy(initial.warehouseId)).map((c) => c.customerId)
            : []);
        setForm({
          name: initial.name,
          code: initial.code,
          kind: initial.kind === "virtual" ? "virtual" : "physical",
          purpose: (initial.purpose as WarehousePurpose) ?? "none",
          isSellable: initial.isSellable,
          countsForReorder: initial.countsForReorder,
          isDefault: initial.isDefault,
          address: null,
          isCustomerRestricted: initial.isCustomerRestricted,
          restrictionStrict: initial.restrictionStrict,
          allowedCustomerIds,
        });
      })();
    } else {
      setForm(EMPTY_FORM);
      setCustomerSearch("");
    }
  }, [open, initial]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.clientCode?.toLowerCase().includes(q) ?? false),
    );
  }, [customers, customerSearch]);

  const selectedIds = form.allowedCustomerIds ?? [];

  function toggleCustomer(customerId: number, checked: boolean) {
    setForm((f) => {
      const current = new Set(f.allowedCustomerIds ?? []);
      if (checked) current.add(customerId);
      else current.delete(customerId);
      return { ...f, allowedCustomerIds: [...current] };
    });
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    if (form.isCustomerRestricted && (form.allowedCustomerIds?.length ?? 0) === 0) {
      toast.error("Seleccioná al menos un cliente para una bodega reservada.");
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
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
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

          <div className="space-y-3 rounded-lg border p-3">
            <p className="font-medium text-sm">Inventario reservado por cliente</p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="wh-restricted">Reservar para clientes específicos</Label>
                <p className="text-muted-foreground text-xs">
                  Solo estos clientes podrán comprar el stock de esta bodega.
                </p>
              </div>
              <Switch
                id="wh-restricted"
                checked={form.isCustomerRestricted ?? false}
                onCheckedChange={(checked) =>
                  setForm((f) => ({
                    ...f,
                    isCustomerRestricted: checked,
                    restrictionStrict: checked ? f.restrictionStrict : false,
                    allowedCustomerIds: checked ? (f.allowedCustomerIds ?? []) : [],
                  }))
                }
              />
            </div>

            {form.isCustomerRestricted ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="wh-customer-search">Clientes permitidos</Label>
                  <Input
                    id="wh-customer-search"
                    placeholder="Buscar cliente…"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                  {selectedIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedIds.map((id) => {
                        const customer = customers.find((c) => c.customerId === id);
                        return (
                          <Badge key={id} className="gap-1 pr-1" variant="secondary">
                            {customer?.name ?? `#${id}`}
                            <button
                              aria-label={`Quitar ${customer?.name ?? id}`}
                              className="rounded-sm hover:bg-muted"
                              type="button"
                              onClick={() => toggleCustomer(id, false)}
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
                    {filteredCustomers.length === 0 ? (
                      <p className="text-muted-foreground text-xs">No hay clientes.</p>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <label
                          key={customer.customerId}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={selectedIds.includes(customer.customerId)}
                            onCheckedChange={(checked) =>
                              toggleCustomer(customer.customerId, checked === true)
                            }
                          />
                          <span>{customer.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="wh-strict">Solo estos clientes (estricto)</Label>
                    <p className="text-muted-foreground text-xs">
                      Si está activo, estos clientes solo usarán esta bodega (no tomarán del
                      inventario general).
                    </p>
                  </div>
                  <Switch
                    id="wh-strict"
                    checked={form.restrictionStrict ?? false}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, restrictionStrict: checked }))
                    }
                  />
                </div>
              </>
            ) : null}
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
