"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatQty } from "@/lib/inventory-format";
import { cn } from "@/lib/utils";

export const STOCK_RESERVATION_ORDER_TOOLTIP =
  "Este pedido confirmó stock en bodega. Las unidades siguen reservadas hasta marcarlo entregado o cancelarlo.";

export function OrderStockReservationIndicator({
  hasHeldStockReservation = false,
  heldReservedUnits = 0,
  className,
  tooltip = STOCK_RESERVATION_ORDER_TOOLTIP,
}: Readonly<{
  hasHeldStockReservation?: boolean;
  heldReservedUnits?: number;
  className?: string;
  tooltip?: string;
}>) {
  if (!hasHeldStockReservation) return null;

  const unitsSuffix =
    heldReservedUnits > 0 ? ` · ${formatQty(heldReservedUnits)} uds.` : "";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          className={cn(
            "border-sky-500/35 bg-sky-500/10 font-normal text-sky-950 dark:text-sky-100",
            className,
          )}
          variant="outline"
        >
          Inventario reservado{unitsSuffix}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
