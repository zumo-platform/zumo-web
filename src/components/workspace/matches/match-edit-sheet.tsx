"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  deleteDashboardMatch,
  patchDashboardMatch,
  type DashboardMatchItem,
} from "@/lib/dashboard-matches";
import {
  fetchProductsViaProxy,
  type DashboardProductRow,
} from "@/lib/dashboard-products";

export function MatchEditSheet({
  item,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: Readonly<{
  item: DashboardMatchItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted: () => void;
}>) {
  const [aliasText, setAliasText] = useState("");
  const [productId, setProductId] = useState("");
  const [multiplier, setMultiplier] = useState("1");
  const [active, setActive] = useState(true);
  const [products, setProducts] = useState<DashboardProductRow[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!item) return;
    setAliasText(item.aliasText);
    setProductId(String(item.product.productId));
    setMultiplier(String(item.quantityMultiplier));
    setActive(item.active);
  }, [item]);

  useEffect(() => {
    if (!open) return;
    void fetchProductsViaProxy().then(setProducts);
  }, [open]);

  async function save() {
    if (!item) return;
    setPending(true);
    try {
      const updated = await patchDashboardMatch(item.aliasId, {
        aliasText: aliasText.trim(),
        productId: Number(productId),
        quantityMultiplier: Number(multiplier),
        active,
      });
      if (!updated) {
        toast.error("No se pudo guardar el alias");
        return;
      }
      toast.success("Alias actualizado");
      onSaved();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!item) return;
    if (!window.confirm("¿Eliminar este alias? La IA dejará de usarlo.")) return;
    setPending(true);
    try {
      const ok = await deleteDashboardMatch(item.aliasId);
      if (!ok) {
        toast.error("No se pudo eliminar");
        return;
      }
      toast.success("Alias eliminado");
      onDeleted();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  const customerLabel = item?.customerName?.trim() || "Todos los clientes";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar match</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="match-alias">Texto del cliente</Label>
            <Input
              id="match-alias"
              value={aliasText}
              onChange={(e) => setAliasText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Producto del catálogo</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.productId} value={String(p.productId)}>
                    {p.name} ({p.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="match-multiplier">Multiplicador</Label>
            <Input
              id="match-multiplier"
              step="0.01"
              type="number"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <Input disabled value={customerLabel} />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="match-active">Activo</Label>
            <Switch checked={active} id="match-active" onCheckedChange={setActive} />
          </div>
        </div>

        <SheetFooter className="mt-8 gap-2 sm:flex-col sm:space-x-0">
          <Button disabled={pending} type="button" onClick={save}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Guardar"}
          </Button>
          <Button disabled={pending} type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={pending} type="button" variant="destructive" onClick={remove}>
            Eliminar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
