"use client";

import { useEffect, useState } from "react";

import { Warehouse } from "lucide-react";

import { SkeletonPopoverContent } from "@/components/ui/skeleton-blocks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardProductRow } from "@/lib/dashboard-products";
import { formatQty } from "@/lib/inventory-format";
import {
  getProductStockViaProxy,
  WAREHOUSE_KIND_LABEL,
  type ProductStockByWarehouseRow,
} from "@/lib/inventory";

export function ProductStockPopover({
  product,
}: Readonly<{ product: DashboardProductRow }>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProductStockByWarehouseRow[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void getProductStockViaProxy(product.productId).then(({ byWarehouse }) => {
      if (cancelled) return;
      setRows(byWarehouse);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, product.productId]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="h-8 gap-1.5 px-2" size="sm" type="button" variant="ghost">
          <Warehouse aria-hidden className="size-4" />
          Por bodega
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(420px,92vw)] p-0">
        <div className="border-b px-3 py-2">
          <p className="font-medium text-sm">Stock por bodega</p>
          <p className="text-muted-foreground text-xs">{product.name}</p>
        </div>
        {loading ? (
          <div className="px-3 py-4">
            <SkeletonPopoverContent lines={3} />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-muted-foreground text-sm">
            Sin existencias registradas en bodegas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bodega</TableHead>
                <TableHead className="text-right">Físico</TableHead>
                <TableHead className="text-right">Reserv.</TableHead>
                <TableHead className="text-right">Disp.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.warehouseId}>
                  <TableCell className="max-w-[140px] truncate text-sm">
                    {row.warehouseName}
                    <span className="ml-1 text-muted-foreground text-xs">
                      ({WAREHOUSE_KIND_LABEL[row.kind] ?? row.kind})
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatQty(Number(row.onHand))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatQty(Number(row.reserved))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatQty(row.available != null ? Number(row.available) : null)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
