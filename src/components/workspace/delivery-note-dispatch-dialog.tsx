"use client";

import { useEffect, useState } from "react";

import { motion } from "motion/react";

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
import {
  deliveryNoteDisplayCode,
  fetchDeliveryNoteStockPreviewViaProxy,
  type DeliveryNoteListRow,
  type DeliveryNoteStockPreview,
} from "@/lib/delivery-notes";
import { cn } from "@/lib/utils";

export function DeliveryNoteDispatchDialog({
  note,
  onOpenChange,
  onConfirm,
}: Readonly<{
  note: DeliveryNoteListRow | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<boolean>;
}>) {
  const [preview, setPreview] = useState<DeliveryNoteStockPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [committed, setCommitted] = useState(false);

  useEffect(() => {
    if (!note) {
      setPreview(null);
      setCommitted(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const data = await fetchDeliveryNoteStockPreviewViaProxy(note.deliveryNoteId);
      if (!cancelled) setPreview(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [note]);

  const willMove = preview?.deductionPoint === "delivery_note";
  const hasNegative = preview?.lines.some((l) => l.goesNegative) ?? false;

  async function handleConfirm() {
    setBusy(true);
    try {
      if (willMove) setCommitted(true);
      const ok = await onConfirm();
      if (!ok) return;
      if (willMove) {
        await new Promise((r) => window.setTimeout(r, 600));
      }
      onOpenChange(false);
    } finally {
      setBusy(false);
      setCommitted(false);
    }
  }

  return (
    <AlertDialog open={note !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Despachar nota de entrega</AlertDialogTitle>
          <AlertDialogDescription>
            {note ? (
              <>
                <span className="font-mono">{deliveryNoteDisplayCode(note)}</span>
                {" · "}
                {note.customerName ?? `Cliente #${String(note.customerId)}`}
              </>
            ) : null}
            {willMove
              ? " Al confirmar se descontará el inventario de las líneas entregadas."
              : " El inventario se descuenta con el pedido; esta nota no mueve stock."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {willMove && preview ? (
          <div className="max-h-72 space-y-2 overflow-auto rounded-md border p-2 text-sm">
            {preview.lines.map((l, i) => (
              <motion.div
                key={`${l.productId}-${i}`}
                layout
                className="flex items-center justify-between gap-2"
              >
                <span className="min-w-0 truncate">{l.rawText}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs">
                    {l.availableBefore ?? "—"}{" "}
                    <span className="text-muted-foreground">→</span>{" "}
                    <span className={l.goesNegative ? "font-semibold text-destructive" : ""}>
                      {l.availableAfter ?? "—"}
                    </span>
                  </span>
                  {committed ? (
                    <motion.div
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1"
                      initial={{ opacity: 0, scale: 0.9 }}
                    >
                      <Badge className="text-[10px]" variant="secondary">
                        Reservado
                      </Badge>
                      <span className="text-muted-foreground text-xs">→</span>
                      <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
                        Vendido
                      </Badge>
                    </motion.div>
                  ) : null}
                </div>
              </motion.div>
            ))}
            {hasNegative ? (
              <p className="text-destructive text-xs">
                Una o más líneas quedarán con disponible negativo.
              </p>
            ) : null}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={cn(hasNegative && willMove && "bg-destructive hover:bg-destructive/90")}
            disabled={busy || preview === null}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {willMove ? "Despachar y descontar" : "Despachar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
