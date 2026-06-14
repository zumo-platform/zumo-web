"use client";

import { useEffect, useState } from "react";

import { Clock } from "lucide-react";

import { SkeletonPopoverContent } from "@/components/ui/skeleton-blocks";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchMatchAudit,
  resolveChangedByLabel,
  type MatchAuditItem,
} from "@/lib/dashboard-matches";

export function MatchHistoryPopover({ aliasId }: Readonly<{ aliasId: string }>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MatchAuditItem[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void fetchMatchAudit(aliasId).then((rows) => {
      if (cancelled) return;
      setItems(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [aliasId, open]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Historial" size="icon" type="button" variant="ghost">
          <Clock className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-3">
        <p className="mb-2 font-medium text-sm">Historial de cambios</p>
        {loading ? (
          <SkeletonPopoverContent lines={3} />
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin registros todavía.</p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
            {items.map((row) => (
              <li key={row.auditId} className="rounded border px-2 py-1.5">
                <p className="font-medium capitalize">{row.action}</p>
                <p className="text-muted-foreground text-xs">
                  {resolveChangedByLabel(row.changedBy)} ·{" "}
                  {new Date(row.createdAt).toLocaleString("es")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
