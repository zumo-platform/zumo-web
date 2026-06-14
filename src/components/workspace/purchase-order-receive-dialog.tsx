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
  receivePurchaseOrderViaProxy,
  type PurchaseOrderItem,
} from "@/lib/purchase-orders";

type Row = {
  poItemId: string;
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
  onReceived,
}: Readonly<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  poId: string;
  items: readonly PurchaseOrderItem[];
  onReceived: () => void;
}>) {
  const [receiptRef, setReceiptRef] = useState("");
  const initialRows = useMemo(() => buildInitialRows(items), [items]);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setReceiptRef(crypto.randomUUID());
      setRows(buildInitialRows(items));
    }
  }, [open, items]);

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
      if (r.trackBatches && !r.batchNumber.trim()) {
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
        expiryDate: r.trackBatches && r.expiryDate ? r.expiryDate : null,
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recibir mercadería</DialogTitle>
        </DialogHeader>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Todas las líneas de esta orden ya fueron recibidas por completo.
          </p>
        ) : (
          <>
            <div className="flex justify-end">
              <Button size="sm" type="button" variant="outline" onClick={receiveAll}>
                Recibir todo
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead className="w-28">Recibir</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vence</TableHead>
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
                            placeholder="N.º de lote"
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
                    <TableCell>
                      {r.trackBatches ? (
                        <Input
                          type="date"
                          value={r.expiryDate}
                          onChange={(e) => setRow(idx, { expiryDate: e.target.value })}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
