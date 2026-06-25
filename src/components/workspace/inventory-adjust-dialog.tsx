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
import { Textarea } from "@/components/ui/textarea";
import type { DashboardProductRow } from "@/lib/dashboard-products";
import { fetchProductsViaProxy } from "@/lib/dashboard-products";
import {
  adjustStockViaProxy,
  fetchWarehousesViaProxy,
  getProductStockViaProxy,
  type DashboardWarehouseRow,
  type ProductStockByWarehouseRow,
} from "@/lib/inventory";

function rowAvailable(row: ProductStockByWarehouseRow | undefined): number {
  if (!row) return 0;
  const available =
    row.available != null ? Number(row.available) : Number(row.onHand) - Number(row.reserved);
  return Number.isFinite(available) ? Math.max(0, available) : 0;
}

export function InventoryAdjustDialog({
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
  const [warehouseId, setWarehouseId] = useState("");
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    void Promise.all([fetchWarehousesViaProxy(), fetchProductsViaProxy()]).then(
      ([wh, prods]) => {
        setWarehouses(wh);
        setProducts(prods);
        if (!product && prods[0]) {
          setProductId(String(prods[0].productId));
        }
        if (wh[0]) {
          setWarehouseId(String(wh[0].warehouseId));
        }
      },
    );
    setProductId(product ? String(product.productId) : "");
    setStockRows([]);
    setMode("add");
    setQty("");
    setNotes("");
  }, [open, product]);

  useEffect(() => {
    if (!open) return;
    const pid = Number(productId);
    if (!Number.isFinite(pid) || pid <= 0) {
      setStockRows([]);
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
  const warehouseOptions = useMemo(() => {
    if (mode === "add") return warehouses;
    return warehouses.filter((warehouse) => rowAvailable(stockByWarehouseId.get(warehouse.warehouseId)) > 0);
  }, [mode, stockByWarehouseId, warehouses]);
  const selectedAvailable = rowAvailable(stockByWarehouseId.get(Number(warehouseId)));

  useEffect(() => {
    if (!open) return;
    if (warehouseOptions.length === 0) {
      setWarehouseId("");
      return;
    }
    if (!warehouseOptions.some((warehouse) => String(warehouse.warehouseId) === warehouseId)) {
      setWarehouseId(String(warehouseOptions[0]!.warehouseId));
    }
  }, [open, warehouseId, warehouseOptions]);

  async function submit() {
    const pid = Number(productId);
    const wid = Number(warehouseId);
    const amount = Number(qty);
    if (!Number.isFinite(pid) || pid <= 0) {
      toast.error("Seleccioná un producto.");
      return;
    }
    if (!Number.isFinite(wid) || wid <= 0) {
      toast.error("Seleccioná una bodega.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Ingresá una cantidad válida.");
      return;
    }
    if (mode === "remove" && selectedAvailable <= 0) {
      toast.error("La bodega seleccionada no tiene stock disponible para este producto.");
      return;
    }
    if (mode === "remove" && amount > selectedAvailable) {
      toast.error(`La cantidad supera el disponible en bodega (${selectedAvailable}).`);
      return;
    }
    if (!notes.trim()) {
      toast.error("El motivo es obligatorio.");
      return;
    }

    const delta = mode === "add" ? amount : -amount;
    setPending(true);
    try {
      const result = await adjustStockViaProxy({
        productId: pid,
        warehouseId: wid,
        delta,
        notes: notes.trim(),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "add" ? "Stock agregado." : "Stock reducido.");
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
          <DialogTitle>Agregar / ajustar stock</DialogTitle>
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
                      {p.sku ? ` (${p.sku})` : ""}
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
            <Label>Bodega</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar bodega" />
              </SelectTrigger>
              <SelectContent>
                {warehouseOptions.map((wh) => (
                  <SelectItem key={wh.warehouseId} value={String(wh.warehouseId)}>
                    {wh.name}
                    {mode === "remove"
                      ? ` (${rowAvailable(stockByWarehouseId.get(wh.warehouseId))} disp.)`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mode === "remove" && warehouseOptions.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No hay bodegas con stock disponible para quitar de este producto.
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label>Operación</Label>
            <Select value={mode} onValueChange={(v: "add" | "remove") => setMode(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Agregar</SelectItem>
                <SelectItem value="remove">Quitar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adj-qty">Cantidad</Label>
            <Input
              id="adj-qty"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adj-notes">Motivo</Label>
            <Textarea
              id="adj-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={pending || (mode === "remove" && warehouseOptions.length === 0)}
            type="button"
            onClick={() => void submit()}
          >
            {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
