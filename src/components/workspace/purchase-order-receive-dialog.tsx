"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchBatchSettingsViaProxy,
  fetchLotNomenclatureViaProxy,
  fetchNextLotCodeViaProxy,
  renderLotCode,
  type BatchSettings,
  type LotNomenclature,
} from "@/lib/lot-nomenclature";
import {
  receivePurchaseOrderViaProxy,
  type PurchaseOrderItem,
} from "@/lib/purchase-orders";

type Row = {
  poItemId: string;
  productId: number;
  sku: string | null;
  productName: string;
  trackBatches: boolean;
  outstanding: number;
  qty: string;
  batchNumber: string;
  expiryDate: string;
  batchError: string | null;
  qtyError: string | null;
};

function buildInitialRows(items: readonly PurchaseOrderItem[]): Row[] {
  return items
    .filter((i) => i.qtyOutstanding > 0)
    .map((i) => ({
      poItemId: i.poItemId,
      productId: i.productId,
      sku: i.sku,
      productName: i.productName,
      trackBatches: i.trackBatches,
      outstanding: i.qtyOutstanding,
      qty: String(i.qtyOutstanding),
      batchNumber: "",
      expiryDate: "",
      batchError: null,
      qtyError: null,
    }));
}

export function PurchaseOrderReceiveDialog({
  open,
  onOpenChange,
  poId,
  items,
  vendorName,
  prefillFull = true,
  onReceived,
}: Readonly<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  poId: string;
  items: readonly PurchaseOrderItem[];
  vendorName: string;
  prefillFull?: boolean;
  onReceived: () => void;
}>) {
  const [receiptRef, setReceiptRef] = useState("");
  const initialRows = useMemo(() => buildInitialRows(items), [items]);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [pending, setPending] = useState(false);
  const [batchSettings, setBatchSettings] = useState<BatchSettings | null>(null);
  const [lotSettings, setLotSettings] = useState<LotNomenclature | null>(null);

  const lotGuide = useMemo(() => {
    if (!lotSettings?.enabled) return null;
    const sampleRow = rows.find((r) => r.trackBatches);
    return {
      pattern: lotSettings.pattern,
      example: renderLotCode(lotSettings.pattern, {
        date: new Date(),
        vendorName,
        sku: sampleRow?.sku ?? null,
        seq: lotSettings.nextSeq,
        seqPadding: lotSettings.seqPadding,
      }),
    };
  }, [lotSettings, rows, vendorName]);

  useEffect(() => {
    if (!open) return;
    setReceiptRef(crypto.randomUUID());
    const baseRows = buildInitialRows(items);
    setRows(baseRows);
    setLotSettings(null);

    void Promise.all([fetchBatchSettingsViaProxy(), fetchLotNomenclatureViaProxy()])
      .then(([batch, lot]) => {
        setBatchSettings(batch);
        setLotSettings(lot);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "No se pudo cargar configuración de lotes.");
      });

    const batchRows = baseRows.filter((r) => r.trackBatches);
    if (batchRows.length === 0) return;

    let cancelled = false;
    void (async () => {
      const codes = await Promise.all(
        batchRows.map((r) =>
          fetchNextLotCodeViaProxy(vendorName, r.sku, r.productId),
        ),
      );
      if (cancelled) return;
      const byPoItemId = new Map(
        batchRows.map((r, i) => [r.poItemId, codes[i] ?? null]),
      );
      setRows((rs) =>
        rs.map((r) => {
          const code = byPoItemId.get(r.poItemId);
          return code ? { ...r, batchNumber: code } : r;
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [open, items, vendorName]);

  function setRow(idx: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function receiveAll() {
    setRows((rs) =>
      rs.map((r) => ({ ...r, qty: String(r.outstanding), qtyError: null })),
    );
  }

  function clampQty(row: Row, raw: string): Partial<Row> {
    const trimmed = raw.trim();
    if (!trimmed) return { qty: raw, qtyError: null };
    const q = Number(trimmed);
    if (!Number.isFinite(q)) return { qty: raw, qtyError: null };
    if (q > row.outstanding + 1e-9) {
      return {
        qty: String(row.outstanding),
        qtyError: `No puede exceder lo pendiente (${row.outstanding}).`,
      };
    }
    return { qty: raw, qtyError: null };
  }

  async function submit() {
    const lines = [];
    let hasError = false;
    const nextRows = rows.map((r) => ({ ...r, batchError: null as string | null }));

    for (let i = 0; i < nextRows.length; i++) {
      const r = nextRows[i]!;
      const q = Number(r.qty);
      if (!Number.isFinite(q) || q <= 0) continue;
      if (q > r.outstanding + 1e-9) {
        nextRows[i] = {
          ...r,
          qtyError: `No puede exceder lo pendiente (${r.outstanding}).`,
        };
        hasError = true;
        continue;
      }
      if (r.trackBatches && batchSettings?.requireLotOnReceipt && !r.batchNumber.trim()) {
        nextRows[i] = {
          ...r,
          batchError: "El lote es obligatorio para este producto.",
        };
        hasError = true;
        continue;
      }
      lines.push({
        poItemId: r.poItemId,
        qtyReceived: q,
        batchNumber: r.trackBatches ? r.batchNumber.trim() : null,
        expiryDate: r.trackBatches && batchSettings?.trackExpiry && r.expiryDate ? r.expiryDate : null,
      });
    }

    if (hasError) {
      setRows(nextRows);
      return;
    }

    if (lines.length === 0) {
      toast.error("Ingresá al menos una cantidad recibida.");
      return;
    }
    if (!receiptRef) return;

    setPending(true);
    try {
      const res = await receivePurchaseOrderViaProxy(poId, receiptRef, lines);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Recepción registrada.");
      onReceived();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-[96vw]! flex-col overflow-hidden lg:max-w-360!">
        <DialogHeader>
          <DialogTitle>Recibir mercadería</DialogTitle>
        </DialogHeader>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Todas las líneas de esta orden ya fueron recibidas por completo.
          </p>
        ) : (
          <>
            {prefillFull ? (
              <p className="text-muted-foreground text-sm">
                Se recibirá la orden completa. Ajustá las cantidades si llegó menos.
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button size="sm" type="button" variant="outline" onClick={receiveAll}>
                Recibir todo
              </Button>
            </div>
            {lotGuide ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-muted-foreground text-sm">
                <span className="font-medium text-foreground">Guía de nomenclatura:</span>{" "}
                <span className="font-mono">{lotGuide.pattern}</span>
                <span>·</span>
                <span>Ejemplo: </span>
                <span className="font-mono text-foreground">{lotGuide.example}</span>
              </div>
            ) : null}
            <div className="min-h-0 overflow-auto">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-64">Producto</TableHead>
                  <TableHead className="w-24 text-right">Pendiente</TableHead>
                  <TableHead className="w-28">Recibir</TableHead>
                  <TableHead className="w-lg">Lote</TableHead>
                  {batchSettings?.trackExpiry !== false ? <TableHead className="w-64">Vence</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow key={r.poItemId}>
                    <TableCell className="font-medium">{r.productName}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.outstanding}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Input
                          className="w-24"
                          inputMode="decimal"
                          min={0}
                          max={r.outstanding}
                          value={r.qty}
                          onChange={(e) =>
                            setRow(idx, clampQty(r, e.target.value))
                          }
                        />
                        {r.qtyError ? (
                          <p className="text-destructive text-xs">{r.qtyError}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.trackBatches ? (
                        <div className="space-y-1">
                          <Input
                            className="w-120 font-mono"
                            placeholder={
                              lotGuide?.example ??
                              (batchSettings?.requireLotOnReceipt ? "N.º de lote" : "N.º de lote (opcional)")
                            }
                            value={r.batchNumber}
                            onChange={(e) =>
                              setRow(idx, {
                                batchNumber: e.target.value,
                                batchError: null,
                              })
                            }
                          />
                          {r.batchError ? (
                            <p className="text-destructive text-xs">{r.batchError}</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    {batchSettings?.trackExpiry !== false ? (
                      <TableCell>
                        {r.trackBatches ? (
                          <Input
                            className="w-60"
                            type="date"
                            value={r.expiryDate}
                            onChange={(e) => setRow(idx, { expiryDate: e.target.value })}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={pending || rows.length === 0}
            type="button"
            onClick={() => void submit()}
          >
            {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            Confirmar recepción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
