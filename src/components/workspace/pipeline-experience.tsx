"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OpportunitySheet } from "@/components/workspace/opportunity-sheet";
import { PipelineBoard } from "@/components/workspace/pipeline-board";
import { fetchSellersViaProxy } from "@/lib/dashboard-customers";
import {
  fetchBusinessTypesViaProxy,
  fetchPipelineViaProxy,
  type BusinessType,
  type Opportunity,
  type PipelineBoard as PipelineBoardData,
} from "@/lib/dashboard-pipeline";

function matchesSearch(opp: Opportunity, query: string): boolean {
  if (!query) return true;
  if (opp.name.toLowerCase().includes(query)) return true;
  return opp.items.some((item) => {
    const label = (item.productName ?? item.rawText).trim().toLowerCase();
    return label.includes(query);
  });
}

export function PipelineExperience({
  initialBoard,
}: Readonly<{ initialBoard: PipelineBoardData }>) {
  const [board, setBoard] = useState<PipelineBoardData>(initialBoard);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [sellers, setSellers] = useState<Array<{ sellerId: number; name: string }>>([]);
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchBusinessTypesViaProxy(), fetchSellersViaProxy()])
      .then(([types, sellerRows]) => {
        if (cancelled) return;
        setBusinessTypes(types);
        setSellers(
          sellerRows
            .filter((s) => s.active)
            .map((s) => ({ sellerId: s.sellerId, name: s.name })),
        );
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

  const filteredOpportunities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return board.opportunities.filter((opp) => {
      if (sellerFilter === "none") {
        if (opp.assignedSellerId != null) return false;
      } else if (sellerFilter !== "all") {
        const sellerId = Number(sellerFilter);
        if (!Number.isFinite(sellerId) || opp.assignedSellerId !== sellerId) return false;
      }
      return matchesSearch(opp, q);
    });
  }, [board.opportunities, searchQuery, sellerFilter]);

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
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="font-semibold text-lg">Pipeline de ventas</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Nueva oportunidad
        </Button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Select value={sellerFilter} onValueChange={setSellerFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los vendedores</SelectItem>
            <SelectItem value="none">Sin vendedor</SelectItem>
            {sellers.map((seller) => (
              <SelectItem key={seller.sellerId} value={String(seller.sellerId)}>
                {seller.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por producto, prospecto o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <PipelineBoard
          businessTypeLabels={businessTypeLabels}
          onOpen={openEdit}
          onStageChange={onStageChange}
          opportunities={filteredOpportunities}
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
