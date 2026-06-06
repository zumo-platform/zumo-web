import { Badge } from "@/components/ui/badge";
import { BACKORDER_BADGE_CLASS, BACKORDER_PILL } from "@/lib/inventory-format";
import { cn } from "@/lib/utils";

export function BackorderPill({ className }: Readonly<{ className?: string }>) {
  return (
    <Badge
      className={cn(BACKORDER_BADGE_CLASS, className)}
      data-tone={BACKORDER_PILL.tone}
      variant="outline"
    >
      {BACKORDER_PILL.label}
    </Badge>
  );
}
