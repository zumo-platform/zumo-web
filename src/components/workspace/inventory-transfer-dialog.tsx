"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import type { DashboardProductRow } from "@/lib/dashboard-products";
import { fetchProductsViaProxy } from "@/lib/dashboard-products";
import {
  fetchWarehousesViaProxy,
  getProductStockViaProxy,
  transferStockViaProxy,
  type DashboardWarehouseRow,
  type ProductStockByWarehouseRow,
} from "@/lib/inventory";

function rowAvailable(row: ProductStockByWarehouseRow | undefined): number {
  if (!row) return 0;
  const available =
    row.available != null ? Number(row.available) : Number(row.onHand) - Number(row.reserved);
  return Number.isFinite(available) ? Math.max(0, available) : 0;
}

export function InventoryTransferDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: DashboardProductRow | null;
  onSuccess: () => void;
}>) {
  const [warehouses, setWarehouses] = useState<DashboardWarehouseRow[]>([]);
  const [products, setProducts] = useState<DashboardProductRow[]>([]);
  const [stockRows, setStockRows] = useState<ProductStockByWarehouseRow[]>([]);
  const [productId, setProductId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [qty, setQty] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    void Promise.all([fetchWarehousesViaProxy(), fetchProductsViaProxy()]).then(
      ([wh, prods]) => {
        setWarehouses(wh);
        setProducts(prods);
      },
    );
    setProductId(product ? String(product.productId) : "");
    setFromWarehouseId("");
    setToWarehouseId("");
    setQty("");
    setStockRows([]);
  }, [open, product]);

  useEffect(() => {
    if (!open) return;
    const pid = Number(productId);
    if (!Number.isFinite(pid) || pid <= 0) {
      setStockRows([]);
      setFromWarehouseId("");
      return;
    }

    let cancelled = false;
    void getProductStockViaProxy(pid).then((stock) => {
      if (cancelled) return;
      setStockRows(stock.byWarehouse);
    });
    return () => {
      cancelled = true;
    };
  }, [open, productId]);

  const stockByWarehouseId = useMemo(
    () => new Map(stockRows.map((row) => [row.warehouseId, row])),
    [stockRows],
  );
  const sourceWarehouses = useMemo(
    () => warehouses.filter((warehouse) => rowAvailable(stockByWarehouseId.get(warehouse.warehouseId)) > 0),
    [stockByWarehouseId, warehouses],
  );
  const destinationWarehouses = useMemo(
    () => warehouses.filter((warehouse) => String(warehouse.warehouseId) !== fromWarehouseId),
    [fromWarehouseId, warehouses],
  );
  const selectedSourceAvailable = rowAvailable(stockByWarehouseId.get(Number(fromWarehouseId)));

  useEffect(() => {
    if (!open) return;
    if (sourceWarehouses.length === 0) {
      setFromWarehouseId("");
      return;
    }
    if (!sourceWarehouses.some((warehouse) => String(warehouse.warehouseId) === fromWarehouseId)) {
      setFromWarehouseId(String(sourceWarehouses[0]!.warehouseId));
    }
  }, [fromWarehouseId, open, sourceWarehouses]);

  useEffect(() => {
    if (!open) return;
    if (destinationWarehouses.length === 0) {
      setToWarehouseId("");
      return;
    }
    if (!destinationWarehouses.some((warehouse) => String(warehouse.warehouseId) === toWarehouseId)) {
      setToWarehouseId(String(destinationWarehouses[0]!.warehouseId));
    }
  }, [destinationWarehouses, open, toWarehouseId]);

  async function submit() {
    const pid = Number(productId);
    const fromId = Number(fromWarehouseId);
    const toId = Number(toWarehouseId);
    const amount = Number(qty);

    if (!Number.isFinite(pid) || pid <= 0) {
      toast.error("Seleccioná un producto.");
      return;
    }
    if (!Number.isFinite(fromId) || !Number.isFinite(toId)) {
      toast.error("Seleccioná bodegas de origen y destino.");
      return;
    }
    if (selectedSourceAvailable <= 0) {
      toast.error("La bodega de origen no tiene stock disponible para este producto.");
      return;
    }
    if (fromId === toId) {
      toast.error("Origen y destino deben ser distintos.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Ingresá una cantidad válida.");
      return;
    }
    if (amount > selectedSourceAvailable) {
      toast.error(`La cantidad supera el disponible en origen (${selectedSourceAvailable}).`);
      return;
    }

    setPending(true);
    try {
      const result = await transferStockViaProxy({
        productId: pid,
        fromWarehouseId: fromId,
        toWarehouseId: toId,
        qty: amount,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Transferencia completada.");
      onSuccess();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir stock</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {!product ? (
            <div className="grid gap-2">
              <Label>Producto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.productId} value={String(p.productId)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Producto: <span className="font-medium text-foreground">{product.name}</span>
            </p>
          )}
          <div className="grid gap-2">
            <Label>Bodega origen</Label>
            <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceWarehouses.map((wh) => (
                  <SelectItem key={wh.warehouseId} value={String(wh.warehouseId)}>
                    {wh.name} ({rowAvailable(stockByWarehouseId.get(wh.warehouseId))} disp.)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sourceWarehouses.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No hay bodegas con stock disponible para este producto.
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label>Bodega destino</Label>
            <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {destinationWarehouses.map((wh) => (
                  <SelectItem key={wh.warehouseId} value={String(wh.warehouseId)}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="xfer-qty">Cantidad</Label>
            <Input
              id="xfer-qty"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={pending || sourceWarehouses.length === 0} type="button" onClick={() => void submit()}>
            {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
