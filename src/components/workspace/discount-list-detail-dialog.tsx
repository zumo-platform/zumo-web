"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { DiscountListDetail } from "@/lib/dashboard-discount-lists";
import {
  DISCOUNT_LIST_TYPE_LABEL,
  discountModeLabel,
  formatDiscountListDate,
  formatDiscountPct,
} from "@/lib/pricing-copy";

export function DiscountListDetailDialog({
  list,
  categoryNames,
  open,
  onOpenChange,
}: Readonly<{
  list: DiscountListDetail | null;
  categoryNames: ReadonlyMap<number, string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  if (!list) return null;

  const listType = list.appliesToAll || list.isDefault ? "default" : "regular";
  const coverage = list.wholeCatalog
    ? "Catálogo completo"
    : list.categoryIds.length > 0
      ? list.categoryIds.map((id) => categoryNames.get(id) ?? `#${id}`).join(", ")
      : `${list.items.length} productos`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{list.name}</DialogTitle>
          <DialogDescription>
            {list.description?.trim() || "Sin descripción"}
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {list.isDefault ? <Badge variant="secondary">Predeterminada</Badge> : null}
            <Badge variant="outline">{discountModeLabel(list.mode)}</Badge>
            <Badge variant="outline">{DISCOUNT_LIST_TYPE_LABEL[listType]}</Badge>
          </div>
          {list.mode === "general" ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Descuento general</dt>
              <dd>{formatDiscountPct(list.generalDiscountPct)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Cobertura</dt>
            <dd className="text-right">{coverage}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Productos</dt>
            <dd>{list.productCount.toLocaleString("es")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Clientes</dt>
            <dd>
              {list.appliesToAll
                ? "Todos"
                : (list.customerCount ?? list.customerIds.length).toLocaleString("es")}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Inicio</dt>
            <dd>{list.startsAt ? formatDiscountListDate(list.startsAt) : "De inmediato"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Fin</dt>
            <dd>{list.expiresAt ? formatDiscountListDate(list.expiresAt) : "Sin caducidad"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Actualizada</dt>
            <dd>{formatDiscountListDate(list.updatedAt)}</dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
