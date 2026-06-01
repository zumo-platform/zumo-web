"use client";

import { useCallback, useEffect, useState } from "react";

import { Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  completeCustomerTaskViaProxy,
  createCustomerTaskViaProxy,
  deleteCustomerTaskViaProxy,
  dismissCustomerTaskViaProxy,
  fetchCustomerTasksViaProxy,
  type CustomerTaskDetail,
} from "@/lib/customer-hub-api";

function formatDueAt(iso: string | null): string {
  if (!iso) return "\u2014";
  try {
    return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return "\u2014";
  }
}

function statusLabel(status: CustomerTaskDetail["status"]): string {
  switch (status) {
    case "open":
      return "Abierta";
    case "done":
      return "Completada";
    case "dismissed":
      return "Descartada";
    default:
      return status;
  }
}

function statusVariant(status: CustomerTaskDetail["status"]): "default" | "secondary" | "outline" {
  switch (status) {
    case "open":
      return "default";
    case "done":
      return "secondary";
    default:
      return "outline";
  }
}

export function CustomerTasksTab({
  customerId,
  onTasksChanged,
}: Readonly<{
  customerId: number;
  onTasksChanged?: () => void;
}>) {
  const [tasks, setTasks] = useState<CustomerTaskDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchCustomerTasksViaProxy(customerId, { includeClosed: showClosed });
      setTasks(rows);
    } finally {
      setLoading(false);
    }
  }, [customerId, showClosed]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const taskId = await createCustomerTaskViaProxy(customerId, {
        title: trimmed,
        dueAt: dueAt.trim() ? `${dueAt.trim()}T12:00:00.000Z` : null,
      });
      if (!taskId) throw new Error("No se pudo crear la tarea.");
      setTitle("");
      setDueAt("");
      await loadTasks();
      onTasksChanged?.();
      toast.success("Tarea creada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la tarea.");
    } finally {
      setSaving(false);
    }
  }

  async function runTaskAction(
    taskId: string,
    action: "complete" | "dismiss" | "delete",
  ): Promise<void> {
    setBusyTaskId(taskId);
    try {
      const ok =
        action === "complete"
          ? await completeCustomerTaskViaProxy(customerId, taskId)
          : action === "dismiss"
            ? await dismissCustomerTaskViaProxy(customerId, taskId)
            : await deleteCustomerTaskViaProxy(customerId, taskId);
      if (!ok) throw new Error("No se pudo actualizar la tarea.");
      await loadTasks();
      onTasksChanged?.();
      toast.success(action === "delete" ? "Tarea eliminada." : "Tarea actualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar la tarea.");
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <div className="space-y-6 py-4">
      <form className="rounded-lg border bg-card p-4 shadow-sm" onSubmit={(e) => void handleCreate(e)}>
        <h3 className="mb-4 font-medium text-sm">Nueva tarea</h3>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="space-y-2">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              placeholder="Ej. Llamar para confirmar pedido"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due">Vencimiento</Label>
            <Input
              id="task-due"
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4">
          <Button className="gap-1.5" disabled={saving || !title.trim()} size="sm" type="submit">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Agregar tarea
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-sm">Tareas del cliente</h3>
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={() => setShowClosed((prev) => !prev)}
        >
          {showClosed ? "Solo abiertas" : "Ver cerradas"}
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando tareas…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-32 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={4}>
                    No hay tareas para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.taskId}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell className="tabular-nums">{formatDueAt(task.dueAt)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(task.status)}>{statusLabel(task.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {task.status === "open" ? (
                          <>
                            <Button
                              aria-label="Completar tarea"
                              disabled={busyTaskId === task.taskId}
                              size="icon-sm"
                              type="button"
                              variant="ghost"
                              onClick={() => void runTaskAction(task.taskId, "complete")}
                            >
                              <Check className="size-4" />
                            </Button>
                            <Button
                              aria-label="Descartar tarea"
                              disabled={busyTaskId === task.taskId}
                              size="icon-sm"
                              type="button"
                              variant="ghost"
                              onClick={() => void runTaskAction(task.taskId, "dismiss")}
                            >
                              <X className="size-4" />
                            </Button>
                          </>
                        ) : null}
                        <Button
                          aria-label="Eliminar tarea"
                          className="text-destructive hover:text-destructive"
                          disabled={busyTaskId === task.taskId}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                          onClick={() => void runTaskAction(task.taskId, "delete")}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
