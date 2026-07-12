"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductsPageHeader } from "@/components/workspace/products-page-header";
import { AgingTableSkeleton } from "@/components/workspace/workspace-skeletons";
import { formatDateShort } from "@/lib/batch-format";
import { formatQty } from "@/lib/inventory-format";
import { canMutateInventory } from "@/lib/roles";
import {
  cancelStockCountViaProxy,
  completeStockCountViaProxy,
  fetchStockCountViaProxy,
  formatStockCountNumber,
  saveStockCountLinesViaProxy,
  STOCK_COUNT_STATUS_LABEL,
  stockCountStatusBadgeVariant,
  type StockCountDetail,
  type StockCountLineDetail,
} from "@/lib/stock-counts";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspaceTableCardClassName,
} from "@/lib/workspace-layout";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

function isEditable(status: StockCountDetail["status"]): boolean {
  return status === "open" || status === "counting" || status === "review";
}

function lineVariance(
  line: StockCountLineDetail,
  countedInput: string,
): number | null {
  if (countedInput.trim() === "") return null;
  const n = Number(countedInput);
  if (!Number.isFinite(n)) return null;
  return Math.round((n - line.systemQty + Number.EPSILON) * 10000) / 10000;
}

function varianceClass(variance: number | null): string {
  if (variance === null) return "text-muted-foreground";
  if (variance > 0) return "text-emerald-600 dark:text-emerald-400";
  if (variance < 0) return "text-destructive";
  return "text-muted-foreground";
}

