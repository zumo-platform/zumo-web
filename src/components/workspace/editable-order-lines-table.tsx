"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EditableOrderLine } from "@/lib/editable-order-lines";
import { editableLineSubtotal } from "@/lib/editable-order-lines";
import { formatOrderMoney } from "@/lib/order-product-search";
import { formatUnitAbbreviation } from "@/lib/product-unit";
import { cn } from "@/lib/utils";

export function EditableOrderLinesTable({
  lines,
  onChangeQuantity,
  onRemoveLine,
}: Readonly<{
  lines: readonly EditableOrderLine[];
  onChangeQuantity: (productId: number, delta: number) => void;
  onRemoveLine: (key: string) => void;
}>) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="w-[140px] text-center">Cant.</TableHead>
            <TableHead className="w-[100px] text-right">P. unit.</TableHead>
            <TableHead className="w-[100px] text-right">Subtotal</TableHead>
            <TableHead className="w-[44px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow className={cn(line.unmatched && "bg-muted/30")} key={line.key}>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{line.productName}</p>
                  {line.sku ? (
                    <p className="text-muted-foreground text-xs">SKU {line.sku}</p>
                  ) : null}
                  {line.unmatched ? (
                    <p className="text-amber-700 text-xs dark:text-amber-300">Sin coincidencia</p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                {line.unmatched ? (
                  <span className="block text-center tabular-nums">{line.quantity}</span>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      aria-label="Disminuir cantidad"
                      size="icon-sm"
                      type="button"
                      variant="outline"
                      onClick={() => line.productId && onChangeQuantity(line.productId, -1)}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="min-w-[2ch] text-center tabular-nums text-sm">
                      {line.quantity}
                    </span>
                    <Button
                      aria-label="Aumentar cantidad"
                      size="icon-sm"
                      type="button"
                      variant="outline"
                      onClick={() => line.productId && onChangeQuantity(line.productId, 1)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                    <span className="ml-0.5 min-w-[2.5ch] text-muted-foreground text-sm">
                      {formatUnitAbbreviation(line.unit)}
                    </span>
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {formatOrderMoney(line.unitPrice)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {line.unmatched ? "—" : formatOrderMoney(editableLineSubtotal(line))}
              </TableCell>
              <TableCell>
                <Button
                  aria-label="Eliminar línea"
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                  onClick={() => onRemoveLine(line.key)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {lines.length === 0 ? (
            <TableRow>
              <TableCell className="py-8 text-center text-muted-foreground text-sm" colSpan={5}>
                Agregá productos al pedido.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
