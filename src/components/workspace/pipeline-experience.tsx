"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OpportunitySheet } from "@/components/workspace/opportunity-sheet";
import { PipelineBoard } from "@/components/workspace/pipeline-board";
import {
  fetchBusinessTypesViaProxy,
  fetchPipelineViaProxy,
  type BusinessType,
  type Opportunity,
  type PipelineBoard as PipelineBoardData,
} from "@/lib/dashboard-pipeline";

export function PipelineExperience({
  initialBoard,
}: Readonly<{ initialBoard: PipelineBoardData }>) {
  const [board, setBoard] = useState<PipelineBoardData>(initialBoard);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchBusinessTypesViaProxy()
      .then((rows) => {
        if (!cancelled) setBusinessTypes(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const businessTypeLabels = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of businessTypes) m.set(b.key, b.label);
    return m;
  }, [businessTypes]);

  const onStageChange = useCallback(
    (id: string, stageKey: string, patch?: { status?: Opportunity["status"] }) => {
      setBoard((prev) => ({
        ...prev,
        opportunities: prev.opportunities.map((o) =>
          o.opportunityId === id
            ? { ...o, stageKey, ...(patch?.status ? { status: patch.status } : {}) }
            : o,
        ),
      }));
    },
    [],
  );

  const reload = useCallback(async () => {
    const fresh = await fetchPipelineViaProxy();
    setBoard(fresh);
  }, []);

  const openNew = () => {
    setEditingId(null);
    setSheetOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setSheetOpen(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <div className="flex shrink-0 items-center justify-between">
        <h1 className="font-semibold text-lg">Pipeline de ventas</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Nueva oportunidad
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <PipelineBoard
          businessTypeLabels={businessTypeLabels}
          onOpen={openEdit}
          onStageChange={onStageChange}
          opportunities={board.opportunities}
          stages={board.stages}
        />
      </div>

      {sheetOpen ? (
        <OpportunitySheet
          businessTypes={businessTypes}
          open={sheetOpen}
          opportunityId={editingId}
          stages={board.stages}
          onOpenChange={setSheetOpen}
          onSaved={() => {
            setSheetOpen(false);
            void reload();
          }}
        />
      ) : null}
    </div>
  );
}
