"use client";

import { useEffect, useState } from "react";

import { Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
import { AgingTableSkeleton } from "@/components/workspace/workspace-skeletons";
import { formatDateShort } from "@/lib/batch-format";
import { canMutateInventory } from "@/lib/roles";
import {
  fetchStockCountsViaProxy,
  formatStockCountNumber,
  STOCK_COUNT_STATUS_LABEL,
  stockCountStatusBadgeVariant,
  type StockCountRow,
} from "@/lib/stock-counts";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspaceTableCardClassName,
} from "@/lib/workspace-layout";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

export function StockCountsListView() {
  const { role } = useWorkspacePermissions();
  const canEdit = canMutateInventory(role);

  const [rows, setRows] = useState<StockCountRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchStockCountsViaProxy({ signal: ctrl.signal })
      .then((data) => {
        setRows(data);
        setError(null);
        setLoaded(true);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "No se pudo cargar los conteos.");
        setRows(null);
        setLoaded(true);
      });
    return () => ctrl.abort();
  }, []);

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit ? (
        <Button asChild size="sm" className="gap-2">
          <Link href="/products/stock-counts/new">
            <Plus aria-hidden className="size-4" />
            Nuevo conteo
          </Link>
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProductsPageHeader
        title="Conteos de inventario"
        subPage="Conteos de inventario"
        description="Conteos físicos y de ciclo. Al completar un conteo se aplican ajustes contra la foto tomada al crearlo."
        actions={actions}
      />

      <div className={workspaceContentOuterClassName}>
        <div className={workspaceContentInnerClassName}>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <div className={cn(workspaceTableCardClassName, "overflow-x-auto")}>
            {!loaded ? (
              <AgingTableSkeleton />
            ) : error ? null : rows != null && rows.length === 0 ? (
              <p className="p-6 text-muted-foreground text-sm">No hay conteos registrados.</p>
            ) : rows != null ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Bodega</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Progreso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.countId} className="cursor-pointer">
                      <TableCell>
                        <Link
                          href={`/products/stock-counts/${encodeURIComponent(row.countId)}`}
                          className="font-mono text-sm hover:underline"
                        >
                          {formatStockCountNumber(row.countId)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/products/stock-counts/${encodeURIComponent(row.countId)}`}
                          className="hover:underline"
                        >
                          {row.name?.trim() || "—"}
                        </Link>
                      </TableCell>
                      <TableCell>{row.warehouseName}</TableCell>
                      <TableCell>
                        <Badge variant={stockCountStatusBadgeVariant(row.status)}>
                          {STOCK_COUNT_STATUS_LABEL[row.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateShort(row.createdAt)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.countedCount}/{row.productCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
