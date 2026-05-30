"use client";

import { Clock, MessageCircle, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DashboardMatchItem } from "@/lib/dashboard-matches";
import { cn } from "@/lib/utils";

import { MatchHistoryPopover } from "./match-history-popover";

export function MatchRow({
  item,
  onEdit,
  onDelete,
}: Readonly<{
  item: DashboardMatchItem;
  onEdit: (item: DashboardMatchItem) => void;
  onDelete: (item: DashboardMatchItem) => void;
}>) {
  const showMultiplier = Math.abs(item.quantityMultiplier - 1) > 0.0001;
  const showLowConfidence = item.confidence < 0.7;
  const customerLabel = item.customerName?.trim() || "Todos los clientes";

  return (
    <article className="group rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.product.sku ? (
              <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                {item.product.sku}
              </span>
            ) : null}
            <span className="font-medium text-sm">{item.product.name}</span>
            <span className="text-muted-foreground text-xs">{item.product.unit}</span>
            {showMultiplier ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800 text-xs dark:bg-blue-950 dark:text-blue-200">
                ×{item.quantityMultiplier}
              </span>
            ) : null}
            {showLowConfidence ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800 text-xs dark:bg-red-950 dark:text-red-200">
                {Math.round(item.confidence * 100)}%
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        <MessageCircle className="size-5 shrink-0 text-green-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{item.aliasText}</p>
          <p className="truncate text-muted-foreground text-xs">{customerLabel}</p>
        </div>
        <div
          className={cn(
            "flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
            "transition-opacity",
          )}
        >
          <MatchHistoryPopover aliasId={item.aliasId} />
          <Button
            aria-label="Editar"
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => onEdit(item)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            aria-label="Eliminar"
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}

export function MatchList({
  items,
  emptyTitle,
  emptyDescription,
  onCreate,
  onEdit,
  onDelete,
}: Readonly<{
  items: DashboardMatchItem[];
  emptyTitle: string;
  emptyDescription: string;
  onCreate: () => void;
  onEdit: (item: DashboardMatchItem) => void;
  onDelete: (item: DashboardMatchItem) => void;
}>) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
        <Clock className="mb-3 size-10 text-muted-foreground/60" aria-hidden />
        <h3 className="font-medium text-base">{emptyTitle}</h3>
        <p className="mt-1 max-w-md text-muted-foreground text-sm">{emptyDescription}</p>
        <Button className="mt-4" type="button" onClick={onCreate}>
          Añadir alias manualmente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <MatchRow key={item.aliasId} item={item} onDelete={onDelete} onEdit={onEdit} />
      ))}
    </div>
  );
}
