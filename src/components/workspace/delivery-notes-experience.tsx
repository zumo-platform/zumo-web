"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeliveryNoteCard } from "@/components/workspace/delivery-note-card";
import { DeliveryNoteDispatchDialog } from "@/components/workspace/delivery-note-dispatch-dialog";
import { DeliveryNoteLoadingDock } from "@/components/workspace/delivery-note-loading-dock";
import { DeliveryNotesToolbar } from "@/components/workspace/delivery-notes-toolbar";
import {
  DELIVERY_BOARD_COLUMNS,
  DELIVERY_BOARD_OFFBOARD,
  DELIVERY_NOTE_STATUS_LABELS,
  allowedDropTargets,
  deliveryNoteMatchesDateFilter,
  deliveryNoteMatchesSearch,
  fetchDeliveryNotesViaProxy,
  transitionDeliveryNoteViaProxy,
  type DeliveryNoteListRow,
  type DeliveryNoteStatus,
} from "@/lib/delivery-notes";
import { cn } from "@/lib/utils";
import {
  workspaceContentOuterClassName,
  workspacePageHeaderClassName,
} from "@/lib/workspace-layout";

const MIN_COLUMN_WIDTH = 260;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function DeliveryBoardColumn({
  status,
  label,
  cards,
  loading,
}: Readonly<{
  status: DeliveryNoteStatus;
  label: string;
  cards: DeliveryNoteListRow[];
  loading: boolean;
}>) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

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
        <h3 className="truncate font-medium text-sm">{label}</h3>
        <Badge variant="secondary">{cards.length}</Badge>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-8 text-center text-muted-foreground text-xs">
            Arrastrá una nota aquí
          </div>
        ) : (
          cards.map((note) => <DeliveryNoteCard key={note.deliveryNoteId} note={note} />)
        )}
      </div>
    </section>
  );
}

