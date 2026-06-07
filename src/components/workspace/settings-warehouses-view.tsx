"use client";

import { useCallback, useEffect, useState } from "react";

import { Boxes, Loader2, MoreHorizontal, Pencil, Plus, Trash2, Warehouse } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InventoryAdjustDialog } from "@/components/workspace/inventory-adjust-dialog";
import { InventoryTransferDialog } from "@/components/workspace/inventory-transfer-dialog";
import { WarehouseFormDialog } from "@/components/workspace/warehouse-form-dialog";
import {
  deleteWarehouseViaProxy,
  fetchWarehousesViaProxy,
  WAREHOUSE_KIND_LABEL,
  WAREHOUSE_PURPOSE_LABEL,
  type DashboardWarehouseRow,
} from "@/lib/inventory";
import { canMutateInventory } from "@/lib/roles";
import { workspaceTableCardClassName } from "@/lib/workspace-layout";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

function WarehouseKindIcon({ kind }: Readonly<{ kind: string }>) {
  return kind === "virtual" ? (
    <Boxes aria-hidden className="size-4 text-muted-foreground" />
  ) : (
    <Warehouse aria-hidden className="size-4 text-muted-foreground" />
  );
}

export function SettingsWarehousesView() {
  const { role } = useWorkspacePermissions();
  const canEdit = canMutateInventory(role);

  const [rows, setRows] = useState<DashboardWarehouseRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DashboardWarehouseRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardWarehouseRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchWarehousesViaProxy();
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cargar las bodegas.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (rows === null && !error) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Cargando bodegas…
      </div>
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const result = await deleteWarehouseViaProxy(deleteTarget.warehouseId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Bodega eliminada.");
      setDeleteTarget(null);
      await reload();
    } finally {
      setDeleteBusy(false);
    }
  }

  const warehouses = rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-lg tracking-tight">Bodegas</h2>
          <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-relaxed">
            Ubicaciones físicas y virtuales donde se almacena el inventario. Usá el filtro de bodega
            en Inventario para ver existencias por ubicación.
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="button" variant="outline" onClick={() => setAdjustOpen(true)}>
              Ajustar stock
            </Button>
            <Button size="sm" type="button" variant="outline" onClick={() => setTransferOpen(true)}>
              Transferir
            </Button>
            <Button
              className="gap-2"
              size="sm"
              type="button"
              onClick={() => {
                setEditTarget(null);
                setFormOpen(true);
              }}
            >
              <Plus aria-hidden className="size-4" />
              Crear bodega
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
          {error}
        </div>
      ) : warehouses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
          <p>Todavía no hay bodegas activas. Creá una bodega principal para empezar a registrar stock.</p>
          {canEdit ? (
            <Button
              className="mt-4 gap-2"
              size="sm"
              type="button"
              onClick={() => {
                setEditTarget(null);
                setFormOpen(true);
              }}
            >
              <Plus aria-hidden className="size-4" />
              Crear bodega
            </Button>
          ) : null}
        </div>
      ) : (
        <div className={workspaceTableCardClassName}>
          <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Propósito</TableHead>
                <TableHead>Venta</TableHead>
                <TableHead>Reorden</TableHead>
                <TableHead className="text-right">Productos activos</TableHead>
                <TableHead>Estado</TableHead>
                {canEdit ? <TableHead className="w-12" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((wh) => (
                <TableRow key={wh.warehouseId}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      <WarehouseKindIcon kind={wh.kind} />
                      {wh.name}
                      {wh.isDefault ? (
                        <Badge variant="secondary">Predeterminada</Badge>
                      ) : null}
                      {wh.isCustomerRestricted ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline">Reservada</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {wh.allowedCustomers && wh.allowedCustomers.length > 0
                              ? `Clientes: ${wh.allowedCustomers.map((c) => c.name).join(", ")}`
                              : "Inventario reservado para clientes específicos"}
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {WAREHOUSE_KIND_LABEL[wh.kind] ?? wh.kind}
                    </Badge>
                  </TableCell>
                  <TableCell>{WAREHOUSE_PURPOSE_LABEL[wh.purpose] ?? wh.purpose}</TableCell>
                  <TableCell>{wh.isSellable ? "Sí" : "No"}</TableCell>
                  <TableCell>{wh.countsForReorder ? "Sí" : "No"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {wh.activeProductCount.toLocaleString("es")}
                  </TableCell>
                  <TableCell>{wh.isActive ? "Activa" : "Inactiva"}</TableCell>
                  {canEdit ? (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-label={`Acciones para ${wh.name}`}
                            className="size-8"
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditTarget(wh);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil aria-hidden className="mr-2 size-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setDeleteTarget(wh)}
                          >
                            <Trash2 aria-hidden className="mr-2 size-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TooltipProvider>
        </div>
      )}

      <WarehouseFormDialog
        initial={editTarget}
        open={formOpen}
        onOpenChange={(next) => {
          setFormOpen(next);
          if (!next) setEditTarget(null);
        }}
        onSaved={() => void reload()}
      />

      <InventoryAdjustDialog
        open={adjustOpen}
        product={null}
        onOpenChange={setAdjustOpen}
        onSuccess={() => void reload()}
      />

      <InventoryTransferDialog
        open={transferOpen}
        product={null}
        onOpenChange={setTransferOpen}
        onSuccess={() => void reload()}
      />

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar bodega?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{deleteTarget?.name}&quot;. Solo es posible si no tiene existencias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancelar</AlertDialogCancel>
            <Button
              disabled={deleteBusy}
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              {deleteBusy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
