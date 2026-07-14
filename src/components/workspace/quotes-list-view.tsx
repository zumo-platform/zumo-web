"use client";

import { useMemo, useState } from "react";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  QUOTE_STATUS_LABEL,
  formatMoney,
  type QuoteRow,
  type QuoteStatus,
} from "@/lib/dashboard-quotes";

const STATUS_FILTERS: ReadonlyArray<{ value: QuoteStatus | "all"; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "draft", label: "Borradores" },
  { value: "sent", label: "Enviadas" },
  { value: "accepted", label: "Aceptadas" },
  { value: "rejected", label: "Rechazadas" },
  { value: "expired", label: "Vencidas" },
  { value: "converted_to_order", label: "Convertidas" },
];

function statusVariant(s: QuoteStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (s) {
    case "accepted":
    case "converted_to_order":
      return "default";
    case "sent":
      return "secondary";
    case "rejected":
    case "expired":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

export function QuotesListView({ initialQuotes }: Readonly<{ initialQuotes: QuoteRow[] }>) {
  const router = useRouter();
  const [filter, setFilter] = useState<QuoteStatus | "all">("all");

  const rows = useMemo(
    () => (filter === "all" ? initialQuotes : initialQuotes.filter((q) => q.status === filter)),
    [initialQuotes, filter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-xl">Cotizaciones</h1>
          <p className="text-muted-foreground text-sm">
            Cotizaciones para clientes y prospectos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as QuoteStatus | "all")}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild>
            <Link href="/quotes/creation">
              <Plus className="size-4" />
              Nueva cotización
            </Link>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
          No hay cotizaciones todavía. Creá la primera con “Nueva cotización”.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N.º</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Válida hasta</TableHead>
                <TableHead className="text-right">Total neto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((q) => (
                <TableRow
                  key={q.quoteId}
                  className="cursor-pointer"
                  onClick={() => router.push(`/quotes/${q.quoteId}`)}
                >
                  <TableCell className="font-medium">{q.quoteNumber ?? "—"}</TableCell>
                  <TableCell>
                    {q.recipientName || "—"}
                    {q.recipientType === "lead" ? (
                      <span className="ml-2 text-muted-foreground text-xs">(prospecto)</span>
                    ) : null}
                    {q.createdByAi ? (
                      <span className="ml-2 text-muted-foreground text-xs">· AI</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{q.quoteDate}</TableCell>
                  <TableCell>{q.validUntil ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(q.netTotal, q.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(q.status)}>
                      {QUOTE_STATUS_LABEL[q.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
