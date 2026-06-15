"use client";

import { useEffect, useState } from "react";

import { Loader2, Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  fetchPurchaseOrdersViaProxy,
  type PurchaseOrderListRow,
  type PurchaseOrderStatus,
} from "@/lib/purchase-orders";
import { canMutateInventory } from "@/lib/roles";
import { workspaceTableCardClassName } from "@/lib/workspace-layout";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

type StatusFilter = "all" | PurchaseOrderStatus;

const PO_DATE_FMT = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium" });
const PO_MONEY_CRC_FMT = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPoMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toLocaleString("es");
  }
}

function poStatusLabel(status: PurchaseOrderStatus): string {
  switch (status) {
    case "draft":
      return "Borrador";
    case "sent":
      return "Enviada";
    case "partially_received":
      return "Parcial";
    case "received":
      return "Recibida";
    case "complete":
      return "Completa";
    case "cancelled":
      return "Cancelada";
    default:
      return status;
  }
}

function poStatusVariant(
  status: PurchaseOrderStatus,
): "outline" | "secondary" | "default" | "destructive" {
  switch (status) {
    case "draft":
      return "outline";
    case "sent":
    case "received":
    case "complete":
      return "secondary";
    case "partially_received":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return PO_DATE_FMT.format(new Date(iso));
  } catch {
    return "—";
  }
}

function formatMoney(value: number | null, currency: string | null): string {
  if (value === null) return "—";
  if (currency == null || currency === "CRC") {
    try {
      return PO_MONEY_CRC_FMT.format(value);
    } catch {
      return value.toLocaleString("es");
    }
  }
  return formatPoMoney(value, currency);
}

function ProgressCell({ row }: Readonly<{ row: PurchaseOrderListRow }>) {
  if (row.status === "draft") {
    return <span className="text-muted-foreground">—</span>;
  }
  const pct = Math.min(100, Math.max(0, row.receivedPct));
  return (
    <div className="flex min-w-[7rem] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{pct}%</span>
    </div>
  );
}

export function PurchaseOrdersListView() {
  const { role } = useWorkspacePermissions();
  const canEdit = canMutateInventory(role);

  const [rows, setRows] = useState<PurchaseOrderListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const params =
          statusFilter === "all"
            ? undefined
            : { status: statusFilter as PurchaseOrderStatus };
        const data = await fetchPurchaseOrdersViaProxy(params);
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No pudimos cargar las órdenes de compra.",
          );
          setRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  if (rows === null && !error) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Cargando órdenes de compra…
      </div>
    );
  }

  const orders = rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-lg tracking-tight">Órdenes de compra</h2>
          <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-relaxed">
            Seguimiento de compras a proveedores y recepción de mercadería en bodega.
          </p>
        </div>
        {canEdit ? (
          <Button asChild className="gap-2" size="sm">
            <Link href="/compras/ordenes/nueva">
              <Plus aria-hidden className="size-4" />
              Nueva orden
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="sent">Enviadas</SelectItem>
            <SelectItem value="partially_received">Parciales</SelectItem>
            <SelectItem value="received">Recibidas</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
          <p>Aún no hay órdenes de compra.</p>
          {canEdit ? (
            <Button asChild className="mt-4 gap-2" size="sm">
              <Link href="/compras/ordenes/nueva">
                <Plus aria-hidden className="size-4" />
                Nueva orden
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className={workspaceTableCardClassName}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Bodega</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Llega</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((row) => (
                <TableRow key={row.poId}>
                  <TableCell className="font-medium">
                    <Link
                      className="font-mono text-primary hover:underline"
                      href={`/compras/ordenes/${encodeURIComponent(row.poId)}`}
                    >
                      {row.displayCode}
                    </Link>
                  </TableCell>
                  <TableCell>{row.vendorName}</TableCell>
                  <TableCell>{row.warehouseName}</TableCell>
                  <TableCell>
                    <Badge variant={poStatusVariant(row.status)}>
                      {poStatusLabel(row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ProgressCell row={row} />
                  </TableCell>
                  <TableCell>{formatDate(row.expectedAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(row.total, row.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
