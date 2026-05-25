"use client";

import { useCallback, useState } from "react";

import { CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  confirmDashboardOrderViaProxy,
  convertDashboardOrderViaProxy,
  deleteDashboardDraftViaProxy,
  rejectDashboardOrderViaProxy,
  type DashboardOrderPatch,
} from "@/lib/dashboard-orders";

export type OrderLifecycleActionsProps = Readonly<{
  orderId: string;
  status: string;
  blocked?: boolean;
  blockedTitle?: string;
  disabled?: boolean;
  deliveryDateValid?: boolean;
  onBeforeAction?: () => Promise<boolean>;
  showEditLink?: boolean;
  onStatusChange?: (orderId: string, status: string, patch?: DashboardOrderPatch) => void;
  onRemoved?: (orderId: string) => void;
  onDone?: () => void;
  layout?: "stack" | "inline";
}>;

export function OrderLifecycleActions({
  orderId,
  status,
  blocked = false,
  blockedTitle,
  disabled = false,
  deliveryDateValid = true,
  onBeforeAction,
  showEditLink = true,
  onStatusChange,
  onRemoved,
  onDone,
  layout = "stack",
}: OrderLifecycleActionsProps) {
  const [busy, setBusy] = useState<"convert" | "confirm" | "reject" | "delete" | null>(null);

  const isBusy = busy !== null;
  const actionsDisabled = blocked || disabled || isBusy || !deliveryDateValid;

  const runWithPersist = useCallback(async (): Promise<boolean> => {
    if (!deliveryDateValid) {
      toast.error("Seleccioná una fecha de entrega válida (hoy o posterior).");
      return false;
    }
    if (onBeforeAction) {
      const ok = await onBeforeAction();
      if (!ok) return false;
    }
    return true;
  }, [deliveryDateValid, onBeforeAction]);

  const handleConvert = useCallback(async () => {
    if (blocked || disabled || isBusy || status !== "draft") return;
    if (!(await runWithPersist())) return;
    setBusy("convert");
    try {
      const updated = await convertDashboardOrderViaProxy(orderId);
      toast.success("Borrador convertido en pedido");
      onStatusChange?.(orderId, "pending", {
        displayCode: updated?.displayCode ?? null,
        expiresAt: null,
        isExpired: false,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo convertir el borrador.");
    } finally {
      setBusy(null);
    }
  }, [blocked, disabled, isBusy, orderId, onStatusChange, runWithPersist, status]);

  const handleConfirm = useCallback(async () => {
    if (blocked || disabled || isBusy || status !== "pending") return;
    if (!(await runWithPersist())) return;
    setBusy("confirm");
    try {
      await confirmDashboardOrderViaProxy(orderId);
      toast.success("Pedido confirmado");
      onStatusChange?.(orderId, "confirmed");
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo confirmar el pedido.");
    } finally {
      setBusy(null);
    }
  }, [blocked, disabled, isBusy, orderId, onDone, onStatusChange, runWithPersist, status]);

  const handleRejectPending = useCallback(async () => {
    if (actionsDisabled || status !== "pending") return;
    setBusy("reject");
    try {
      await rejectDashboardOrderViaProxy(orderId);
      toast.success("Pedido cancelado");
      onStatusChange?.(orderId, "cancelled");
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cancelar el pedido.");
    } finally {
      setBusy(null);
    }
  }, [actionsDisabled, orderId, onDone, onStatusChange, status]);

  const handleDeleteDraft = useCallback(async () => {
    if (actionsDisabled || status !== "draft") return;
    setBusy("delete");
    try {
      await deleteDashboardDraftViaProxy(orderId);
      toast.success("Borrador rechazado");
      onRemoved?.(orderId);
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo rechazar el borrador.");
    } finally {
      setBusy(null);
    }
  }, [actionsDisabled, orderId, onDone, onRemoved, status]);

  if (status !== "draft" && status !== "pending") {
    return null;
  }

  const inline = layout === "inline";
  const lifecycleTitle = blocked
    ? blockedTitle
    : !deliveryDateValid
      ? "Seleccioná una fecha de entrega válida (hoy o posterior)."
      : undefined;

  if (status === "draft") {
    return (
      <div className={inline ? "flex flex-wrap items-center justify-end gap-2" : "flex flex-col gap-2"}>
        <div className={inline ? "flex flex-wrap items-center gap-2" : "flex flex-col gap-2 sm:flex-row sm:flex-wrap"}>
          <Button
            className={inline ? undefined : "w-full sm:w-auto"}
            disabled={actionsDisabled}
            size="sm"
            title={lifecycleTitle}
            type="button"
            variant="outline"
            onClick={() => void handleDeleteDraft()}
          >
            {busy === "delete" ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Trash2 aria-hidden className="size-4" />
            )}
            Rechazar
          </Button>
          {showEditLink && !blocked ? (
            <Button asChild className={inline ? undefined : "w-full sm:w-auto"} size="sm" variant="outline">
              <Link href={`/orders/${encodeURIComponent(orderId)}/edit`}>Editar</Link>
            </Button>
          ) : null}
        </div>
        <Button
          className={inline ? undefined : "w-full"}
          disabled={actionsDisabled}
          size="sm"
          title={lifecycleTitle}
          type="button"
          onClick={() => void handleConvert()}
        >
          {busy === "convert" ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 aria-hidden className="size-4" />
          )}
          Convertir en pedido
        </Button>
      </div>
    );
  }

  return (
    <div className={inline ? "flex flex-wrap items-center justify-end gap-2" : "flex flex-col gap-2 sm:flex-row sm:justify-end"}>
      <Button
        className="gap-1.5"
        disabled={actionsDisabled}
        size="sm"
        title={lifecycleTitle}
        type="button"
        variant="destructive"
        onClick={() => void handleRejectPending()}
      >
        {busy === "reject" ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : (
          <XCircle aria-hidden className="size-4" />
        )}
        Cancelar
      </Button>
      {showEditLink && !blocked ? (
        <Button asChild size="sm" variant="outline">
          <Link href={`/orders/${encodeURIComponent(orderId)}/edit`}>Editar</Link>
        </Button>
      ) : null}
      <Button
        className="gap-1.5"
        disabled={actionsDisabled}
        size="sm"
        title={lifecycleTitle}
        type="button"
        onClick={() => void handleConfirm()}
      >
        {busy === "confirm" ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 aria-hidden className="size-4" />
        )}
        Confirmar pedido
      </Button>
    </div>
  );
}
