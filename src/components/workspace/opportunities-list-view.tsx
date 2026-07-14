"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OpportunitySheet } from "@/components/workspace/opportunity-sheet";
import {
  OPPORTUNITY_STATUS_LABEL,
  fetchBusinessTypesViaProxy,
  fetchPipelineViaProxy,
  formatMoney,
  type BusinessType,
  type PipelineBoard,
} from "@/lib/dashboard-pipeline";

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

export function OpportunitiesListView({
  initialBoard,
}: Readonly<{ initialBoard: PipelineBoard }>) {
  const [board, setBoard] = useState(initialBoard);
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

  const stageLabelByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of board.stages) m.set(s.key, s.label);
    return m;
  }, [board.stages]);

  const businessTypeLabelByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of businessTypes) m.set(b.key, b.label);
    return m;
  }, [businessTypes]);

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

  const rows = board.opportunities;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-xl">Oportunidades</h1>
          <p className="text-muted-foreground text-sm">
            Listado de oportunidades de venta en el pipeline.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Nueva oportunidad
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
          No hay oportunidades todavía. Creá la primera con “Nueva oportunidad”.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tipo de negocio</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="text-right">Recurrente/mes</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow
                  key={o.opportunityId}
                  className="cursor-pointer"
                  onClick={() => openEdit(o.opportunityId)}
                >
                  <TableCell className="font-medium">
                    {o.name || "—"}
                    {o.partyType === "lead" ? (
                      <span className="ml-2 text-muted-foreground text-xs">(prospecto)</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{stageLabelByKey.get(o.stageKey) ?? o.stageKey}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{OPPORTUNITY_STATUS_LABEL[o.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    {o.businessTypeKey
                      ? (businessTypeLabelByKey.get(o.businessTypeKey) ?? o.businessTypeKey)
                      : "—"}
                  </TableCell>
                  <TableCell>{o.location ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(o.monthlyRecurringValue, o.currency)}
                  </TableCell>
                  <TableCell>{formatDate(o.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
