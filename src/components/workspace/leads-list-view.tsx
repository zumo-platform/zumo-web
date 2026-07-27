"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  deleteLeadViaProxy,
  fetchLeadsViaProxy,
  type LeadRow,
} from "@/lib/dashboard-quotes";
import {
  fetchBusinessTypesViaProxy,
  fetchPipelineViaProxy,
  type BusinessType,
  type PipelineBoard,
} from "@/lib/dashboard-pipeline";

const MARKET_CATEGORY_LABEL: Readonly<Record<string, string>> = {
  restaurant: "Restaurante",
  cafe: "Cafetería",
  hotel: "Hotel",
  bakery: "Panadería",
  bar: "Bar",
  other: "Otro",
};

const SOURCE_LABEL: Readonly<Record<string, string>> = {
  market: "Market",
  pipeline: "Pipeline",
  manual: "Manual",
  whatsapp: "WhatsApp",
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function businessTypeLabel(lead: LeadRow): string {
  if (lead.businessCategory) {
    return MARKET_CATEGORY_LABEL[lead.businessCategory] ?? lead.businessCategory;
  }
  if (lead.source) {
    return SOURCE_LABEL[lead.source] ?? lead.source;
  }
  return "—";
}

export function LeadsListView({
  onBack,
}: Readonly<{ onBack: () => void }>) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<PipelineBoard | null>(null);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [convertLeadId, setConvertLeadId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeadRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchLeadsViaProxy();
      setLeads(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron cargar los leads.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchPipelineViaProxy(), fetchBusinessTypesViaProxy()])
      .then(([pipeline, types]) => {
        if (cancelled) return;
        setBoard(pipeline);
        setBusinessTypes(types);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const stages = useMemo(() => board?.stages ?? [], [board?.stages]);

  const openConvert = (leadId: number) => {
    setConvertLeadId(leadId);
    setSheetOpen(true);
  };

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLeadViaProxy(deleteTarget.leadId);
      toast.success("Lead eliminado.");
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el lead.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-semibold text-xl">Leads</h1>
            <p className="text-muted-foreground text-sm">
              Prospectos capturados antes de convertirse en oportunidades.
            </p>
          </div>
          <Button variant="outline" onClick={onBack}>
            Volver a oportunidades
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Cargando leads…
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
            No hay leads todavía. Convertí un negocio del Market o creá un prospecto desde una
            oportunidad.
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo de negocio</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.leadId}>
                    <TableCell className="font-medium">{lead.name || "—"}</TableCell>
                    <TableCell>{businessTypeLabel(lead)}</TableCell>
                    <TableCell>{lead.location || "—"}</TableCell>
                    <TableCell>{lead.assignedSellerName ?? "—"}</TableCell>
                    <TableCell>{formatDate(lead.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" onClick={() => openConvert(lead.leadId)}>
                          Convertir en Oportunidad
                        </Button>
                        <Button
                          aria-label={`Eliminar lead ${lead.name}`}
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTarget(lead)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {sheetOpen && board ? (
        <OpportunitySheet
          businessTypes={businessTypes}
          initialLeadId={convertLeadId}
          open={sheetOpen}
          opportunityId={null}
          stages={stages}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setConvertLeadId(null);
          }}
          onSaved={() => {
            setSheetOpen(false);
            setConvertLeadId(null);
            void reload();
            onBack();
          }}
        />
      ) : null}

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lead del sistema?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Se eliminará "${deleteTarget.name}" de forma permanente del listado de leads. Esta acción no se puede deshacer.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <Button disabled={deleting} variant="destructive" onClick={() => void confirmDelete()}>
              {deleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
