"use client";

import {
  SkeletonBlock,
  SkeletonCard,
  SkeletonFieldList,
  SkeletonLine,
  SkeletonTable,
} from "@/components/ui/skeleton-blocks";
import {
  buildDefaultFlowItems,
  flowToBoardColumns,
} from "@/lib/order-status-flow";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspaceTableScrollClassName,
} from "@/lib/workspace-layout";

const BOARD_MIN_COLUMN_WIDTH = 260;

function ProductNameCellSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <SkeletonBlock className="size-10 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <SkeletonLine className="w-36" />
        <SkeletonLine className="w-24" />
      </div>
    </div>
  );
}

export function ProductsTableSkeleton() {
  const columns = [
    { w: "w-4" },
    { w: "w-10" },
    { w: "w-40" },
    { w: "w-24" },
    { w: "w-16" },
    { w: "w-28" },
    { w: "w-20", align: "right" as const },
    { w: "w-16", align: "right" as const },
    { w: "w-8", align: "right" as const },
  ];

  return (
    <div role="status" aria-label="Cargando inventario" className="w-full">
      <span className="sr-only">Cargando…</span>
      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b">
              {columns.map((c, i) => (
                <th key={i} className="h-10 px-2 text-left align-middle font-medium">
                  <SkeletonLine className={cn("h-3", c.w)} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, r) => (
              <tr key={r} className="border-b">
                <td className="p-2 align-middle">
                  <SkeletonLine className="w-4" />
                </td>
                <td className="p-2 align-middle">
                  <SkeletonBlock className="size-10 rounded-md" />
                </td>
                <td className="p-2 align-middle">
                  <ProductNameCellSkeleton />
                </td>
                {columns.slice(3).map((c, i) => (
                  <td key={i} className="p-2 align-middle">
                    <div className={cn("flex", c.align === "right" && "justify-end")}>
                      <SkeletonLine className={c.w} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProductsPageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div
        role="status"
        aria-label="Cargando inventario"
        className="shrink-0 border-b bg-background px-3 py-5 md:px-4"
      >
        <span className="sr-only">Cargando…</span>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <SkeletonLine className="h-5 w-32" />
            <SkeletonLine className="h-3 w-56 max-w-full" />
          </div>
          <div className="flex gap-2">
            <SkeletonLine className="h-9 w-28 rounded-md" />
            <SkeletonLine className="h-9 w-24 rounded-md" />
          </div>
        </div>
      </div>
      <div className={cn(workspaceTableScrollClassName, workspaceContentOuterClassName, "bg-background")}>
        <div className={workspaceContentInnerClassName}>
          <ProductsTableSkeleton />
        </div>
      </div>
    </div>
  );
}

export function OrdersTableSkeleton() {
  return (
    <SkeletonTable
      ariaLabel="Cargando pedidos"
      rows={10}
      columns={[
        { w: "w-4" },
        { w: "w-24" },
        { w: "w-36" },
        { w: "w-28" },
        { w: "w-24" },
        { w: "w-12", align: "right" },
        { w: "w-24" },
        { w: "w-16" },
        { w: "w-8", align: "right" },
      ]}
    />
  );
}

export function OrdersBoardSkeleton({ columnCount }: { columnCount?: number }) {
  const columns = flowToBoardColumns(buildDefaultFlowItems());
  const count = columnCount ?? columns.length;

  return (
    <div
      role="status"
      aria-label="Cargando flujo de pedidos"
      className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1"
    >
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex h-full min-h-[320px] shrink-0 flex-col rounded-xl border border-border/60 bg-muted/50"
          style={{ minWidth: BOARD_MIN_COLUMN_WIDTH, width: BOARD_MIN_COLUMN_WIDTH }}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-muted/70 px-3 py-2.5">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-5 w-8 rounded-full" />
          </div>
          <div className="flex flex-1 flex-col gap-3 p-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <SkeletonCard key={j} lines={2} className="shadow-none" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function InboxBoardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando inbox"
      className="flex h-full min-h-0 w-full flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden px-3 py-4 md:px-4"
    >
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: 3 }).map((_, columnIndex) => (
        <section
          className="flex h-full min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-muted/50"
          key={columnIndex}
          style={{ minWidth: BOARD_MIN_COLUMN_WIDTH }}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-muted/70 px-3 py-2.5">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-5 w-8 rounded-full" />
          </header>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2">
            {Array.from({ length: columnIndex === 1 ? 2 : 4 }).map((_, cardIndex) => (
              <div
                className="rounded-lg border border-border/60 bg-card px-3 py-2.5 shadow-sm"
                key={cardIndex}
              >
                <div className="flex items-start justify-between gap-3">
                  <SkeletonLine className="h-4 w-28" />
                  <SkeletonLine className="h-5 w-16 rounded-full" />
                </div>
                <SkeletonLine className="mt-3 h-3 w-4/5" />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <SkeletonLine className="h-5 w-20 rounded-full" />
                  <SkeletonLine className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function OrdersPageSkeleton({ viewMode = "list" }: { viewMode?: "list" | "board" }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div
        role="status"
        aria-label="Cargando pedidos"
        className="shrink-0 border-b bg-background px-3 py-5 md:px-4"
      >
        <span className="sr-only">Cargando…</span>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <SkeletonLine className="h-5 w-28" />
            <SkeletonLine className="h-3 w-64 max-w-full" />
          </div>
          <SkeletonLine className="h-9 w-32 rounded-md" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonLine className="h-9 w-48 rounded-md" />
          <SkeletonLine className="h-9 w-36 rounded-md" />
        </div>
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col", workspaceContentOuterClassName)}>
        <div className={cn(workspaceContentInnerClassName, "min-h-0 flex-1")}>
          {viewMode === "board" ? <OrdersBoardSkeleton /> : <OrdersTableSkeleton />}
        </div>
      </div>
    </div>
  );
}

export function CustomersTableSkeleton() {
  return (
    <SkeletonTable
      ariaLabel="Cargando clientes"
      rows={10}
      columns={[
        { w: "w-4" },
        { w: "w-40" },
        { w: "w-20" },
        { w: "w-32" },
        { w: "w-28" },
        { w: "w-24" },
        { w: "w-28" },
        { w: "w-16" },
        { w: "w-20" },
        { w: "w-24" },
        { w: "w-12", align: "right" },
        { w: "w-28" },
        { w: "w-16", align: "right" },
        { w: "w-24" },
        { w: "w-32" },
        { w: "w-8", align: "right" },
      ]}
    />
  );
}

export function CustomersPageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div
        role="status"
        aria-label="Cargando clientes"
        className="shrink-0 border-b bg-background px-3 py-5 md:px-4"
      >
        <span className="sr-only">Cargando…</span>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <SkeletonLine className="h-5 w-28" />
            <SkeletonLine className="h-3 w-72 max-w-full" />
          </div>
          <SkeletonLine className="h-9 w-32 rounded-md" />
        </div>
      </div>
      <div className={cn(workspaceTableScrollClassName, workspaceContentOuterClassName)}>
        <div className={workspaceContentInnerClassName}>
          <CustomersTableSkeleton />
        </div>
      </div>
    </div>
  );
}

export function CustomerDetailSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div
        role="status"
        aria-label="Cargando cliente"
        className="shrink-0 border-b bg-background px-3 py-5 md:px-4"
      >
        <span className="sr-only">Cargando…</span>
        <SkeletonLine className="h-3 w-64 max-w-full" />
        <SkeletonLine className="mt-4 h-6 w-48" />
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-4 flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLine key={i} className="h-9 w-24 rounded-md" />
            ))}
          </div>
          <SkeletonFieldList rows={6} />
        </div>
        <aside className="hidden w-72 shrink-0 border-l p-4 lg:block">
          <SkeletonFieldList rows={4} />
        </aside>
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div role="status" aria-label="Cargando producto" className={workspaceContentOuterClassName}>
      <span className="sr-only">Cargando…</span>
      <SkeletonLine className="h-3 w-56" />
      <SkeletonLine className="mt-4 h-6 w-40" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLine key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <SkeletonFieldList rows={8} />
        <SkeletonCard lines={4} />
      </div>
    </div>
  );
}

export function OrderDetailSheetSkeleton() {
  return (
    <div role="status" aria-label="Cargando pedido" className="space-y-6 px-6 py-5">
      <span className="sr-only">Cargando…</span>
      <div className="space-y-2">
        <SkeletonLine className="h-5 w-32" />
        <SkeletonLine className="h-3 w-48" />
      </div>
      <SkeletonFieldList rows={3} />
      <SkeletonTable
        ariaLabel="Cargando líneas del pedido"
        rows={4}
        columns={[
          { w: "w-40" },
          { w: "w-16", align: "right" },
          { w: "w-12" },
          { w: "w-16", align: "right" },
        ]}
      />
    </div>
  );
}

export function BackordersTableSkeleton() {
  return (
    <SkeletonTable
      ariaLabel="Cargando faltantes"
      rows={6}
      columns={[
        { w: "w-36" },
        { w: "w-28" },
        { w: "w-24" },
        { w: "w-16", align: "right" },
        { w: "w-16", align: "right" },
        { w: "w-20", align: "right" },
        { w: "w-20", align: "right" },
      ]}
    />
  );
}

export function AgingTableSkeleton() {
  return (
    <SkeletonTable
      ariaLabel="Cargando lotes por vencer"
      rows={6}
      columns={[
        { w: "w-36" },
        { w: "w-20" },
        { w: "w-24" },
        { w: "w-12", align: "right" },
        { w: "w-16", align: "right" },
        { w: "w-20", align: "right" },
        { w: "w-24", align: "right" },
        { w: "w-28" },
      ]}
    />
  );
}

export function ReorderSuggestionsTableSkeleton() {
  return (
    <SkeletonTable
      ariaLabel="Cargando sugerencias de compra"
      rows={5}
      columns={[
        { w: "w-4" },
        { w: "w-36" },
        { w: "w-14", align: "right" },
        { w: "w-14", align: "right" },
        { w: "w-14", align: "right" },
        { w: "w-14", align: "right" },
        { w: "w-16", align: "right" },
        { w: "w-20", align: "right" },
        { w: "w-24", align: "right" },
        { w: "w-16", align: "right" },
      ]}
    />
  );
}

export function WarehousesTableSkeleton() {
  return (
    <SkeletonTable
      ariaLabel="Cargando bodegas"
      rows={5}
      columns={[
        { w: "w-32" },
        { w: "w-20" },
        { w: "w-24" },
        { w: "w-16" },
        { w: "w-16" },
        { w: "w-20", align: "right" },
        { w: "w-16" },
        { w: "w-8", align: "right" },
      ]}
    />
  );
}

export function DeliverySettingsSkeleton() {
  return (
    <div role="status" aria-label="Cargando logística" className="space-y-8">
      <span className="sr-only">Cargando…</span>
      <SkeletonFieldList rows={4} />
      <SkeletonTable
        ariaLabel="Cargando zonas de entrega"
        rows={4}
        columns={[
          { w: "w-32" },
          { w: "w-40" },
          { w: "w-24" },
          { w: "w-8", align: "right" },
        ]}
      />
    </div>
  );
}

export function OrderFlowSettingsSkeleton() {
  return (
    <div role="status" aria-label="Cargando flujo de pedidos" className="space-y-8 pb-24">
      <span className="sr-only">Cargando…</span>
      <div className="space-y-2">
        <SkeletonLine className="h-6 w-40" />
        <SkeletonLine className="h-3 w-full max-w-2xl" />
      </div>
      <SkeletonTable
        ariaLabel="Cargando estados"
        rows={6}
        columns={[
          { w: "w-8" },
          { w: "w-32" },
          { w: "w-24" },
          { w: "w-16" },
          { w: "w-8", align: "right" },
        ]}
      />
    </div>
  );
}

export function TeamTableSkeleton() {
  return (
    <SkeletonTable
      ariaLabel="Cargando equipo"
      rows={5}
      columns={[
        { w: "w-32" },
        { w: "w-40" },
        { w: "w-24" },
        { w: "w-20" },
        { w: "w-16", align: "right" },
      ]}
    />
  );
}
