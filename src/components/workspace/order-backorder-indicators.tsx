"use client";

import { BackorderPill } from "@/components/workspace/backorder-pill";
import {
  BackorderRiskWarning,
  BACKORDER_RISK_ORDER_TOOLTIP,
} from "@/components/workspace/backorder-risk-warning";
import { cn } from "@/lib/utils";

export function OrderBackorderIndicators({
  hasBackorderRisk = false,
  isBackordered = false,
  className,
  tooltip = BACKORDER_RISK_ORDER_TOOLTIP,
}: Readonly<{
  hasBackorderRisk?: boolean;
  isBackordered?: boolean;
  className?: string;
  tooltip?: string;
}>) {
  if (!hasBackorderRisk && !isBackordered) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {hasBackorderRisk ? <BackorderRiskWarning tooltip={tooltip} /> : null}
      {isBackordered ? <BackorderPill /> : null}
    </span>
  );
}
