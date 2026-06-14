"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2, MoreHorizontal, Pencil, Plus, Trash2, Truck } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VendorFormDialog } from "@/components/workspace/vendor-form-dialog";
import {
  deleteVendorViaProxy,
  fetchVendorsViaProxy,
  type DashboardVendorRow,
} from "@/lib/inventory";
import { canMutateInventory } from "@/lib/roles";
import { workspaceTableCardClassName } from "@/lib/workspace-layout";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

export function ComprasProveedoresView() {
  const { role } = useWorkspacePermissions();
  const canEdit = canMutateInventory(role);

  const [rows, setRows] = useState<DashboardVendorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DashboardVendorRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardVendorRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchVendorsViaProxy();
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cargar los proveedores.");
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
        Cargando proveedores…
      </div>
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const result = await deleteVendorViaProxy(deleteTarget.vendorId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Proveedor eliminado.");
      setDeleteTarget(null);
      await reload();
    } finally {
      setDeleteBusy(false);
    }
  }

  const vendors = rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-lg tracking-tight">Proveedores</h2>
          <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-relaxed">
            Las empresas a las que les compras inventario. Aquí los registras para luego crear
            órdenes de compra y recibir mercadería.
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
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
              Agregar proveedor
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
          {error}
        </div>
      ) : vendors.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
          <p>Aún no tienes proveedores. Agrega el primero para empezar a registrar compras.</p>
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
              Agregar proveedor
            </Button>
          ) : null}
        </div>
      ) : (
        <div className={workspaceTableCardClassName}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="text-right">Días de entrega</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Estado</TableHead>
                {canEdit ? <TableHead className="w-12" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.vendorId}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      <Truck aria-hidden className="size-4 text-muted-foreground" />
                      {v.name}
                    </span>
                  </TableCell>
                  <TableCell>{v.contactName ?? "—"}</TableCell>
                  <TableCell>{v.email ?? "—"}</TableCell>
                  <TableCell>{v.phone ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {v.leadTimeDays != null ? v.leadTimeDays.toLocaleString("es") : "—"}
                  </TableCell>
                  <TableCell>{v.defaultCurrency ?? "—"}</TableCell>
                  <TableCell>
                    {v.isActive ? (
                      <Badge variant="secondary">Activo</Badge>
                    ) : (
                      <Badge variant="outline">Inactivo</Badge>
                    )}
                  </TableCell>
                  {canEdit ? (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-label={`Acciones para ${v.name}`}
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
                              setEditTarget(v);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil aria-hidden className="mr-2 size-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setDeleteTarget(v)}
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
        </div>
      )}

      <VendorFormDialog
        initial={editTarget}
        open={formOpen}
        onOpenChange={(next) => {
          setFormOpen(next);
          if (!next) setEditTarget(null);
        }}
        onSaved={() => void reload()}
      />

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{deleteTarget?.name}&quot;. Esta acción se puede revertir solo
              desde soporte.
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
