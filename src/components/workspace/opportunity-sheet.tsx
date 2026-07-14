"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { fetchCustomerDetailViaProxy, fetchCustomersViaProxy, fetchSellersViaProxy } from "@/lib/dashboard-customers";
import {
  createLeadViaProxy,
  fetchLeadsViaProxy,
  formatMoney,
  type LeadRow,
} from "@/lib/dashboard-quotes";
import {
  createOpportunityViaProxy,
  fetchOpportunityViaProxy,
  updateOpportunityViaProxy,
  type BusinessType,
  type OpportunityPayload,
  type PipelineStage,
} from "@/lib/dashboard-pipeline";
import { fetchProductsViaProxy, type DashboardProductRow } from "@/lib/dashboard-products";

type ContactMode = "new_lead" | "existing_lead" | "customer";

type ItemRow = {
  key: string;
  productId: number | null;
  productName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

function newItem(): ItemRow {
  return {
    key: crypto.randomUUID(),
    productId: null,
    productName: "",
    quantity: "1",
    unit: "unit",
    unitPrice: "",
  };
}

function lineTotal(quantity: string, unitPrice: string): number {
  const q = Number(quantity) || 0;
  const p = Number(unitPrice);
  if (!Number.isFinite(p)) return 0;
  return Math.round(q * p * 100) / 100;
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
  const [contactMode, setContactMode] = useState<ContactMode>("new_lead");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [leadId, setLeadId] = useState<number | null>(null);

  const [leadName, setLeadName] = useState("");
  const [leadPoc, setLeadPoc] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadLocation, setLeadLocation] = useState("");

  const [stageKey, setStageKey] = useState("backlog");
  const [businessTypeKey, setBusinessTypeKey] = useState<string>("");
  const [assignedSellerId, setAssignedSellerId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [ordersPerMonth, setOrdersPerMonth] = useState("1");
  const [items, setItems] = useState<ItemRow[]>([newItem()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [customers, setCustomers] = useState<Array<{ customerId: number; name: string }>>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [products, setProducts] = useState<DashboardProductRow[]>([]);
  const [sellers, setSellers] = useState<Array<{ sellerId: number; name: string }>>([]);

  const defaultStageKey = stages[0]?.key ?? "backlog";
  const currency = "CRC";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const [c, l, p, s] = await Promise.all([
        fetchCustomersViaProxy().catch(() => null),
        fetchLeadsViaProxy().catch(() => []),
        fetchProductsViaProxy().catch(() => []),
        fetchSellersViaProxy().catch(() => []),
      ]);
      if (cancelled) return;
      setCustomers((c ?? []).map((x) => ({ customerId: x.customerId, name: x.name })));
      setLeads(l);
      setProducts(p);
      setSellers(s.filter((row) => row.active).map((row) => ({ sellerId: row.sellerId, name: row.name })));
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    if (!opportunityId) {
      setContactMode("new_lead");
      setCustomerId(null);
      setLeadId(null);
      setLeadName("");
      setLeadPoc("");
      setLeadEmail("");
      setLeadLocation("");
      setStageKey(defaultStageKey);
      setBusinessTypeKey("");
      setAssignedSellerId(null);
      setNotes("");
      setOrdersPerMonth("1");
      setItems([newItem()]);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchOpportunityViaProxy(opportunityId)
      .then((o) => {
        if (cancelled || !o) return;
        if (o.partyType === "customer") {
          setContactMode("customer");
          setCustomerId(o.customerId);
          setLeadId(null);
        } else if (o.partyType === "lead") {
          setContactMode("existing_lead");
          setLeadId(o.leadId);
          setCustomerId(null);
        } else {
          setContactMode("new_lead");
          setLeadName(o.name);
          setLeadLocation(o.location ?? "");
        }
        setStageKey(o.stageKey);
        setBusinessTypeKey(o.businessTypeKey ?? "");
        setAssignedSellerId(o.assignedSellerId);
        setNotes(o.notes);
        setOrdersPerMonth(String(o.ordersPerMonth ?? 1));
        setItems(
          o.items.length > 0
            ? o.items.map((it) => ({
                key: it.opportunityItemId,
                productId: it.productId,
                productName: it.productName ?? it.rawText,
                quantity: it.quantity,
                unit: it.unit,
                unitPrice: "",
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

  useEffect(() => {
    if (!opportunityId || products.length === 0) return;
    setItems((prev) =>
      prev.map((it) => {
        if (it.unitPrice.trim() !== "" || it.productId == null) return it;
        const p = productById.get(it.productId);
        return p?.price != null ? { ...it, unitPrice: String(p.price) } : it;
      }),
    );
  }, [opportunityId, products, productById]);

  useEffect(() => {
    if (!leadId || contactMode !== "existing_lead") return;
    const lead = leads.find((l) => l.leadId === leadId);
    if (!lead) return;
    setLeadName(lead.name);
    setLeadPoc(lead.legalName ?? "");
    setLeadEmail(lead.email ?? "");
    setLeadLocation(lead.city ?? "");
  }, [leadId, leads, contactMode]);

  const orderSubtotal = useMemo(
    () =>
      Math.round(
        items.reduce((sum, it) => sum + lineTotal(it.quantity, it.unitPrice), 0) * 100,
      ) / 100,
    [items],
  );

  const ordersPerMonthNum = Math.max(1, Math.trunc(Number(ordersPerMonth) || 1));

  const monthlyTotal = useMemo(
    () => Math.round(orderSubtotal * ordersPerMonthNum * 100) / 100,
    [orderSubtotal, ordersPerMonthNum],
  );

  function patchItem(key: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  }

  function onSelectProduct(key: string, productId: number) {
    const p = productById.get(productId);
    patchItem(key, {
      productId,
      productName: p?.name ?? "",
      unit: p?.unit ?? "unit",
      unitPrice: p?.price != null ? String(p.price) : "",
    });
  }

  function onCustomerChange(value: string) {
    const id = Number(value);
    setCustomerId(id);
    void fetchCustomerDetailViaProxy(id).then((detail) => {
      if (detail) setAssignedSellerId(detail.assignedSellerId);
    });
  }

  function buildPayload(partyType: OpportunityPayload["partyType"], resolvedLeadId: number | null): OpportunityPayload {
    return {
      partyType,
      customerId: partyType === "customer" ? customerId : null,
      leadId: partyType === "lead" ? resolvedLeadId : null,
      name: partyType === "none" ? leadName.trim() : undefined,
      stageKey,
      businessTypeKey: businessTypeKey || null,
      location: leadLocation.trim() || null,
      ordersPerMonth: ordersPerMonthNum,
      monthlyRecurringValue: monthlyTotal,
      notes: notes.trim(),
      assignedSellerId,
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

    if (contactMode === "customer" && customerId == null) {
      toast.error("Seleccioná un cliente.");
      return;
    }
    if (contactMode === "existing_lead" && leadId == null) {
      toast.error("Seleccioná un prospecto.");
      return;
    }
    if (contactMode === "new_lead" && !leadName.trim()) {
      toast.error("Ingresá el nombre del prospecto.");
      return;
    }

    const validItems = items.filter((it) => it.productId != null || it.productName.trim());
    if (validItems.length === 0) {
      toast.error("Agregá al menos un producto.");
      return;
    }
    if (!Number.isFinite(Number(ordersPerMonth)) || ordersPerMonthNum < 1) {
      toast.error("Ingresá al menos 1 pedido por mes.");
      return;
    }

    setSaving(true);
    try {
      let resolvedLeadId = leadId;
      if (contactMode === "new_lead") {
        resolvedLeadId = await createLeadViaProxy({
          name: leadName.trim(),
          legalName: leadPoc.trim() || null,
          email: leadEmail.trim() || null,
          city: leadLocation.trim() || null,
          source: "pipeline",
        });
      }

      const partyType: OpportunityPayload["partyType"] =
        contactMode === "customer" ? "customer" : "lead";
      const payload = buildPayload(partyType, resolvedLeadId);

      if (opportunityId) await updateOpportunityViaProxy(opportunityId, payload);
      else await createOpportunityViaProxy(payload);

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
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle>{opportunityId ? "Editar oportunidad" : "Nueva oportunidad"}</SheetTitle>
          </SheetHeader>

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Prospecto</CardTitle>
                    <CardDescription>Datos del lead antes de crear la oportunidad</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Tipo</Label>
                      <Select
                        value={contactMode}
                        onValueChange={(v) => {
                          setContactMode(v as ContactMode);
                          setCustomerId(null);
                          setLeadId(null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new_lead">Nuevo prospecto</SelectItem>
                          <SelectItem value="existing_lead">Prospecto existente</SelectItem>
                          <SelectItem value="customer">Cliente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {contactMode === "customer" ? (
                      <div className="space-y-1.5">
                        <Label>Cliente</Label>
                        <Select
                          value={customerId != null ? String(customerId) : ""}
                          onValueChange={onCustomerChange}
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
                    ) : contactMode === "existing_lead" ? (
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
                    ) : null}

                    {contactMode !== "customer" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor="lead-name">Nombre del prospecto</Label>
                          <Input
                            id="lead-name"
                            placeholder="Ej. Restaurante La Esquina"
                            value={leadName}
                            onChange={(e) => setLeadName(e.target.value)}
                            readOnly={contactMode === "existing_lead"}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="lead-poc">Persona de contacto (POC)</Label>
                          <Input
                            id="lead-poc"
                            placeholder="Ej. María González"
                            value={leadPoc}
                            onChange={(e) => setLeadPoc(e.target.value)}
                            readOnly={contactMode === "existing_lead"}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="lead-email">Correo</Label>
                          <Input
                            id="lead-email"
                            inputMode="email"
                            placeholder="contacto@negocio.com"
                            type="email"
                            value={leadEmail}
                            onChange={(e) => setLeadEmail(e.target.value)}
                            readOnly={contactMode === "existing_lead"}
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor="lead-location">Ubicación</Label>
                          <Input
                            id="lead-location"
                            placeholder="Ciudad, dirección o zona"
                            value={leadLocation}
                            onChange={(e) => setLeadLocation(e.target.value)}
                            readOnly={contactMode === "existing_lead"}
                          />
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
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
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Vendedor</Label>
                      <Select
                        value={assignedSellerId != null ? String(assignedSellerId) : "none"}
                        onValueChange={(v) =>
                          setAssignedSellerId(v === "none" ? null : Number(v))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sin vendedor asignado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin vendedor</SelectItem>
                          {sellers.map((seller) => (
                            <SelectItem key={seller.sellerId} value={String(seller.sellerId)}>
                              {seller.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">Productos</CardTitle>
                      <CardDescription>
                        Total por pedido × pedidos por mes = total mensual proyectado
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => setItems((p) => [...p, newItem()])}
                    >
                      <Plus className="size-4" />
                      Agregar
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead className="min-w-48">Producto</TableHead>
                            <TableHead className="w-24 text-right">Cant.</TableHead>
                            <TableHead className="w-32 text-right">Precio</TableHead>
                            <TableHead className="w-32 text-right">Importe</TableHead>
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((it, idx) => {
                            const total = lineTotal(it.quantity, it.unitPrice);
                            return (
                              <TableRow key={it.key}>
                                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell>
                                  <Select
                                    value={it.productId != null ? String(it.productId) : ""}
                                    onValueChange={(v) => onSelectProduct(it.key, Number(v))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccioná producto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products.map((p) => (
                                        <SelectItem key={p.productId} value={String(p.productId)}>
                                          {p.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="text-right"
                                    inputMode="decimal"
                                    value={it.quantity}
                                    onChange={(e) =>
                                      patchItem(it.key, { quantity: e.target.value })
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="text-right"
                                    inputMode="decimal"
                                    placeholder="Auto"
                                    value={it.unitPrice}
                                    onChange={(e) =>
                                      patchItem(it.key, { unitPrice: e.target.value })
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-right font-medium tabular-nums">
                                  {formatMoney(total, currency)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    aria-label="Eliminar"
                                    size="icon"
                                    type="button"
                                    variant="ghost"
                                    onClick={() =>
                                      setItems((prev) =>
                                        prev.length > 1
                                          ? prev.filter((x) => x.key !== it.key)
                                          : prev,
                                      )
                                    }
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={4} className="text-right text-muted-foreground">
                              Total por pedido
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatMoney(orderSubtotal, currency)}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={4} className="text-right font-medium">
                              Pedidos por mes
                            </TableCell>
                            <TableCell>
                              <Input
                                className="text-right"
                                inputMode="numeric"
                                min={1}
                                value={ordersPerMonth}
                                onChange={(e) => setOrdersPerMonth(e.target.value)}
                              />
                            </TableCell>
                            <TableCell />
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={4} className="text-right font-semibold">
                              Total mensual
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatMoney(monthlyTotal, currency)}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-1.5">
                  <Label htmlFor="opp-notes">Notas</Label>
                  <Textarea
                    id="opp-notes"
                    placeholder="Contexto adicional sobre la oportunidad…"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <Separator />
              <div className="shrink-0 border-t bg-background px-6 py-4">
                <Button className="w-full" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Guardar oportunidad
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