export function StockCountDetailView({ countId }: Readonly<{ countId: string }>) {
  const { role } = useWorkspacePermissions();
  const canEdit = canMutateInventory(role);

  const [detail, setDetail] = useState<StockCountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Map<number, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchStockCountViaProxy(countId, { signal: ctrl.signal })
      .then((data) => {
        setDetail(data);
        const next = new Map<number, string>();
        for (const line of data.lines) {
          next.set(
            line.productId,
            line.countedQty === null ? "" : String(line.countedQty),
          );
        }
        setDraft(next);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "No se pudo cargar el conteo.");
        setDetail(null);
      });
    return () => ctrl.abort();
  }, [countId]);

  const reload = useCallback(async () => {
    const data = await fetchStockCountViaProxy(countId);
    setDetail(data);
    const next = new Map<number, string>();
    for (const line of data.lines) {
      next.set(line.productId, line.countedQty === null ? "" : String(line.countedQty));
    }
    setDraft(next);
    setError(null);
  }, [countId]);

  const editable = detail != null && isEditable(detail.status) && canEdit;

  const completeStats = useMemo(() => {
    if (!detail) return { counted: 0, total: 0, adjustLines: 0 };
    let counted = 0;
    let adjustLines = 0;
    for (const line of detail.lines) {
      const input = draft.get(line.productId) ?? "";
      if (input.trim() === "") continue;
      const n = Number(input);
      if (!Number.isFinite(n)) continue;
      counted += 1;
      const delta = Math.round((n - line.systemQty + Number.EPSILON) * 10000) / 10000;
      if (delta !== 0) adjustLines += 1;
    }
    return { counted, total: detail.productCount, adjustLines };
  }, [detail, draft]);

  const footerTotals = useMemo(() => {
    if (!detail) {
      return {
        systemTotal: 0,
        countedTotal: 0,
        varianceTotal: 0,
        countedLines: 0,
      };
    }

    let systemTotal = 0;
    let countedTotal = 0;
    let varianceTotal = 0;
    let countedLines = 0;

    for (const line of detail.lines) {
      systemTotal += line.systemQty;
      const input = draft.get(line.productId) ?? "";
      const variance = editable ? lineVariance(line, input) : line.variance;
      if (variance === null) continue;
      countedLines += 1;
      const countedQty = Number(input);
      if (Number.isFinite(countedQty)) countedTotal += countedQty;
      varianceTotal += variance;
    }

    return {
      systemTotal,
      countedTotal,
      varianceTotal: Math.round((varianceTotal + Number.EPSILON) * 10000) / 10000,
      countedLines,
    };
  }, [detail, draft, editable]);

  async function handleSave() {
    if (!detail || !editable) return;
    setSaving(true);
    try {
      const lines = detail.lines.map((line) => {
        const raw = draft.get(line.productId) ?? "";
        const countedQty =
          raw.trim() === "" ? null : Number.isFinite(Number(raw)) ? Number(raw) : null;
        return { productId: line.productId, countedQty };
      });
      await saveStockCountLinesViaProxy(countId, lines);
      toast.success("Conteo guardado.");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (!detail || !editable) return;
    setCompleting(true);
    try {
      await saveStockCountLinesViaProxy(
        countId,
        detail.lines.map((line) => {
          const raw = draft.get(line.productId) ?? "";
          const countedQty =
            raw.trim() === "" ? null : Number.isFinite(Number(raw)) ? Number(raw) : null;
          return { productId: line.productId, countedQty };
        }),
      );
      const result = await completeStockCountViaProxy(countId);
      toast.success(
        `Conteo completado. ${result.adjustedLines} línea(s) ajustada(s), ${result.applied} movimiento(s).`,
      );
      setConfirmOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo completar el conteo.");
    } finally {
      setCompleting(false);
    }
  }

  async function handleCancel() {
    if (!detail || !editable) return;
    setCancelling(true);
    try {
      await cancelStockCountViaProxy(countId);
      toast.success("Conteo cancelado.");
      setCancelOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cancelar el conteo.");
    } finally {
      setCancelling(false);
    }
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/products/stock-counts">Volver al listado</Link>
      </Button>
      {editable ? (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={saving || completing || cancelling}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 aria-hidden className="mr-2 size-4 animate-spin" /> : null}
            Guardar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={saving || completing || cancelling}
            onClick={() => setCancelOpen(true)}
          >
            Cancelar conteo
          </Button>
          <Button
            size="sm"
            disabled={saving || completing || cancelling}
            onClick={() => setConfirmOpen(true)}
          >
            Completar
          </Button>
        </>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProductsPageHeader
        title={
          detail
            ? `${formatStockCountNumber(detail.countId)}${detail.name ? ` — ${detail.name}` : ""}`
            : "Conteo"
        }
        subPage="Conteo"
        description={
          detail
            ? `${detail.warehouseName} · ${STOCK_COUNT_STATUS_LABEL[detail.status]} · ${detail.countedCount}/${detail.productCount} contados · ${formatDateShort(detail.createdAt)}`
            : "Cargando conteo…"
        }
        actions={actions}
      />

      <div className={workspaceContentOuterClassName}>
        <div className={workspaceContentInnerClassName}>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          {detail ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant={stockCountStatusBadgeVariant(detail.status)}>
                {STOCK_COUNT_STATUS_LABEL[detail.status]}
              </Badge>
              {detail.status === "applied" && detail.appliedAt ? (
                <span className="text-muted-foreground text-sm">
                  Aplicado el {formatDateShort(detail.appliedAt)}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className={cn(workspaceTableCardClassName, "overflow-x-auto")}>
            {detail === null ? (
              <AgingTableSkeleton />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[12rem]">Producto</TableHead>
                    <TableHead className="min-w-[7rem]">Bodega</TableHead>
                    <TableHead className="min-w-[8rem]">Proveedor</TableHead>
                    <TableHead
                      className="min-w-[8rem] text-right"
                      title="Existencia en bodega al crear el conteo (foto)"
                    >
                      Existencia al crear
                    </TableHead>
                    <TableHead className="w-32 text-right">Contado</TableHead>
                    <TableHead
                      className="min-w-[7rem] text-right"
                      title="Contado − existencia al crear"
                    >
                      Diferencia
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.lines.map((line) => {
                    const input = draft.get(line.productId) ?? "";
                    const variance = editable
                      ? lineVariance(line, input)
                      : line.variance;
                    return (
                      <TableRow key={line.productId}>
                        <TableCell>
                          <div className="font-medium">{line.name}</div>
                          {line.sku ? (
                            <div className="text-muted-foreground text-xs">{line.sku}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm">
                          {line.warehouseName?.trim() || detail.warehouseName}
                        </TableCell>
                        <TableCell className="text-sm">
                          {line.vendorName?.trim() || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(line.systemQty)}
                        </TableCell>
                        <TableCell className="text-right">
                          {editable ? (
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="any"
                              className="ml-auto h-8 w-full max-w-[7rem] text-right tabular-nums"
                              value={input}
                              onChange={(e) => {
                                const v = e.target.value;
                                setDraft((prev) => {
                                  const next = new Map(prev);
                                  next.set(line.productId, v);
                                  return next;
                                });
                              }}
                              placeholder="—"
                            />
                          ) : (
                            <span className="tabular-nums">
                              {line.countedQty === null ? "—" : formatQty(line.countedQty)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className={cn("text-right tabular-nums", varianceClass(variance))}
                        >
                          {variance === null ? "—" : formatQty(variance)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/40 font-medium">
                    <TableCell>
                      <div>Resumen</div>
                      <div className="font-normal text-muted-foreground text-xs">
                        {detail.productCount} productos · {footerTotals.countedLines} contados
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">—</TableCell>
                    <TableCell className="text-muted-foreground text-sm">—</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(footerTotals.systemTotal)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {footerTotals.countedLines > 0
                        ? formatQty(footerTotals.countedTotal)
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        varianceClass(
                          footerTotals.countedLines > 0 ? footerTotals.varianceTotal : null,
                        ),
                      )}
                    >
                      {footerTotals.countedLines > 0
                        ? formatQty(footerTotals.varianceTotal)
                        : "—"}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </div>

          {editable ? (
            <p className="mt-4 max-w-3xl text-muted-foreground text-xs leading-relaxed">
              <span className="font-medium text-foreground">Existencia al crear</span> es la foto
              del inventario en bodega al abrir el conteo.{" "}
              <span className="font-medium text-foreground">Diferencia</span> = contado − existencia
              al crear; es el ajuste que se aplicará al completar (p. ej. contado 1 y existencia
              500 → diferencia −499). Las ventas y recepciones durante el conteo ya están en el
              inventario y no se restan aquí.
            </p>
          ) : null}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Completar conteo?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  {completeStats.counted} de {completeStats.total} productos contados. Se ajustarán{" "}
                  {completeStats.adjustLines} línea(s). Las líneas sin contar no se modifican.
                </p>
                <p>Al completar, el conteo queda bloqueado.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completing}>Volver</AlertDialogCancel>
            <AlertDialogAction disabled={completing} onClick={() => void handleComplete()}>
              {completing ? <Loader2 aria-hidden className="mr-2 size-4 animate-spin" /> : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar conteo?</AlertDialogTitle>
            <AlertDialogDescription>
              El conteo quedará cancelado sin afectar el inventario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Volver</AlertDialogCancel>
            <AlertDialogAction disabled={cancelling} onClick={() => void handleCancel()}>
              {cancelling ? <Loader2 aria-hidden className="mr-2 size-4 animate-spin" /> : null}
              Cancelar conteo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
