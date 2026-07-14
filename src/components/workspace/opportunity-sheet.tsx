"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { fetchCustomersViaProxy } from "@/lib/dashboard-customers";
import { fetchLeadsViaProxy, type LeadRow } from "@/lib/dashboard-quotes";
import {
  createOpportunityViaProxy,
  fetchOpportunityViaProxy,
  updateOpportunityViaProxy,
  type BusinessType,
  type OpportunityPayload,
  type PipelineStage,
} from "@/lib/dashboard-pipeline";
import { fetchProductsViaProxy, type DashboardProductRow } from "@/lib/dashboard-products";

type PartyType = "customer" | "lead" | "none";
type ItemRow = {
  key: string;
  productId: number | null;
  productName: string;
  quantity: string;
  unit: string;
};

function newItem(): ItemRow {
  return { key: crypto.randomUUID(), productId: null, productName: "", quantity: "1", unit: "unit" };
}

export function OpportunitySheet({
  open,
  opportunityId,
  stages,
  businessTypes,
  onOpenChange,
  onSaved,
}: Readonly<{
  open: boolean;
  opportunityId: string | null;
  stages: PipelineStage[];
  businessTypes: BusinessType[];
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}>) {
  const [partyType, setPartyType] = useState<PartyType>("none");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [leadId, setLeadId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [stageKey, setStageKey] = useState("backlog");
  const [businessTypeKey, setBusinessTypeKey] = useState<string>("");
  const [location, setLocation] = useState("");
  const [monthly, setMonthly] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([newItem()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [customers, setCustomers] = useState<Array<{ customerId: number; name: string }>>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [products, setProducts] = useState<DashboardProductRow[]>([]);

  const defaultStageKey = stages[0]?.key ?? "backlog";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const [c, l, p] = await Promise.all([
        fetchCustomersViaProxy().catch(() => null),
        fetchLeadsViaProxy().catch(() => []),
        fetchProductsViaProxy().catch(() => []),
      ]);
      if (cancelled) return;
      setCustomers((c ?? []).map((x) => ({ customerId: x.customerId, name: x.name })));
      setLeads(l);
      setProducts(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    if (!opportunityId) {
      setPartyType("none");
      setCustomerId(null);
      setLeadId(null);
      setName("");
      setStageKey(defaultStageKey);
      setBusinessTypeKey("");
      setLocation("");
      setMonthly("0");
      setNotes("");
      setItems([newItem()]);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchOpportunityViaProxy(opportunityId)
      .then((o) => {
        if (cancelled || !o) return;
        setPartyType(o.partyType);
        setCustomerId(o.customerId);
        setLeadId(o.leadId);
        setName(o.name);
        setStageKey(o.stageKey);
        setBusinessTypeKey(o.businessTypeKey ?? "");
        setLocation(o.location ?? "");
        setMonthly(o.monthlyRecurringValue);
        setNotes(o.notes);
        setItems(
          o.items.length > 0
            ? o.items.map((it) => ({
                key: it.opportunityItemId,
                productId: it.productId,
                productName: it.productName ?? it.rawText,
                quantity: it.quantity,
                unit: it.unit,
              }))
            : [newItem()],
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, opportunityId, defaultStageKey]);

  const productById = useMemo(() => {
    const m = new Map<number, DashboardProductRow>();
    for (const p of products) m.set(p.productId, p);
    return m;
  }, [products]);

  function buildPayload(): OpportunityPayload {
    return {
      partyType,
      customerId: partyType === "customer" ? customerId : null,
      leadId: partyType === "lead" ? leadId : null,
      name: name.trim(),
      stageKey,
      businessTypeKey: businessTypeKey || null,
      location: location.trim() || null,
      monthlyRecurringValue: Number(monthly) || 0,
      notes: notes.trim(),
      items: items
        .filter((it) => it.productId != null || it.productName.trim())
        .map((it) => ({
          productId: it.productId,
          productName: it.productName.trim() || null,
          rawText: it.productName.trim(),
          quantity: Number(it.quantity) || 0,
          unit: it.unit.trim() || "unit",
        })),
    };
  }

  async function handleSave() {
    if (saving) return;
    if (partyType === "none" && !name.trim()) {
      toast.error("Ingresá un nombre o seleccioná un cliente/prospecto.");
      return;
    }
    if (partyType === "customer" && customerId == null) {
      toast.error("Seleccioná un cliente.");
      return;
    }
    if (partyType === "lead" && leadId == null) {
      toast.error("Seleccioná un prospecto.");
      return;
    }
    setSaving(true);
    try {
      if (opportunityId) await updateOpportunityViaProxy(opportunityId, buildPayload());
      else await createOpportunityViaProxy(buildPayload());
      toast.success(opportunityId ? "Oportunidad actualizada" : "Oportunidad creada");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{opportunityId ? "Editar oportunidad" : "Nueva oportunidad"}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo de contacto</Label>
              <Select value={partyType} onValueChange={(v) => setPartyType(v as PartyType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Cliente</SelectItem>
                  <SelectItem value="lead">Prospecto</SelectItem>
                  <SelectItem value="none">Otro (nombre libre)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {partyType === "customer" ? (
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select
                  value={customerId != null ? String(customerId) : ""}
                  onValueChange={(v) => setCustomerId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.customerId} value={String(c.customerId)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : partyType === "lead" ? (
              <div className="space-y-1.5">
                <Label>Prospecto</Label>
                <Select
                  value={leadId != null ? String(leadId) : ""}
                  onValueChange={(v) => setLeadId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná un prospecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l.leadId} value={String(l.leadId)}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="opp-name">Nombre</Label>
                <Input id="opp-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Etapa</Label>
                <Select value={stageKey} onValueChange={setStageKey}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de negocio</Label>
                <Select
                  value={businessTypeKey || undefined}
                  onValueChange={setBusinessTypeKey}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map((b) => (
                      <SelectItem key={b.key} value={b.key}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="opp-location">Ubicación</Label>
                <Input
                  id="opp-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="opp-monthly">Compra recurrente/mes</Label>
                <Input
                  id="opp-monthly"
                  inputMode="decimal"
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Productos</Label>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setItems((p) => [...p, newItem()])}
                >
                  <Plus className="size-4" /> Agregar
                </Button>
              </div>
              {items.map((it) => (
                <div key={it.key} className="flex items-center gap-2">
                  <Select
                    value={it.productId != null ? String(it.productId) : ""}
                    onValueChange={(v) => {
                      const p = productById.get(Number(v));
                      setItems((prev) =>
                        prev.map((x) =>
                          x.key === it.key
                            ? {
                                ...x,
                                productId: Number(v),
                                productName: p?.name ?? "",
                                unit: p?.unit ?? "unit",
                              }
                            : x,
                        ),
                      );
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.productId} value={String(p.productId)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-20 text-right"
                    inputMode="decimal"
                    value={it.quantity}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x) =>
                          x.key === it.key ? { ...x, quantity: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <Button
                    aria-label="Eliminar"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setItems((prev) =>
                        prev.length > 1 ? prev.filter((x) => x.key !== it.key) : prev,
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opp-notes">Notas</Label>
              <Textarea
                id="opp-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button className="w-full" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        )}
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
