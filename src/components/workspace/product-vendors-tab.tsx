"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2, MoreHorizontal, Pencil, Plus, Star, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { InfoTip } from "@/components/workspace/info-tip";
import { formatMoneyCRC } from "@/lib/batch-format";
import { fetchVendorsViaProxy, type DashboardVendorRow } from "@/lib/inventory";
import {
  deleteProductVendorPricingViaProxy,
  fetchProductVendorPricingViaProxy,
  preferProductVendorPricingViaProxy,
  upsertProductVendorPricingViaProxy,
  type ProductVendorPricingRow,
} from "@/lib/product-vendor-pricing";
import { workspaceTableCardClassName } from "@/lib/workspace-layout";

const VENDOR_FIELD_TOOLTIPS = {
  moq: "Cantidad mínima de pedido (Minimum Order Quantity): el proveedor exige comprar al menos esta cantidad por orden.",
  packSize:
    "Unidades por empaque (caja, bulto o paquete). Si aplica, las sugerencias de compra redondean a múltiplos de este tamaño.",
  leadTime:
    "Días que tarda el proveedor en entregar después de confirmar el pedido. Se usa para estimar fechas de llegada.",
} as const;

function OptionalFieldLabel({
  htmlFor,
  label,
  tooltip,
}: Readonly<{ htmlFor: string; label: string; tooltip: string }>) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <InfoTip label={label} text={tooltip} />
      <span className="text-muted-foreground text-xs">(opcional)</span>
    </div>
  );
}

function TableHeadWithTip({
  label,
  tooltip,
  className,
}: Readonly<{ label: string; tooltip: string; className?: string }>) {
  return (
    <TableHead className={className}>
      <span className="inline-flex items-center justify-end gap-1">
        {label}
        <InfoTip label={label} text={tooltip} />
      </span>
    </TableHead>
  );
}

type FormState = Readonly<{
  vendorId: string;
  vendorSku: string;
  unitCost: string;
  currency: string;
  minOrderQty: string;
  packSize: string;
  leadTimeDays: string;
  isPreferred: boolean;
}>;

const EMPTY_FORM: FormState = {
  vendorId: "",
  vendorSku: "",
  unitCost: "",
  currency: "CRC",
  minOrderQty: "",
  packSize: "",
  leadTimeDays: "",
  isPreferred: false,
};

