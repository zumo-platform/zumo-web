"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { workspaceTableCardClassName } from "@/lib/workspace-layout";

/** A single shimmer line. Width is a Tailwind width class (e.g. "w-24", "w-1/2"). */
export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton aria-hidden className={cn("h-3.5 motion-reduce:animate-none", className)} />;
}

/** Circle/avatar/thumbnail placeholder. */
export function SkeletonBlock({ className }: { className?: string }) {
  return <Skeleton aria-hidden className={cn("motion-reduce:animate-none", className)} />;
}

type Col = { w: string; align?: "left" | "right" };

/**
 * Table skeleton that mirrors a real shadcn Table.
 * Pass the SAME column count + widths as the live table so there is zero layout shift.
 */
export function SkeletonTable({
  columns,
  rows = 8,
  withHeader = true,
  className,
  ariaLabel = "Cargando datos",
}: {
  columns: Col[];
  rows?: number;
  withHeader?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div role="status" aria-label={ariaLabel} className={cn("w-full", className)}>
      <span className="sr-only">Cargando…</span>
      <div className={workspaceTableCardClassName}>
        <Table>
          {withHeader ? (
            <TableHeader>
              <TableRow>
                {columns.map((c, i) => (
                  <TableHead key={i} className={c.align === "right" ? "text-right" : undefined}>
                    <SkeletonLine className={cn("h-3", c.w)} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          ) : null}
          <TableBody>
            {Array.from({ length: rows }).map((_, r) => (
              <TableRow key={r}>
                {columns.map((c, i) => (
                  <TableCell key={i}>
                    <div className={cn("flex", c.align === "right" && "justify-end")}>
                      <SkeletonLine className={c.w} />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Page header skeleton (title + subtitle) matching workspace page headers. */
export function SkeletonPageHeader() {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="shrink-0 border-b bg-background px-3 py-5 md:px-4"
    >
      <span className="sr-only">Cargando…</span>
      <SkeletonLine className="h-4 w-40" />
      <SkeletonLine className="mt-3 h-3 w-72 max-w-full" />
    </div>
  );
}

/** Card-grid skeleton (for board columns, settings cards, dashboards). */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 shadow-sm", className)}>
      <SkeletonLine className="h-4 w-1/3" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine key={i} className={i % 2 ? "w-2/3" : "w-full"} />
        ))}
      </div>
    </div>
  );
}

/** Vertical list of label/value rows — for detail panels & settings forms. */
export function SkeletonFieldList({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="space-y-4">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonLine className="h-3 w-28" />
          <SkeletonLine className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Compact inline skeleton for popovers and small async regions. */
export function SkeletonPopoverContent({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="space-y-2 py-1">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} className={i === 0 ? "w-full" : i === 1 ? "w-4/5" : "w-3/5"} />
      ))}
    </div>
  );
}
