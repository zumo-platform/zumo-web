"use client";

import { Badge } from "@/components/ui/badge";
import { InfoTip } from "@/components/workspace/info-tip";
import type { CustomerDiscountListSummary } from "@/lib/dashboard-customers";
import { DISCOUNT_LIST_STATUS_LABEL, DISCOUNT_TOOLTIPS } from "@/lib/pricing-copy";

const SCHEDULE_VARIANT = {
  active: "default",
  scheduled: "outline",
  expired: "destructive",
} as const;

export function CustomerDiscountListsSection({
  lists,
}: Readonly<{ lists: readonly CustomerDiscountListSummary[] }>) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 text-muted-foreground text-xs">
        <span>Listas de precios</span>
        <InfoTip label="Listas de precios" text={DISCOUNT_TOOLTIPS.discountList} />
      </div>
      {lists.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {lists.map((list) => (
            <li key={list.discountListId} className="rounded-md border bg-background px-2.5 py-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">{list.name}</span>
                <Badge className="text-xs" variant={SCHEDULE_VARIANT[list.scheduleStatus]}>
                  {DISCOUNT_LIST_STATUS_LABEL[list.scheduleStatus]}
                </Badge>
              </div>
              {list.appliesToAll ? (
                <p className="text-muted-foreground text-xs">Predeterminada</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs">Sin listas asignadas</p>
      )}
    </div>
  );
}