export function DeliveryNotesExperience() {
  const [notes, setNotes] = useState<DeliveryNoteListRow[] | null>(null);
  const [activeNote, setActiveNote] = useState<DeliveryNoteListRow | null>(null);
  const [dockOpen, setDockOpen] = useState(false);
  const [dispatchTarget, setDispatchTarget] = useState<DeliveryNoteListRow | null>(null);
  const [offboardFilter, setOffboardFilter] = useState<DeliveryNoteStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const debouncedQuery = useDebouncedValue(searchQuery, 150);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const reload = useCallback(async () => {
    setNotes(await fetchDeliveryNotesViaProxy());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredNotes = useMemo(() => {
    return (notes ?? []).filter(
      (n) =>
        deliveryNoteMatchesSearch(n, debouncedQuery) &&
        deliveryNoteMatchesDateFilter(n, dateFilter),
    );
  }, [notes, debouncedQuery, dateFilter]);

  const columns = useMemo(() => {
    const map = new Map<DeliveryNoteStatus, DeliveryNoteListRow[]>();
    for (const col of DELIVERY_BOARD_COLUMNS) map.set(col.key, []);
    for (const n of filteredNotes) {
      if (map.has(n.status)) map.get(n.status)!.push(n);
    }
    return map;
  }, [filteredNotes]);

  const offboardNotes = useMemo(() => {
    return filteredNotes.filter((n) => DELIVERY_BOARD_OFFBOARD.includes(n.status));
  }, [filteredNotes]);

  const filteredOffboard = useMemo(() => {
    if (offboardFilter === "all") return offboardNotes;
    return offboardNotes.filter((n) => n.status === offboardFilter);
  }, [offboardNotes, offboardFilter]);

  const commitTransition = useCallback(
    async (noteId: string, to: DeliveryNoteStatus) => {
      const prev = notes;
      setNotes((cur) =>
        (cur ?? []).map((n) => (n.deliveryNoteId === noteId ? { ...n, status: to } : n)),
      );
      const res = await transitionDeliveryNoteViaProxy(noteId, to);
      if (!res.ok) {
        setNotes(prev);
        toast.error(res.error);
        return false;
      }
      await reload();
      return true;
    },
    [notes, reload],
  );

  const handleDragStart = useCallback(
    (e: DragStartEvent) => {
      const note = (notes ?? []).find((n) => n.deliveryNoteId === String(e.active.id));
      setActiveNote(note ?? null);
    },
    [notes],
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveNote(null);
      const noteId = String(e.active.id);
      const overCol = e.over ? (String(e.over.id) as DeliveryNoteStatus) : null;
      const note = (notes ?? []).find((n) => n.deliveryNoteId === noteId);
      if (!note || !overCol || overCol === note.status) return;
      if (!allowedDropTargets(note.status).includes(overCol)) {
        toast.error("Ese cambio de estado no está permitido.");
        return;
      }
      if (overCol === "en_ruta") {
        setDispatchTarget(note);
        return;
      }
      void commitTransition(noteId, overCol);
    },
    [notes, commitTransition],
  );

  const hasActiveFilters = debouncedQuery.trim().length > 0 || dateFilter.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className={cn("shrink-0 border-b bg-background", workspacePageHeaderClassName)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-semibold text-2xl tracking-tight text-foreground md:text-3xl">
              Notas de entrega
            </h1>
            <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-relaxed md:text-[15px]">
              Arrastrá las notas por el tablero. Soltar en “En ruta” despacha la entrega.
            </p>
          </div>
          <Button className="shrink-0 gap-2" type="button" onClick={() => setDockOpen(true)}>
            <Plus className="size-4" />
            Nueva nota de entrega
          </Button>
        </div>
      </header>

      <div className={cn("shrink-0 border-b bg-background", workspaceContentOuterClassName, "py-3")}>
        <DeliveryNotesToolbar
          dateFilter={dateFilter}
          resultCount={filteredNotes.length}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery("")}
          onDateChange={setDateFilter}
          onSearchChange={setSearchQuery}
        />
      </div>

      <DndContext
        collisionDetection={closestCorners}
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <div className="flex h-full min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
          {hasActiveFilters && filteredNotes.length === 0 && notes !== null ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center text-muted-foreground text-sm">
              No hay notas de entrega que coincidan con la búsqueda o la fecha seleccionada.
            </div>
          ) : (
            <div className="flex h-full min-h-0 w-full flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden">
              {DELIVERY_BOARD_COLUMNS.map((col) => (
                <DeliveryBoardColumn
                  key={col.key}
                  cards={columns.get(col.key) ?? []}
                  label={col.label}
                  loading={notes === null}
                  status={col.key}
                />
              ))}
            </div>
          )}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeNote ? (
            <div className="w-[min(100%,260px)] scale-[1.02]">
              <DeliveryNoteCard dragging note={activeNote} overlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {offboardNotes.length > 0 ? (
        <div className="shrink-0 border-t px-4 py-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">Otras:</span>
            <Button
              className="h-7 text-xs"
              size="sm"
              type="button"
              variant={offboardFilter === "all" ? "default" : "outline"}
              onClick={() => setOffboardFilter("all")}
            >
              Todas ({offboardNotes.length})
            </Button>
            {DELIVERY_BOARD_OFFBOARD.map((status) => {
              const count = offboardNotes.filter((n) => n.status === status).length;
              if (count === 0) return null;
              return (
                <Button
                  key={status}
                  className="h-7 text-xs"
                  size="sm"
                  type="button"
                  variant={offboardFilter === status ? "default" : "outline"}
                  onClick={() => setOffboardFilter(status)}
                >
                  {DELIVERY_NOTE_STATUS_LABELS[status]} ({count})
                </Button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredOffboard.map((note) => (
              <DeliveryNoteCard key={note.deliveryNoteId} note={note} />
            ))}
          </div>
        </div>
      ) : null}

      <DeliveryNoteLoadingDock
        open={dockOpen}
        onCreated={() => {
          setDockOpen(false);
          void reload();
        }}
        onOpenChange={setDockOpen}
      />

      <DeliveryNoteDispatchDialog
        note={dispatchTarget}
        onConfirm={async () => {
          if (!dispatchTarget) return false;
          return commitTransition(dispatchTarget.deliveryNoteId, "en_ruta");
        }}
        onOpenChange={(open) => {
          if (!open) setDispatchTarget(null);
        }}
      />
    </div>
  );
}
