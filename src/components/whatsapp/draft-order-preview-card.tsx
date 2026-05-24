"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MatchCoverageIndicator } from "@/components/workspace/match-coverage-indicator";
import type { Order } from "@/lib/dashboard-types";
import { parseMatchCoverage } from "@/lib/match-coverage";
import { formatOrderDisplayCode } from "@/lib/order-display-code";

import { formatOrderCreatedDateTime } from "./whatsapp-helpers";

function statusBadgeLabel(status: string): string {
  switch (status) {
    case "draft":
      return "borrador";
    case "pending":
      return "pendiente";
    case "confirmed":
      return "confirmado";
    default:
      return status.replaceAll("_", " ");
  }
}

export function DraftOrderPreviewCard({
  order,
  pocName,
  onOpen,
}: Readonly<{
  order: Order;
  pocName: string;
  onOpen: () => void;
}>) {
  const code = formatOrderDisplayCode(order.orderId, order.displayCode);

  return (
    <button
      className="w-full text-left"
      type="button"
      onClick={onOpen}
    >
      <Card className="cursor-pointer gap-0 py-0 shadow-sm transition-colors hover:bg-muted/30">
        <CardContent className="flex items-start gap-2 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium font-mono text-sm">{code}</p>
              <Badge variant="outline">{statusBadgeLabel(order.status)}</Badge>
            </div>
            <p className="truncate text-sm">{pocName}</p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {formatOrderCreatedDateTime(order.createdAt)}
            </p>
            <MatchCoverageIndicator
              lineCount={order.lines?.length ?? 0}
              matchCoverage={parseMatchCoverage(order.matchCoverage)}
              isTouchless={Boolean(order.isTouchless)}
            />
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
