"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { fetchCustomersViaProxy } from "@/lib/dashboard-customers";
import {
  fetchProductsViaProxy,
  type DashboardProductRow,
} from "@/lib/dashboard-products";
import {
  createLeadViaProxy,
  createQuoteViaProxy,
  fetchLeadsViaProxy,
  formatMoney,
  updateQuoteViaProxy,
  type CreateQuotePayload,
  type LeadRow,
  type QuoteWithItems,
} from "@/lib/dashboard-quotes";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
} from "@/lib/workspace-layout";

type RecipientType = "customer" | "lead";

type FormLine = {
  key: string;
  productId: number | null;
  productName: string;
  rawText: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discountPct: string;
};

type CustomerOption = { customerId: number; name: string };

function newLine(): FormLine {
  return {
    key: crypto.randomUUID(),
    productId: null,
    productName: "",
    rawText: "",
    quantity: "1",
    unit: "unit",
    unitPrice: "",
    discountPct: "0",
  };
}

function computeLine(qty: string, price: string, disc: string) {
  const q = Number(qty) || 0;
  const p = Number(price);
  const d = Math.max(0, Math.min(100, Number(disc) || 0));
  if (!Number.isFinite(p)) return { subtotal: 0, discount: 0, total: 0 };
  const subtotal = Math.round(p * q * 100) / 100;
  const discount = Math.round(subtotal * (d / 100) * 100) / 100;
  const total = Math.round((subtotal - discount) * 100) / 100;
  return { subtotal, discount, total };
}

function lineMarginPct(unitPrice: string, cost: string | null | undefined): number | null {
  const price = Number(unitPrice);
  const costNum = cost != null && cost.trim() !== "" ? Number(cost) : null;
  if (!Number.isFinite(price) || price <= 0 || costNum == null || !Number.isFinite(costNum)) {
    return null;
  }
  return Math.round(((price - costNum) / price) * 10_000) / 100;
}

