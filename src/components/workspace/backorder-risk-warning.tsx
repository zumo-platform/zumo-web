"use client";

import Image from "next/image";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const BACKORDER_WARNING_ICON_SRC = "/icons/backorder-warning.png";

export const BACKORDER_RISK_ORDER_TOOLTIP =
  "Este pedido podría generar unidades pendientes (backorder): la cantidad pedida supera el stock disponible para uno o más productos.";

export function backorderRiskLineTooltip(args: {
  quantity: number;
  available: number;
}): string {
  return `Cantidad pedida (${args.quantity.toLocaleString("es")}) supera el stock disponible (${args.available.toLocaleString("es")}). Al confirmar, las unidades faltantes quedarán como Pendiente.`;
}

export function BackorderWarningIcon({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <Image
      alt=""
      aria-hidden
      className={cn("size-4 shrink-0 object-contain", className)}
      height={16}
      src={BACKORDER_WARNING_ICON_SRC}
      width={16}
    />
  );
}

export function BackorderRiskWarning({
  tooltip,
  className,
  side = "top",
}: Readonly<{
  tooltip: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("inline-flex shrink-0 cursor-default", className)}
          role="img"
          aria-label={tooltip}
        >
          <BackorderWarningIcon />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs" side={side}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
