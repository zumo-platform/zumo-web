"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductsPageHeader } from "@/components/workspace/products-page-header";
import {
  fetchBackordersViaProxy,
  fulfilBackorderViaProxy,
  type BackorderWorklistRow,
} from "@/lib/inventory";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspaceTableScrollClassName,
} from "@/lib/workspace-layout";

export function BackordersWorklistView() {
  const [rows, setRows] = useState<BackorderWorklistRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchBackordersViaProxy();
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar faltantes.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleFulfil = useCallback(
    async (row: BackorderWorklistRow) => {
      const qty = Math.min(row.qtyBackordered, row.availableNow);
      if (qty <= 0) return;
      setBusyId(row.reservationId);
      try {
        const result = await fulfilBackorderViaProxy({
          reservationId: row.reservationId,
          qty,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Stock asignado al pedido.");
        await refresh();
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  return (
    <div className={workspaceContentOuterClassName}>
      <ProductsPageHeader
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/products">Volver a Inventario</Link>
          </Button>
        }
        description="Pedidos con líneas pendientes de stock (Faltantes)."
      />
      <div className={workspaceContentInnerClassName}>
        {rows === null ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 aria-hidden className="size-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay faltantes abiertos.</p>
        ) : (
          <div className={workspaceTableScrollClassName}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead className="text-right">Días esperando</TableHead>
                  <TableHead className="text-right">Disponible ahora</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const canFulfil = row.availableNow > 0;
                  const isBusy = busyId === row.reservationId;
                  return (
                    <TableRow
                      key={row.reservationId}
                      className={cn(canFulfil && "bg-amber-500/5")}
                    >
                      <TableCell>{row.productName}</TableCell>
                      <TableCell>{row.customerName}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.orderDisplayCode ?? row.orderId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.qtyBackordered.toLocaleString("es")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.daysWaiting}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.availableNow.toLocaleString("es")}
                      </TableCell>
                      <TableCell className="text-right">
                        {canFulfil ? (
                          <Button
                            disabled={isBusy}
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => void handleFulfil(row)}
                          >
                            {isBusy ? (
                              <Loader2 aria-hidden className="size-4 animate-spin" />
                            ) : (
                              "Asignar"
                            )}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
