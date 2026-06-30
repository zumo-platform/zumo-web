"use client";

import { MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DiscountListSummary } from "@/lib/dashboard-discount-lists";
import {
  DISCOUNT_LIST_STATUS_LABEL,
  discountListScheduleStatus,
  discountModeLabel,
  formatDiscountListDate,
  formatDiscountPct,
} from "@/lib/pricing-copy";

export function DiscountListCard({
  list,
  canEdit,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
}: Readonly<{
  list: DiscountListSummary;
  canEdit: boolean;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}>) {
  const schedule = discountListScheduleStatus(list);
  const customerLabel =
    list.appliesToAll || list.customerCount == null
      ? "Todos"
      : String(list.customerCount);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="truncate text-base">{list.name}</CardTitle>
          {list.description ? (
            <p className="line-clamp-2 text-muted-foreground text-sm">{list.description}</p>
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label="Acciones" size="icon" type="button" variant="ghost">
              <MoreHorizontal aria-hidden className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onView}>Ver detalle</DropdownMenuItem>
            {canEdit ? (
              <>
                <DropdownMenuItem onSelect={onDuplicate}>Duplicar</DropdownMenuItem>
                <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onSelect={onDelete}>
                  Eliminar
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="mt-auto space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {list.isDefault ? (
            <Badge variant="secondary">Predeterminada</Badge>
          ) : null}
          <Badge variant="outline">{discountModeLabel(list.mode)}</Badge>
          {list.mode === "general" && list.generalDiscountPct ? (
            <Badge variant="outline">{formatDiscountPct(list.generalDiscountPct)}</Badge>
          ) : null}
          <Badge
            variant={
              schedule === "active"
                ? "default"
                : schedule === "expired"
                  ? "destructive"
                  : "secondary"
            }
          >
            {DISCOUNT_LIST_STATUS_LABEL[schedule]}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Última actualización {formatDiscountListDate(list.updatedAt)}
        </p>
        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
          <span>Productos: {list.productCount.toLocaleString("es")}</span>
          <span>Clientes: {customerLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}
