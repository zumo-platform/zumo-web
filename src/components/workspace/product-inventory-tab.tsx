"use client";

import Link from "next/link";
import { useState } from "react";

import { ArrowLeftRight, PackagePlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InventoryAdjustDialog } from "@/components/workspace/inventory-adjust-dialog";
import { InventoryTransferDialog } from "@/components/workspace/inventory-transfer-dialog";
import { batchExpiryState, formatDateShort, formatMoneyCRC } from "@/lib/batch-format";
import type { DashboardProductRow } from "@/lib/dashboard-products";
import { formatQty, MOVEMENT_REASON_LABEL } from "@/lib/inventory-format";
import type { ProductMovementRow } from "@/lib/inventory";
import type { DashboardProductDetail } from "@/lib/product-detail";

const MOVEMENT_WHEN_FMT = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Costa_Rica",
});

function formatWhen(iso: string): string {
  if (!iso) return "—";
  try {
    return MOVEMENT_WHEN_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}

function movementRefLabel(m: ProductMovementRow): string | null {
  if (!m.refType) return null;
  const kind =
    m.refType === "po" ? "Compra" : m.refType === "order" ? "Venta" : null;
  if (!kind) return null;
  return m.displayCode ? `${kind} ${m.displayCode}` : kind;
}

function shouldShowMovementNotes(m: ProductMovementRow): boolean {
  if (!m.notes) return false;
  const label = MOVEMENT_REASON_LABEL[m.reason] ?? "";
  if (m.notes === label) return false;
  if (/^(Recepción|Compra)\s+(pur_|poi_)/i.test(m.notes)) return false;
  if (/^opening_balance\s+\d/i.test(m.notes)) return false;
  return true;
}

function MovementRefLine({ m }: Readonly<{ m: ProductMovementRow }>) {
  const refLabel = movementRefLabel(m);
  if (!refLabel && m.unitCost == null) return null;

  const refContent =
    m.refType === "po" && m.poId && m.displayCode ? (
      <Link className="hover:underline" href={`/compras/ordenes/${encodeURIComponent(m.poId)}`}>
        {refLabel}
      </Link>
    ) : (
      refLabel
    );

  return (
    <span className="text-muted-foreground text-xs">
      {refContent}
      {refLabel && m.unitCost != null ? " · " : null}
      {m.unitCost != null ? formatMoneyCRC(m.unitCost) : null}
    </span>
  );
}

function StatCard({
  label,
  value,
  emphasis = false,
}: Readonly<{
  label: string;
  value: string;
  emphasis?: boolean;
}>) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`tabular-nums ${emphasis ? "font-bold" : "font-medium"}`}>{value}</p>
    </div>
  );
}

export function ProductInventoryTab({
  detail,
  canEditInventory,
  onRefresh,
}: Readonly<{
  detail: DashboardProductDetail;
  canEditInventory: boolean;
  onRefresh: () => void;
}>) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const productRow: DashboardProductRow = {
    productId: detail.product.productId,
    name: detail.product.name,
    presentation: detail.product.presentation,
    unit: detail.product.unit,
    sku: detail.product.sku,
    status: detail.product.status,
    deletedAt: detail.product.deletedAt,
    stockQuantity: detail.product.stockQuantity,
    price: detail.product.price,
    imageUrl: detail.product.imageUrl,
    categoryId: detail.product.categoryId,
    trackStock: detail.product.trackStock,
    available: detail.stock.sellableAvailable,
    onHand: detail.stock.physical,
    reserved: detail.stock.reserved,
    committed: detail.stock.committed,
    incoming: detail.qtySummary?.incoming ?? detail.stock.onPurchaseOrder,
    total: detail.qtySummary?.total ?? detail.stock.physical + detail.stock.onPurchaseOrder,
    minimumStock:
      detail.product.manageMinimumStock && detail.product.minimumStockQuantity != null
        ? Number(detail.product.minimumStockQuantity)
        : null,
  };

  const rows = detail.stock.byWarehouse;
  const totalOnHand = rows.reduce((s, r) => s + Number(r.onHand), 0);
  const totalReserved = rows.reduce((s, r) => s + Number(r.reserved), 0);
  const totalAvailable = rows.reduce((s, r) => {
    const av = r.available != null ? Number(r.available) : Number(r.onHand) - Number(r.reserved);
    return s + (Number.isFinite(av) ? av : 0);
  }, 0);

  if (!detail.product.trackStock) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
        Este producto no gestiona existencias.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button disabled={!canEditInventory} type="button" variant="outline" onClick={() => setAdjustOpen(true)}>
          <PackagePlus className="mr-2 size-4" />
          Ajustar
        </Button>
        <Button disabled={!canEditInventory} type="button" variant="outline" onClick={() => setTransferOpen(true)}>
          <ArrowLeftRight className="mr-2 size-4" />
          Transferir
        </Button>
      </div>

      {detail.qtySummary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="En existencia" value={formatQty(detail.qtySummary.onHand)} />
          <StatCard label="Por llegar" value={formatQty(detail.qtySummary.incoming)} />
          <StatCard label="Asignado" value={formatQty(detail.qtySummary.reserved)} />
          <StatCard label="Total" value={formatQty(detail.qtySummary.total)} emphasis />
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Por bodega</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bodega</TableHead>
                <TableHead className="text-right">Físico</TableHead>
                <TableHead className="text-right">Reservado</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.warehouseId}>
                  <TableCell>{row.warehouseName}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatQty(Number(row.onHand))}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatQty(Number(row.reserved))}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQty(
                      row.available != null
                        ? Number(row.available)
                        : Number(row.onHand) - Number(row.reserved),
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium">
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{formatQty(totalOnHand)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatQty(totalReserved)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatQty(totalAvailable)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {detail.batches.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lotes</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Existencia</TableHead>
                  <TableHead className="text-right">Costo unit.</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.batches.map((b) => {
                  const exp = batchExpiryState(b.expiryDate, b.status);
                  return (
                    <TableRow key={b.batchId}>
                      <TableCell className="font-medium">{b.batchNumber}</TableCell>
                      <TableCell className={exp.className}>
                        {b.expiryDate ? formatDateShort(b.expiryDate) : "—"}
                      </TableCell>
                      <TableCell>{b.vendorName ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatQty(b.onHand)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {b.unitCost != null ? formatMoneyCRC(b.unitCost) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={exp.variant}>{exp.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Movimientos recientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.movements.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin movimientos registrados.</p>
          ) : (
            detail.movements.map((m) => (
              <div key={m.movementId} className="flex flex-col gap-0.5 border-border border-b pb-3 last:border-0">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {MOVEMENT_REASON_LABEL[m.reason] ?? m.reason}
                  </span>
                  <span className="tabular-nums">{formatQty(Number(m.qty))}</span>
                </div>
                <span className="text-muted-foreground text-xs">{formatWhen(m.occurredAt)}</span>
                <MovementRefLine m={m} />
                {shouldShowMovementNotes(m) ? (
                  <span className="text-muted-foreground text-xs">{m.notes}</span>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <InventoryAdjustDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        product={productRow}
        onSuccess={onRefresh}
      />
      <InventoryTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        product={productRow}
        onSuccess={onRefresh}
      />
    </div>
  );
}
