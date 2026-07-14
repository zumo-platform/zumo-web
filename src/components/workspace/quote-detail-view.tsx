"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { QuoteForm } from "@/components/workspace/quote-form";
import {
  QUOTE_STATUS_LABEL,
  deleteQuoteViaProxy,
  fetchQuoteViaProxy,
  formatMoney,
  transitionQuoteViaProxy,
  type QuoteStatus,
  type QuoteWithItems,
} from "@/lib/dashboard-quotes";

export function QuoteDetailView({ quoteId }: Readonly<{ quoteId: string }>) {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  async function reload() {
    const q = await fetchQuoteViaProxy(quoteId);
    setQuote(q);
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, [quoteId]);

  async function doTransition(status: QuoteStatus) {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await transitionQuoteViaProxy(quoteId, status);
      setQuote(updated);
      toast.success("Estado actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (busy) return;
    setBusy(true);
    try {
      await deleteQuoteViaProxy(quoteId);
      toast.success("Cotización eliminada");
      router.push("/quotes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar.");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  if (!quote) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
        No pudimos cargar la cotización.
      </div>
    );
  }

  if (editing && quote.status === "draft") {
    return <QuoteForm mode="edit" initial={quote} />;
  }

  const isDraft = quote.status === "draft";
  const isSent = quote.status === "sent";
  const isAccepted = quote.status === "accepted";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-xl">{quote.quoteNumber ?? "Borrador"}</h1>
            <Badge>{QUOTE_STATUS_LABEL[quote.status]}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {quote.recipientName}
            {quote.recipientType === "lead" ? " (prospecto)" : ""} · {quote.quoteDate}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isDraft ? (
            <>
              <Button variant="outline" disabled={busy} onClick={() => setEditing(true)}>
                Editar
              </Button>
              <Button disabled={busy} onClick={() => void doTransition("sent")}>
                Enviar
              </Button>
            </>
          ) : null}
          {isSent ? (
            <>
              <Button variant="outline" disabled={busy} onClick={() => void doTransition("accepted")}>
                Marcar aceptada
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => void doTransition("rejected")}>
                Rechazada
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => void doTransition("expired")}>
                Vencida
              </Button>
            </>
          ) : null}
          {isAccepted ? (
            <Button disabled title="Disponible próximamente">
              Convertir a pedido
            </Button>
          ) : null}
          {isDraft ? (
            <Button variant="destructive" disabled={busy} onClick={() => void doDelete()}>
              Eliminar
            </Button>
          ) : null}
        </div>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Desc. %</TableHead>
              <TableHead className="text-right">Importe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quote.items.map((it) => (
              <TableRow key={it.quoteItemId}>
                <TableCell className="text-muted-foreground">{it.lineNo}</TableCell>
                <TableCell>{it.productName ?? it.rawText}</TableCell>
                <TableCell className="text-right">
                  {it.quantity} {it.unit}
                </TableCell>
                <TableCell className="text-right">
                  {it.unitPrice != null ? formatMoney(it.unitPrice, quote.currency) : "—"}
                </TableCell>
                <TableCell className="text-right">{it.discountPct}%</TableCell>
                <TableCell className="text-right font-medium">
                  {formatMoney(it.lineTotal, quote.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatMoney(quote.subtotal, quote.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Descuentos</dt>
              <dd>- {formatMoney(quote.discountTotal, quote.currency)}</dd>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <dt>Total neto</dt>
              <dd>{formatMoney(quote.netTotal, quote.currency)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {quote.paymentTerms || quote.termsAndConditions ? (
        <section className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2 text-sm">
          {quote.paymentTerms ? (
            <div>
              <h3 className="font-medium">Términos de pago</h3>
              <p className="whitespace-pre-wrap text-muted-foreground">{quote.paymentTerms}</p>
            </div>
          ) : null}
          {quote.termsAndConditions ? (
            <div>
              <h3 className="font-medium">Términos y condiciones</h3>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {quote.termsAndConditions}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
