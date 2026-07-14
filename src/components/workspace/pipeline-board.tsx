"use client";

import { memo, useCallback, useMemo, useState } from "react";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  OPPORTUNITY_STATUS_LABEL,
  formatMoney,
  moveOpportunityStageViaProxy,
  type Opportunity,
  type PipelineStage,
} from "@/lib/dashboard-pipeline";
import { cn } from "@/lib/utils";

const MIN_COLUMN_WIDTH = 260;

type StageChange = (
  opportunityId: string,
  stageKey: string,
  patch?: { status?: Opportunity["status"] },
) => void;

const BoardCard = memo(function BoardCard({
  opp,
  moving,
  businessTypeLabel,
  onOpen,
}: Readonly<{
  opp: Opportunity;
  moving: boolean;
  businessTypeLabel?: string;
  onOpen: (id: string) => void;
}>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opp.opportunityId,
    data: { opportunityId: opp.opportunityId, stageKey: opp.stageKey },
    disabled: moving,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-shadow active:cursor-grabbing",
        isDragging && "opacity-40",
        moving && "opacity-70",
      )}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(opp.opportunityId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(opp.opportunityId);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-semibold text-sm">{opp.name || "Sin nombre"}</p>
        <div className="flex shrink-0 items-center gap-1">
          {moving ? <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" /> : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Acciones"
                className="size-7"
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onSelect={() => onOpen(opp.opportunityId)}>
                Ver / editar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{OPPORTUNITY_STATUS_LABEL[opp.status]}</Badge>
        {businessTypeLabel ? <Badge variant="outline">{businessTypeLabel}</Badge> : null}
        {opp.partyType === "lead" ? (
          <span className="text-[11px] text-muted-foreground">prospecto</span>
        ) : null}
      </div>

      <dl className="mt-2 space-y-1 text-muted-foreground text-xs">
        <div className="flex gap-1">
          <dt className="shrink-0">Total/mes:</dt>
          <dd>
            {formatMoney(opp.monthlyRecurringValue, opp.currency)}
            {opp.ordersPerMonth > 1 ? (
              <span className="text-muted-foreground/80"> ({opp.ordersPerMonth} pedidos)</span>
            ) : null}
          </dd>
        </div>
        {opp.location ? (
          <div className="flex gap-1">
            <dt className="shrink-0">Ubicación:</dt>
            <dd className="truncate">{opp.location}</dd>
          </div>
        ) : null}
        {opp.assignedSellerName ? (
          <div className="flex gap-1">
            <dt className="shrink-0">Vendedor:</dt>
            <dd className="truncate">{opp.assignedSellerName}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
});

function BoardColumn({
  stage,
  opps,
  movingId,
  businessTypeLabels,
  onOpen,
}: Readonly<{
  stage: PipelineStage;
  opps: Opportunity[];
  movingId: string | null;
  businessTypeLabels: ReadonlyMap<string, string>;
  onOpen: (id: string) => void;
}>) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-muted/50",
        isOver && "ring-2 ring-primary/40",
      )}
      style={{ minWidth: MIN_COLUMN_WIDTH }}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-muted/70 px-3 py-2.5">
        <h3 className="truncate font-medium text-sm">{stage.label}</h3>
        <Badge variant="secondary">{opps.length}</Badge>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
        {opps.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 px-3 py-8 text-center text-muted-foreground text-xs">
            Sin oportunidades
          </div>
        ) : (
          opps.map((o) => (
            <BoardCard
              key={o.opportunityId}
              businessTypeLabel={
                o.businessTypeKey ? businessTypeLabels.get(o.businessTypeKey) : undefined
              }
              moving={movingId === o.opportunityId}
              opp={o}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function PipelineBoard({
  stages,
  opportunities,
  businessTypeLabels,
  onStageChange,
  onOpen,
}: Readonly<{
  stages: PipelineStage[];
  opportunities: Opportunity[];
  businessTypeLabels: ReadonlyMap<string, string>;
  onStageChange: StageChange;
  onOpen: (id: string) => void;
}>) {
  const [movingId, setMovingId] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<Opportunity | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const oppsByStage = useMemo(() => {
    const m = new Map<string, Opportunity[]>();
    for (const s of stages) m.set(s.key, []);
    for (const o of opportunities) {
      const list = m.get(o.stageKey);
      if (list) list.push(o);
      else m.set(o.stageKey, [o]);
    }
    return m;
  }, [stages, opportunities]);

  const handleDragStart = useCallback(
    (e: DragStartEvent) => {
      const id = String(e.active.id);
      setActiveDrag(opportunities.find((o) => o.opportunityId === id) ?? null);
    },
    [opportunities],
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveDrag(null);
      const { active, over } = e;
      if (!over) return;
      const fromKey = active.data.current?.stageKey as string | undefined;
      const toKey = String(over.id);
      const id = String(active.id);
      if (!fromKey || !toKey || fromKey === toKey) return;

      onStageChange(id, toKey);
      setMovingId(id);
      void moveOpportunityStageViaProxy(id, toKey)
        .then((updated) => {
          if (updated) onStageChange(id, updated.stageKey, { status: updated.status });
        })
        .catch((err) => {
          onStageChange(id, fromKey);
          toast.error(err instanceof Error ? err.message : "No se pudo mover la oportunidad.");
        })
        .finally(() => setMovingId(null));
    },
    [onStageChange],
  );

  return (
    <DndContext
      collisionDetection={closestCorners}
      sensors={sensors}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      <div className="flex h-full min-h-0 w-full flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden pb-2">
        {stages.map((stage) => (
          <BoardColumn
            key={stage.key}
            businessTypeLabels={businessTypeLabels}
            movingId={movingId}
            onOpen={onOpen}
            opps={oppsByStage.get(stage.key) ?? []}
            stage={stage}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <div className="w-[min(100%,260px)] scale-[1.02] shadow-lg">
            <BoardCard
              businessTypeLabel={
                activeDrag.businessTypeKey
                  ? businessTypeLabels.get(activeDrag.businessTypeKey)
                  : undefined
              }
              moving={false}
              opp={activeDrag}
              onOpen={() => undefined}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
