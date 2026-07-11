"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ProductsPageHeader } from "@/components/workspace/products-page-header";
import { ReorderSuggestionsTableSkeleton } from "@/components/workspace/workspace-skeletons";
import { formatMoneyCRC } from "@/lib/batch-format";
import {
  fetchReorderSuggestionsViaProxy,
  fetchWarehousesViaProxy,
  type DashboardWarehouseRow,
  type ReorderSuggestionRow,
} from "@/lib/inventory";
import { createPurchaseOrderViaProxy, expectedFromLeadTime } from "@/lib/purchase-orders";
import { canMutateInventory } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspaceTableCardClassName,
} from "@/lib/workspace-layout";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

type RowState = Readonly<{ selected: boolean; qty: number }>;

type VendorGroup = Readonly<{
  vendorId: number | null;
  vendorName: string;
  rows: ReorderSuggestionRow[];
}>;

function lineProjectedCost(row: ReorderSuggestionRow, qty: number): number | null {
  if (row.unitCost == null) return null;
  return Math.round((qty * row.unitCost + Number.EPSILON) * 100) / 100;
}

export function ReorderSuggestionsView() {
  const router = useRouter();
  const { role } = useWorkspacePermissions();
  const canEdit = canMutateInventory(role);

  const [rows, setRows] = useState<ReorderSuggestionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<readonly DashboardWarehouseRow[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [rowState, setRowState] = useState<Map<number, RowState>>(new Map());
  const [creatingVendorId, setCreatingVendorId] = useState<number | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    try {
      const data = await fetchReorderSuggestionsViaProxy({ signal });
      setRows(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "No se pudo cargar las sugerencias.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setRows(null);
    void refresh(ctrl.signal);
    return () => ctrl.abort();
  }, [refresh]);

  useEffect(() => {
    void fetchWarehousesViaProxy()
      .then((whs) => {
        setWarehouses(whs);
        const def = whs.find((w) => w.isDefault) ?? whs[0];
        setWarehouseId(def?.warehouseId ?? null);
      })
      .catch(() => setWarehouses([]));
  }, []);

  useEffect(() => {
    if (!rows) return;
    setRowState((prev) => {
      const next = new Map<number, RowState>();
      for (const row of rows) {
        const existing = prev.get(row.productId);
        next.set(
          row.productId,
          existing ?? {
            selected: row.vendorId != null,
            qty: row.suggestedQty,
          },
        );
      }
      return next;
    });
  }, [rows]);

  const groups = useMemo((): VendorGroup[] => {
    const map = new Map<string, VendorGroup>();
    for (const row of rows ?? []) {
      const key = row.vendorId != null ? String(row.vendorId) : "__none__";
      const vendorName = row.vendorName ?? "Sin proveedor con precio";
      const existing = map.get(key);
      if (existing) {
        map.set(key, { ...existing, rows: [...existing.rows, row] });
      } else {
        map.set(key, { vendorId: row.vendorId, vendorName, rows: [row] });
      }
    }
    return [...map.values()].sort((a, b) => {
      if (a.vendorId == null) return 1;
      if (b.vendorId == null) return -1;
      return a.vendorName.localeCompare(b.vendorName, "es");
    });
  }, [rows]);

  const selectedProjectedTotal = useMemo(() => {
    let sum = 0;
    for (const row of rows ?? []) {
      const st = rowState.get(row.productId);
      if (!st?.selected || row.vendorId == null || row.unitCost == null) continue;
      sum += st.qty * row.unitCost;
    }
    return Math.round((sum + Number.EPSILON) * 100) / 100;
  }, [rowState, rows]);

  function updateRow(productId: number, patch: Partial<RowState>) {
    setRowState((prev) => {
      const cur = prev.get(productId);
      if (!cur) return prev;
      const next = new Map(prev);
      next.set(productId, { ...cur, ...patch });
      return next;
    });
  }

  function toggleGroup(group: VendorGroup, checked: boolean) {
    if (group.vendorId == null) return;
    setRowState((prev) => {
      const next = new Map(prev);
      for (const row of group.rows) {
        const cur = next.get(row.productId);
        if (cur) next.set(row.productId, { ...cur, selected: checked });
      }
      return next;
    });
  }

  function groupSelectedCount(group: VendorGroup): number {
    return group.rows.filter((r) => rowState.get(r.productId)?.selected).length;
  }

  async function handleCreatePo(group: VendorGroup) {
    if (!canEdit) {
      toast.error("No tenés permiso para crear órdenes de compra.");
      return;
    }
    if (group.vendorId == null) return;
    if (!warehouseId) {
      toast.error("Seleccioná una bodega.");
      return;
    }

    const items: Array<{ productId: number; qtyOrdered: number; unitCost: number }> = [];
    let maxLead = 0;
    for (const row of group.rows) {
      const st = rowState.get(row.productId);
      if (!st?.selected || st.qty <= 0 || row.unitCost == null) continue;
      items.push({
        productId: row.productId,
        qtyOrdered: st.qty,
        unitCost: row.unitCost,
      });
      if (row.leadTimeDays != null && row.leadTimeDays > maxLead) {
        maxLead = row.leadTimeDays;
      }
    }
    if (items.length === 0) {
      toast.error("Seleccioná al menos un producto con cantidad mayor a 0.");
      return;
    }

    setCreatingVendorId(group.vendorId);
    try {
      const result = await createPurchaseOrderViaProxy({
        vendorId: group.vendorId,
        warehouseId,
        expectedAt: expectedFromLeadTime(maxLead > 0 ? maxLead : null),
        notes: null,
        extraCosts: 0,
        items,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Orden ${result.displayCode} creada.`);
      router.push(`/compras/ordenes/${encodeURIComponent(result.poId)}`);
    } finally {
      setCreatingVendorId(null);
    }
  }

  return (
    <div className={workspaceContentOuterClassName}>
      <ProductsPageHeader
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/products">Volver a Inventario</Link>
          </Button>
        }
        description="Productos bajo su mínimo de stock. Creá borradores de orden de compra por proveedor."
        subPage="Sugerencias de compra"
        title="Sugerencias de compra"
      />

      <div className={workspaceContentInnerClassName}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 space-y-1.5">
            <Label className="text-muted-foreground text-xs" htmlFor="reorder-warehouse">
              Bodega de recepción
            </Label>
            <Select
              value={warehouseId != null ? String(warehouseId) : ""}
              onValueChange={(v) => setWarehouseId(Number(v))}
            >
              <SelectTrigger id="reorder-warehouse">
                <SelectValue placeholder="Seleccioná bodega" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.warehouseId} value={String(wh.warehouseId)}>
                    {wh.name}
                    {wh.isDefault ? " (predeterminada)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {rows && rows.length > 0 ? (
            <p className="ml-auto text-sm">
              Costo proyectado (selección):{" "}
              <span className="font-medium tabular-nums">
                {formatMoneyCRC(selectedProjectedTotal)}
              </span>
            </p>
          ) : null}
        </div>

        {rows === null ? (
          <div className="mt-4">
            <ReorderSuggestionsTableSkeleton />
          </div>
        ) : error ? (
          <div className="mt-4 flex flex-col items-start gap-2">
            <p className="text-destructive text-sm">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRows(null);
                void refresh();
              }}
            >
              Reintentar
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-muted-foreground text-sm">
            No hay productos bajo su mínimo de stock en este momento.
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {groups.map((group) => {
              const poEnabled = group.vendorId != null && canEdit;
              const selectedInGroup = groupSelectedCount(group);
              const allSelected =
                group.vendorId != null &&
                group.rows.length > 0 &&
                selectedInGroup === group.rows.length;
              const isCreating = creatingVendorId === group.vendorId;

              return (
                <section key={group.vendorId ?? "__none__"} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-base">{group.vendorName}</h2>
                      <Badge variant="outline">
                        {group.rows.length} producto{group.rows.length === 1 ? "" : "s"}
                      </Badge>
                      {group.vendorId == null ? (
                        <span className="text-muted-foreground text-xs">
                          Agregá precio de proveedor para crear OC
                        </span>
                      ) : null}
                    </div>
                    {poEnabled ? (
                      <Button
                        disabled={isCreating || selectedInGroup === 0 || !warehouseId}
                        size="sm"
                        type="button"
                        onClick={() => void handleCreatePo(group)}
                      >
                        {isCreating ? (
                          <Loader2 aria-hidden className="size-4 animate-spin" />
                        ) : (
                          "Crear orden de compra"
                        )}
                      </Button>
                    ) : null}
                  </div>

                  <div className={workspaceTableCardClassName}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            {poEnabled ? (
                              <Checkbox
                                aria-label={`Seleccionar todos (${group.vendorName})`}
                                checked={allSelected}
                                onCheckedChange={(checked) =>
                                  toggleGroup(group, checked === true)
                                }
                              />
                            ) : null}
                          </TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Mínimo</TableHead>
                          <TableHead className="text-right">Disponible</TableHead>
                          <TableHead className="text-right">Por llegar</TableHead>
                          <TableHead className="text-right">Déficit</TableHead>
                          <TableHead className="text-right">Sugerido</TableHead>
                          <TableHead className="text-right">Costo unit.</TableHead>
                          <TableHead className="text-right">Costo proyectado</TableHead>
                          <TableHead className="text-right">Lead time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.rows.map((row) => {
                          const st = rowState.get(row.productId);
                          const selected = st?.selected ?? false;
                          const qty = st?.qty ?? row.suggestedQty;
                          const projected = lineProjectedCost(row, qty);
                          const rowPoEnabled = poEnabled && row.unitCost != null;

                          return (
                            <TableRow
                              key={row.productId}
                              className={cn(
                                row.deficit > row.minimum * 0.5 && "bg-destructive/5",
                              )}
                            >
                              <TableCell>
                                {rowPoEnabled ? (
                                  <Checkbox
                                    checked={selected}
                                    onCheckedChange={(checked) =>
                                      updateRow(row.productId, { selected: checked === true })
                                    }
                                  />
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                <Link
                                  className="hover:underline"
                                  href={`/products/${row.productId}`}
                                >
                                  {row.productName}
                                </Link>
                                {row.sku ? (
                                  <span className="block text-muted-foreground text-xs">
                                    {row.sku}
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.minimum.toLocaleString("es")}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.available.toLocaleString("es")}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.incoming.toLocaleString("es")}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                <Badge variant={row.deficit > 0 ? "destructive" : "outline"}>
                                  {row.deficit.toLocaleString("es")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {rowPoEnabled ? (
                                  <Input
                                    aria-label={`Cantidad sugerida para ${row.productName}`}
                                    className="ml-auto h-8 w-20 text-right tabular-nums"
                                    inputMode="decimal"
                                    min={0}
                                    type="number"
                                    value={qty}
                                    onChange={(e) => {
                                      const n = Number(e.target.value);
                                      updateRow(row.productId, {
                                        qty: Number.isFinite(n) && n >= 0 ? n : 0,
                                      });
                                    }}
                                  />
                                ) : (
                                  <span className="tabular-nums">
                                    {row.suggestedQty.toLocaleString("es")}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.unitCost != null ? formatMoneyCRC(row.unitCost) : "—"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {projected != null ? formatMoneyCRC(projected) : "—"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.leadTimeDays != null ? `${row.leadTimeDays} d` : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