function rowToForm(row: ProductVendorPricingRow): FormState {
  return {
    vendorId: String(row.vendorId),
    vendorSku: row.vendorSku ?? "",
    unitCost: String(row.unitCost),
    currency: row.currency ?? "CRC",
    minOrderQty: row.minOrderQty != null ? String(row.minOrderQty) : "",
    packSize: row.packSize != null ? String(row.packSize) : "",
    leadTimeDays: row.leadTimeDays != null ? String(row.leadTimeDays) : "",
    isPreferred: row.isPreferred,
  };
}

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function ProductVendorsTab({
  productId,
  canEdit,
  defaultCurrency = "CRC",
}: Readonly<{
  productId: number;
  canEdit: boolean;
  defaultCurrency?: string;
}>) {
  const [rows, setRows] = useState<ProductVendorPricingRow[] | null>(null);
  const [allVendors, setAllVendors] = useState<readonly DashboardVendorRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductVendorPricingRow | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, currency: defaultCurrency });
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductVendorPricingRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [pricing, vendors] = await Promise.all([
        fetchProductVendorPricingViaProxy(productId),
        fetchVendorsViaProxy(),
      ]);
      setRows(pricing);
      setAllVendors(vendors.filter((v) => v.isActive));
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los proveedores.");
      setRows(null);
      setLoaded(true);
    }
  }, [productId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const linkedVendorIds = useMemo(
    () => new Set((rows ?? []).map((r) => r.vendorId)),
    [rows],
  );

  const availableVendors = useMemo(() => {
    if (editTarget) return allVendors;
    return allVendors.filter((v) => !linkedVendorIds.has(v.vendorId));
  }, [allVendors, editTarget, linkedVendorIds]);

  function openCreate() {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, currency: defaultCurrency });
    setFormOpen(true);
  }

  function openEdit(row: ProductVendorPricingRow) {
    setEditTarget(row);
    setForm(rowToForm(row));
    setFormOpen(true);
  }

  async function saveForm() {
    const vendorId = Number(form.vendorId);
    const unitCost = Number(form.unitCost);
    if (!Number.isFinite(vendorId) || vendorId < 1) {
      toast.error("Seleccioná un proveedor.");
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      toast.error("El costo unitario debe ser mayor a cero.");
      return;
    }

    setPending(true);
    try {
      const result = await upsertProductVendorPricingViaProxy(productId, vendorId, {
        vendorSku: form.vendorSku.trim() || null,
        unitCost,
        currency: form.currency.trim() || null,
        minOrderQty: parseOptionalNumber(form.minOrderQty),
        packSize: parseOptionalNumber(form.packSize),
        leadTimeDays: parseOptionalNumber(form.leadTimeDays),
        isPreferred: form.isPreferred,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editTarget ? "Proveedor actualizado." : "Proveedor agregado.");
      setFormOpen(false);
      await reload();
    } finally {
      setPending(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const result = await deleteProductVendorPricingViaProxy(productId, deleteTarget.vendorId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Proveedor quitado del producto.");
      setDeleteTarget(null);
      setRows(result.vendors);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function markPreferred(row: ProductVendorPricingRow) {
    const result = await preferProductVendorPricingViaProxy(productId, row.vendorId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${row.vendorName} marcado como preferido.`);
    setRows(result.vendors);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl space-y-1">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Empresas que venden o pueden vender este producto. Se usan en sugerencias de compra,
            órdenes de compra y conteos de inventario.
          </p>
          {allVendors.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay proveedores en el catálogo.{" "}
              <Link href="/compras" className="text-foreground underline underline-offset-2">
                Creá uno en Compras
              </Link>
              .
            </p>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button asChild type="button" size="sm" variant="outline" className="gap-2">
              <Link href="/compras">
                <Truck aria-hidden className="size-4" />
                Crear proveedor
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-2"
              disabled={availableVendors.length === 0 && !editTarget}
              onClick={openCreate}
            >
              <Plus aria-hidden className="size-4" />
              Agregar proveedor
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className={workspaceTableCardClassName}>
        {!loaded ? (
          <div className="flex items-center gap-2 p-6 text-muted-foreground text-sm">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Cargando proveedores…
          </div>
        ) : rows != null && rows.length === 0 && !error ? (
          <p className="p-6 text-muted-foreground text-sm">
            Este producto no tiene proveedores asignados.
          </p>
        ) : rows != null ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>SKU proveedor</TableHead>
                <TableHead className="text-right">Costo unitario</TableHead>
                <TableHeadWithTip
                  label="MOQ"
                  tooltip={VENDOR_FIELD_TOOLTIPS.moq}
                  className="text-right"
                />
                <TableHeadWithTip
                  label="Empaque"
                  tooltip={VENDOR_FIELD_TOOLTIPS.packSize}
                  className="text-right"
                />
                <TableHeadWithTip
                  label="Plazo (días)"
                  tooltip={VENDOR_FIELD_TOOLTIPS.leadTime}
                  className="text-right"
                />
                {canEdit ? <TableHead className="w-12" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.vendorId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{row.vendorName}</span>
                      {row.isPreferred ? (
                        <Badge variant="secondary" className="gap-1">
                          <Star aria-hidden className="size-3 fill-current" />
                          Preferido
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.vendorSku?.trim() || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyCRC(row.unitCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.minOrderQty ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.packSize ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.leadTimeDays ?? "—"}
                  </TableCell>
                  {canEdit ? (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal aria-hidden className="size-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(row)}>
                            <Pencil aria-hidden className="mr-2 size-4" />
                            Editar
                          </DropdownMenuItem>
                          {!row.isPreferred ? (
                            <DropdownMenuItem onClick={() => void markPreferred(row)}>
                              <Star aria-hidden className="mr-2 size-4" />
                              Marcar preferido
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 aria-hidden className="mr-2 size-4" />
                            Quitar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Editar proveedor del producto" : "Agregar proveedor al producto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="pv-vendor">Proveedor</Label>
                {!editTarget ? (
                  <Button asChild type="button" size="sm" variant="outline" className="h-8 gap-1.5">
                    <Link href="/compras">
                      <Truck aria-hidden className="size-3.5" />
                      Crear proveedor
                    </Link>
                  </Button>
                ) : null}
              </div>
              <Select
                value={form.vendorId || undefined}
                onValueChange={(v) => setForm((prev) => ({ ...prev, vendorId: v }))}
                disabled={editTarget != null}
              >
                <SelectTrigger id="pv-vendor">
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {(editTarget
                    ? allVendors.filter((v) => v.vendorId === editTarget.vendorId)
                    : availableVendors
                  ).map((v) => (
                    <SelectItem key={v.vendorId} value={String(v.vendorId)}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pv-cost">Costo unitario</Label>
                <Input
                  id="pv-cost"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={form.unitCost}
                  onChange={(e) => setForm((prev) => ({ ...prev, unitCost: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pv-currency">Moneda</Label>
                <Input
                  id="pv-currency"
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pv-sku">SKU del proveedor</Label>
              <Input
                id="pv-sku"
                value={form.vendorSku}
                onChange={(e) => setForm((prev) => ({ ...prev, vendorSku: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <OptionalFieldLabel
                  htmlFor="pv-moq"
                  label="MOQ"
                  tooltip={VENDOR_FIELD_TOOLTIPS.moq}
                />
                <Input
                  id="pv-moq"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={form.minOrderQty}
                  placeholder="Opcional"
                  onChange={(e) => setForm((prev) => ({ ...prev, minOrderQty: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <OptionalFieldLabel
                  htmlFor="pv-pack"
                  label="Empaque"
                  tooltip={VENDOR_FIELD_TOOLTIPS.packSize}
                />
                <Input
                  id="pv-pack"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={form.packSize}
                  placeholder="Opcional"
                  onChange={(e) => setForm((prev) => ({ ...prev, packSize: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <OptionalFieldLabel
                  htmlFor="pv-lead"
                  label="Plazo (días)"
                  tooltip={VENDOR_FIELD_TOOLTIPS.leadTime}
                />
                <Input
                  id="pv-lead"
                  type="number"
                  inputMode="numeric"
                  value={form.leadTimeDays}
                  placeholder="Opcional"
                  onChange={(e) => setForm((prev) => ({ ...prev, leadTimeDays: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={form.isPreferred}
                onCheckedChange={(v) =>
                  setForm((prev) => ({ ...prev, isPreferred: v === true }))
                }
              />
              Marcar como proveedor preferido
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={pending} onClick={() => void saveForm()}>
              {pending ? <Loader2 aria-hidden className="mr-2 size-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la relación de {deleteTarget?.vendorName} con este producto. No se borra
              el proveedor del catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => void confirmDelete()}
            >
              {deleteBusy ? <Loader2 aria-hidden className="mr-2 size-4 animate-spin" /> : null}
              Quitar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
