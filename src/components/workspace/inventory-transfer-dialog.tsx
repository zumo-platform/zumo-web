"use client";

import { useEffect, useState } from "react";

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
  transferStockViaProxy,
  type DashboardWarehouseRow,
} from "@/lib/inventory";

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
        if (wh[0]) setFromWarehouseId(String(wh[0].warehouseId));
        if (wh[1]) setToWarehouseId(String(wh[1].warehouseId));
        else if (wh[0]) setToWarehouseId("");
      },
    );
    setProductId(product ? String(product.productId) : "");
    setQty("");
  }, [open, product]);

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
    if (fromId === toId) {
      toast.error("Origen y destino deben ser distintos.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Ingresá una cantidad válida.");
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
                {warehouses.map((wh) => (
                  <SelectItem key={wh.warehouseId} value={String(wh.warehouseId)}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Bodega destino</Label>
            <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((wh) => (
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
          <Button disabled={pending} type="button" onClick={() => void submit()}>
            {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
