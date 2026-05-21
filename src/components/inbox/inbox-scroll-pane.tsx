import { forwardRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Native vertical scroll for inbox columns (Radix ScrollArea breaks in nested flex layouts). */
export const InboxScrollPane = forwardRef<
  HTMLDivElement,
  Readonly<{ children: ReactNode; className?: string }>
>(function InboxScrollPane({ children, className }, ref) {
  return (
    <div ref={ref} className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}>
      {children}
    </div>
  );
});
