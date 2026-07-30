"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WazeCopyButton } from "@/components/workspace/waze-copy-button";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import { cn } from "@/lib/utils";

export type DeliveryNoteLineRow = Readonly<{
  key: string;
  productName: string;
  orderId: string;
  qtyOrdered: number;
  qtyDelivered: number;
  unit: string;
  shortfall?: number;
}>;

type DeliveryNoteLinesTableProps = Readonly<{
  lines: readonly DeliveryNoteLineRow[];
  orderCodeById: Map<string, string | null>;
  orderDeliveryDateById: Map<string, string | null>;
  wazeUrl: string | null;
  editable?: boolean;
  onOrderClick?: (orderId: string) => void;
  onQtyChange?: (key: string, qtyDelivered: number) => void;
  onRemoveLine?: (key: string) => void;
}>;

export function DeliveryNoteLinesTable({
  lines,
  orderCodeById,
  orderDeliveryDateById,
  wazeUrl,
  editable = false,
  onOrderClick,
  onQtyChange,
  onRemoveLine,
}: DeliveryNoteLinesTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-muted-foreground text-xs">
          <tr>
            <th className="px-4 py-2 font-medium">Producto</th>
            <th className="px-4 py-2 font-medium">Pedido</th>
            <th className="px-4 py-2 font-medium">Fecha entrega</th>
            <th className="px-4 py-2 text-right font-medium">Cant. pedida</th>
            <th className="px-4 py-2 text-right font-medium">Entrega</th>
            <th className="px-4 py-2 text-center font-medium">Waze</th>
            {editable ? <th className="w-10 px-2 py-2" /> : null}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const short = line.shortfall ?? Math.max(0, line.qtyOrdered - line.qtyDelivered);
            const deliveryDate = orderDeliveryDateById.get(line.orderId) ?? "—";
            return (
              <tr
                key={line.key}
                className={cn(
                  "border-b last:border-0",
                  short > 0 && "bg-amber-500/5",
                )}
              >
                <td className="px-4 py-2.5">{line.productName}</td>
                <td className="px-4 py-2.5">
                  {onOrderClick ? (
                    <button
                      className="font-mono text-primary text-xs hover:underline"
                      type="button"
                      onClick={() => onOrderClick(line.orderId)}
                    >
                      {formatOrderDisplayCode(
                        line.orderId,
                        orderCodeById.get(line.orderId) ?? null,
                      )}
                    </button>
                  ) : (
                    <span className="font-mono text-xs">
                      {formatOrderDisplayCode(
                        line.orderId,
                        orderCodeById.get(line.orderId) ?? null,
                      )}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 tabular-nums">{deliveryDate}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {line.qtyOrdered} {line.unit}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {editable && onQtyChange ? (
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button
                        aria-label="Reducir cantidad"
                        className="size-7"
                        size="icon"
                        type="button"
                        variant="outline"
                        onClick={() => onQtyChange(line.key, line.qtyDelivered - 1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <Input
                        className="h-7 w-16 text-center tabular-nums"
                        max={line.qtyOrdered}
                        min={0}
                        step={0.01}
                        type="number"
                        value={line.qtyDelivered}
                        onChange={(e) => onQtyChange(line.key, Number(e.target.value))}
                      />
                      <Button
                        aria-label="Aumentar cantidad"
                        className="size-7"
                        size="icon"
                        type="button"
                        variant="outline"
                        onClick={() => onQtyChange(line.key, line.qtyDelivered + 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                      <span className="text-muted-foreground text-xs">{line.unit}</span>
                    </div>
                  ) : (
                    <>
                      {line.qtyDelivered} {line.unit}
                    </>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <div className="flex justify-center">
                    <WazeCopyButton wazeUrl={wazeUrl} />
                  </div>
                </td>
                {editable && onRemoveLine ? (
                  <td className="px-2 py-2.5">
                    <Button
                      aria-label="Quitar línea"
                      className="size-8"
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() => onRemoveLine(line.key)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