function formatMarginPct(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

export function QuoteForm({
  mode,
  initial,
}: Readonly<{
  mode: "create" | "edit";
  initial?: QuoteWithItems;
}>) {
  const router = useRouter();
  const cancelHref = mode === "create" ? "/quotes" : `/quotes/${initial?.quoteId ?? ""}`;

  const [recipientType, setRecipientType] = useState<RecipientType>(
    initial?.recipientType ?? "customer",
  );
  const [customerId, setCustomerId] = useState<number | null>(initial?.customerId ?? null);
  const [leadId, setLeadId] = useState<number | null>(initial?.leadId ?? null);
  const [quoteDate, setQuoteDate] = useState(
    initial?.quoteDate ?? new Date().toISOString().slice(0, 10),
  );
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms ?? "");
  const [terms, setTerms] = useState(initial?.termsAndConditions ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const currency = initial?.currency ?? "CRC";
  const [showMargin, setShowMargin] = useState(false);

  const [lines, setLines] = useState<FormLine[]>(
    initial
      ? initial.items.map((it) => ({
          key: it.quoteItemId,
          productId: it.productId,
          productName: it.productName ?? it.rawText,
          rawText: it.rawText,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice ?? "",
          discountPct: it.discountPct,
        }))
      : [newLine()],
  );

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [products, setProducts] = useState<DashboardProductRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");

  useEffect(() => {
    void (async () => {
      const [cust, ld, prod] = await Promise.all([
        fetchCustomersViaProxy().catch(() => null),
        fetchLeadsViaProxy().catch(() => []),
        fetchProductsViaProxy().catch(() => []),
      ]);
      setCustomers(
        (cust ?? []).map((c) => ({
          customerId: c.customerId,
          name: c.name,
        })),
      );
      setLeads(ld);
      setProducts(prod);
    })();
  }, []);

  const productById = useMemo(() => {
    const m = new Map<number, DashboardProductRow>();
    for (const p of products) m.set(p.productId, p);
    return m;
  }, [products]);

  const totals = useMemo(() => {
    let totalQty = 0;
    let subtotal = 0;
    let discountTotal = 0;
    for (const l of lines) {
      const c = computeLine(l.quantity, l.unitPrice, l.discountPct);
      totalQty += Number(l.quantity) || 0;
      subtotal = Math.round((subtotal + c.subtotal) * 100) / 100;
      discountTotal = Math.round((discountTotal + c.discount) * 100) / 100;
    }
    return {
      totalQty,
      subtotal,
      discountTotal,
      netTotal: Math.round((subtotal - discountTotal) * 100) / 100,
    };
  }, [lines]);

  function patchLine(key: string, patch: Partial<FormLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function onSelectProduct(key: string, productId: number) {
    const p = productById.get(productId);
    patchLine(key, {
      productId,
      productName: p?.name ?? "",
      rawText: p?.name ?? "",
      unit: p?.unit ?? "unit",
      unitPrice: p?.price != null ? String(p.price) : "",
    });
  }

  async function handleCreateLead() {
    const name = newLeadName.trim();
    if (!name) return;
    try {
      const id = await createLeadViaProxy({ name });
      const refreshed = await fetchLeadsViaProxy();
      setLeads(refreshed);
      setLeadId(id);
      setNewLeadName("");
      toast.success("Prospecto creado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el prospecto.");
    }
  }

  function buildPayload(): CreateQuotePayload | null {
    if (recipientType === "customer" && customerId == null) {
      toast.error("Seleccioná un cliente.");
      return null;
    }
    if (recipientType === "lead" && leadId == null) {
      toast.error("Seleccioná o creá un prospecto.");
      return null;
    }
    const payloadLines = lines
      .filter((l) => l.productId != null || l.rawText.trim().length > 0)
      .map((l) => ({
        productId: l.productId,
        rawText: l.rawText.trim() || l.productName.trim(),
        productName: l.productName.trim() || null,
        quantity: Number(l.quantity) || 0,
        unit: l.unit.trim() || "unit",
        unitPrice: l.unitPrice.trim() === "" ? null : Number(l.unitPrice),
        discountPct: Number(l.discountPct) || 0,
      }));
    if (payloadLines.length === 0) {
      toast.error("Agregá al menos una línea.");
      return null;
    }
    return {
      recipientType,
      customerId: recipientType === "customer" ? customerId : null,
      leadId: recipientType === "lead" ? leadId : null,
      quoteDate,
      validUntil: validUntil || null,
      currency,
      paymentTerms,
      termsAndConditions: terms,
      notes,
      lines: payloadLines,
    };
  }

  async function handleSave() {
    const payload = buildPayload();
    if (!payload || saving) return;
    setSaving(true);
    try {
      if (mode === "create") {
        const created = await createQuoteViaProxy(payload);
        toast.success("Cotización creada");
        router.push(`/quotes/${created.quoteId}`);
      } else if (initial) {
        await updateQuoteViaProxy(initial.quoteId, payload);
        toast.success("Cotización actualizada");
        router.push(`/quotes/${initial.quoteId}`);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "create" ? "Nueva cotización" : "Editar cotización";
  const subtitle =
    mode === "create"
      ? "Armá una cotización para un cliente o prospecto"
      : "Actualizá los datos de la cotización";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <div
        className={cn(
          workspaceContentOuterClassName,
          "flex flex-1 flex-col gap-6 pb-28 pt-6 md:pt-8",
        )}
      >
        <div className={cn(workspaceContentInnerClassName, "flex flex-col gap-6")}>
      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight text-foreground">{title}</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild type="button" variant="outline">
            <Link href={cancelHref}>Cancelar</Link>
          </Button>
          <Button disabled={saving} type="button" onClick={() => void handleSave()}>
            {saving ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la cotización</CardTitle>
          <CardDescription>Cliente, fechas y numeración</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Serie</Label>
            <Input disabled value="COT-AAAA-###" />
            <p className="text-muted-foreground text-xs">
              El número se asigna automáticamente al enviar la cotización.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quote-date">Fecha</Label>
            <Input
              id="quote-date"
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="valid-until">Válida hasta</Label>
            <Input
              id="valid-until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cotizar a</Label>
            <Select
              value={recipientType}
              onValueChange={(v) => {
                setRecipientType(v as RecipientType);
                setCustomerId(null);
                setLeadId(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Cliente</SelectItem>
                <SelectItem value="lead">Prospecto (lead)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recipientType === "customer" ? (
            <div className="space-y-1.5 sm:col-span-2">
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
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
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
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Nombre del nuevo prospecto"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={() => void handleCreateLead()}>
                  Crear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">Productos</CardTitle>
            <CardDescription>Líneas, precios y descuentos</CardDescription>
          </div>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setLines((prev) => [...prev, newLine()])}
          >
            <Plus className="size-4" />
            Agregar línea
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead className="min-w-56">Producto</TableHead>
                  <TableHead className="w-24 text-right">Cantidad</TableHead>
                  <TableHead className="w-32 text-right">Precio</TableHead>
                  {showMargin ? (
                    <TableHead className="w-24 text-right">Margen</TableHead>
                  ) : null}
                  <TableHead className="w-24 text-right">Desc. %</TableHead>
                  <TableHead className="w-32 text-right">Importe</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l, idx) => {
                  const c = computeLine(l.quantity, l.unitPrice, l.discountPct);
                  const product = l.productId != null ? productById.get(l.productId) : undefined;
                  const margin = lineMarginPct(l.unitPrice, product?.cost);
                  return (
                    <TableRow key={l.key}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <Select
                          value={l.productId != null ? String(l.productId) : ""}
                          onValueChange={(v) => onSelectProduct(l.key, Number(v))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccioná un producto" />
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
                          value={l.quantity}
                          onChange={(e) => patchLine(l.key, { quantity: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="text-right"
                          inputMode="decimal"
                          placeholder="Auto"
                          value={l.unitPrice}
                          onChange={(e) => patchLine(l.key, { unitPrice: e.target.value })}
                        />
                      </TableCell>
                      {showMargin ? (
                        <TableCell
                          className={cn(
                            "text-right tabular-nums text-sm",
                            margin != null && margin < 0 ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {formatMarginPct(margin)}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Input
                          className="text-right"
                          inputMode="decimal"
                          value={l.discountPct}
                          onChange={(e) => patchLine(l.key, { discountPct: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(c.total, currency)}
                      </TableCell>
                      <TableCell>
                        <Button
                          aria-label="Eliminar línea"
                          size="icon"
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setLines((prev) =>
                              prev.length > 1 ? prev.filter((x) => x.key !== l.key) : prev,
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
            </Table>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-sm text-muted-foreground text-xs">
              Los totales no incluyen impuestos (IVA se agregará con facturación).
            </p>
            <dl className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Cantidad total</dt>
                <dd className="tabular-nums">{totals.totalQty}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(totals.subtotal, currency)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Descuentos</dt>
                <dd className="tabular-nums">- {formatMoney(totals.discountTotal, currency)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t pt-1 font-semibold">
                <dt>Total neto</dt>
                <dd className="tabular-nums">{formatMoney(totals.netTotal, currency)}</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Términos y notas</CardTitle>
          <CardDescription>Condiciones visibles para el cliente y notas internas</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="payment-terms">Términos de pago</Label>
            <Textarea
              id="payment-terms"
              rows={3}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="terms">Términos y condiciones</Label>
            <Textarea
              id="terms"
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notas internas</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
        </div>
      </div>

      <footer
        className={cn(
          "sticky bottom-0 flex shrink-0 flex-col gap-3 border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80 sm:flex-row sm:items-center sm:justify-between",
          workspaceContentOuterClassName,
        )}
      >
        <p className="text-muted-foreground text-xs">
          {mode === "create"
            ? "La cotización se guardará como borrador hasta que la envíes."
            : "Los cambios se guardan en el borrador actual."}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant={showMargin ? "secondary" : "outline"}
            onClick={() => setShowMargin((v) => !v)}
          >
            {showMargin ? "Ocultar margen" : "Ver margen"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href={cancelHref}>Cancelar</Link>
          </Button>
          <Button disabled={saving} type="button" onClick={() => void handleSave()}>
            {saving ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
