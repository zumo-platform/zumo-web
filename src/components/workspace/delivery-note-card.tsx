"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CircleArrowRight, Clock, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  allowedDropTargets,
  deliveryNoteDisplayCode,
  deliveryNoteInternalId,
  DELIVERY_NOTE_STATUS_LABELS,
  type DeliveryNoteListRow,
} from "@/lib/delivery-notes";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import { cn } from "@/lib/utils";
import { useSupplierTimeFormatters } from "@/lib/workspace-preferences-context";

export function DeliveryNoteCard({
  note,
  overlay = false,
  dragging = false,
}: Readonly<{
  note: DeliveryNoteListRow;
  overlay?: boolean;
  dragging?: boolean;
}>) {
  const { formatInstantDate, formatStoredDateOnly } = useSupplierTimeFormatters();
  const canDrag = allowedDropTargets(note.status).length > 0;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: note.deliveryNoteId,
    data: { status: note.status },
    disabled: !canDrag || overlay,
  });

  const style =
    overlay || isDragging
      ? undefined
      : {
          transform: CSS.Translate.toString(transform),
        };

  const displayCode = deliveryNoteDisplayCode(note);
  const href = `/orders/delivery-notes/${encodeURIComponent(note.deliveryNoteId)}`;
  const orderLabels = note.orderDisplayCodes.length
    ? note.orderDisplayCodes
    : note.orderIds.map((id) => formatOrderDisplayCode(id, null));

  return (
    <motion.div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay || !canDrag ? {} : { ...attributes, ...listeners })}
      layout={!overlay}
      className={cn(
        "flex flex-col rounded-lg border bg-card shadow-sm",
        canDrag && "cursor-grab active:cursor-grabbing",
        (isDragging || dragging) && !overlay && "opacity-40",
        overlay && "scale-[1.02] shadow-lg",
      )}
    >
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className="truncate font-mono text-muted-foreground text-xs"
              title={note.displayCode ? deliveryNoteInternalId(note) : undefined}
            >
              {displayCode}
            </p>
            {note.postedInventory ? (
              <Badge className="mt-1 text-[10px]" variant="secondary">
                Stock posteado
              </Badge>
            ) : null}
          </div>
          {!overlay ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Más acciones"
                  className="size-7"
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={href}>Ver nota de entrega</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={href}>Abrir página</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <p className="mt-2 truncate font-semibold text-sm">
          {note.customerName ?? `Cliente #${String(note.customerId)}`}
        </p>

        <dl className="mt-2 space-y-1 text-muted-foreground text-xs">
          <div className="flex gap-1">
            <dt className="shrink-0">Programada:</dt>
            <dd>{note.scheduledDate ? formatStoredDateOnly(note.scheduledDate) : "—"}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="shrink-0">Ítems:</dt>
            <dd>{note.itemCount}</dd>
          </div>
          {orderLabels.length > 0 ? (
            <div className="flex gap-1">
              <dt className="shrink-0">Pedidos:</dt>
              <dd className="truncate font-mono">
                {orderLabels.slice(0, 2).join(", ")}
                {orderLabels.length > 2 ? ` +${String(orderLabels.length - 2)}` : ""}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{DELIVERY_NOTE_STATUS_LABELS[note.status]}</Badge>
        </div>
      </div>

      {!overlay ? (
        <div
          className="mt-auto border-t px-3 py-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {note.createdAt ? (
            <p className="mb-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock aria-hidden className="size-3 shrink-0" />
              {formatInstantDate(note.createdAt)}
            </p>
          ) : null}
          <Link
            className="inline-flex items-center gap-1.5 font-medium text-primary text-xs hover:underline"
            href={href}
          >
            <CircleArrowRight aria-hidden className="size-3.5 shrink-0" />
            Ver nota de entrega
          </Link>
        </div>
      ) : null}
    </motion.div>
  );
}
