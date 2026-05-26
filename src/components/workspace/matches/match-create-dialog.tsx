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
import { createDashboardMatch } from "@/lib/dashboard-matches";
import {
  fetchProductsViaProxy,
  type DashboardProductRow,
} from "@/lib/dashboard-products";

type CustomerOption = Readonly<{ customerId: number | null; label: string }>;

export function MatchCreateDialog({
  open,
  onOpenChange,
  customers,
  onCreated,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: CustomerOption[];
  onCreated: () => void;
}>) {
  const [aliasText, setAliasText] = useState("");
  const [productId, setProductId] = useState("");
  const [multiplier, setMultiplier] = useState("1");
  const [customerKey, setCustomerKey] = useState("all");
  const [products, setProducts] = useState<DashboardProductRow[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetchProductsViaProxy().then(setProducts);
    setAliasText("");
    setProductId("");
    setMultiplier("1");
    setCustomerKey("all");
  }, [open]);

  async function create() {
    if (!aliasText.trim() || !productId) {
      toast.error("Completa alias y producto");
      return;
    }
    setPending(true);
    try {
      const customerId = customerKey === "all" ? null : Number(customerKey);
      const created = await createDashboardMatch({
        aliasText: aliasText.trim(),
        productId: Number(productId),
        quantityMultiplier: Number(multiplier) || 1,
        customerId,
      });
      if (!created) {
        toast.error("No se pudo crear el alias");
        return;
      }
      toast.success("Alias creado");
      onCreated();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir alias manualmente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-alias">Texto del cliente</Label>
            <Input
              id="new-alias"
              placeholder="Ej. tomatito"
              value={aliasText}
              onChange={(e) => setAliasText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
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

          <div className="space-y-2">
            <Label htmlFor="new-multiplier">Multiplicador</Label>
            <Input
              id="new-multiplier"
              step="0.01"
              type="number"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={customerKey} onValueChange={setCustomerKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Aplicar a todos los clientes</SelectItem>
                {customers
                  .filter((c) => c.customerId != null)
                  .map((c) => (
                    <SelectItem key={c.customerId} value={String(c.customerId)}>
                      {c.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={pending} type="button" onClick={create}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
