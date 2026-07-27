"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CircleHelp, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonFieldList } from "@/components/ui/skeleton-blocks";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DEDUCTION_POINT_OPTIONS,
  fetchDeductionPointViaProxy,
  fetchShortfallPolicyViaProxy,
  SHORTFALL_POLICY_OPTIONS,
  updateDeductionPointViaProxy,
  updateShortfallPolicyViaProxy,
  type DeductionPointBlocking,
  type DeductionPointState,
  type InventoryDeductionPoint,
  type MidFlightBlockingNote,
  type ShortfallPolicy,
} from "@/lib/inventory";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import { SYSTEM_STATUS_LABELS } from "@/lib/order-status-flow";
import {
  fetchLotNomenclatureViaProxy,
  fetchBatchSettingsViaProxy,
  LOT_TOKENS,
  renderLotCode,
  updateBatchSettingsViaProxy,
  updateLotNomenclatureViaProxy,
  type BatchSettings,
  type ExpiredStockPolicy,
  type LotNomenclature,
} from "@/lib/lot-nomenclature";

type SettingsInventoryViewProps = Readonly<{
  canEdit: boolean;
}>;

const SAMPLE_VENDOR = "Acme Foods";
const SAMPLE_SKU = "SKU-001";

const DEFAULT_DEDUCTION: DeductionPointState = {
  point: "order",
  canSwitch: true,
  blocking: { orders: 0, notes: 0, blockingOrders: [], blockingNotes: [] },
};

const DELIVERY_NOTE_STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  confirmada: "Confirmada",
  en_ruta: "En ruta",
  entregada: "Entregada",
  entregada_parcial: "Entregada parcial",
  cancelada: "Cancelada",
};

function flowStatusLabel(statusKey: string): string {
  return SYSTEM_STATUS_LABELS[statusKey] ?? statusKey.replaceAll("_", " ");
}

function deliveryNoteDisplayCode(note: MidFlightBlockingNote): string {
  const code = note.displayCode?.trim();
  if (code) return code;
  if (note.deliveryNoteId.length <= 14) return note.deliveryNoteId;
  return `${note.deliveryNoteId.slice(0, 10)}…${note.deliveryNoteId.slice(-4)}`;
}

function DeductionPointBlockingNotice({
  blocking,
}: Readonly<{ blocking: DeductionPointBlocking }>) {
  const { orders, notes, blockingOrders, blockingNotes } = blocking;
  if (orders === 0 && notes === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          Hay {orders} pedido{orders === 1 ? "" : "s"} con inventario reservado
          {notes > 0
            ? ` y ${notes} nota${notes === 1 ? "" : "s"} de entrega abiertas`
            : ""}
          .
        </p>
        <p className="text-muted-foreground">
          El tablero de pedidos muestra todos los pedidos por estado; este conteo solo incluye
          pedidos que pasaron por confirmado y aún tienen stock reservado (no entregado ni
          cancelado). Marcá esos pedidos como{" "}
          <span className="text-foreground">Entregado</span> o{" "}
          <span className="text-foreground">Cancelado</span> para liberar el inventario.
        </p>
      </div>

      {blockingOrders.length > 0 ? (
        <div className="space-y-1.5">
          <p className="font-medium text-foreground text-xs uppercase tracking-wide">
            Pedidos con stock reservado
          </p>
          <ul className="space-y-1">
            {blockingOrders.map((order) => (
              <li key={order.orderId}>
                <Link
                  className="text-primary underline-offset-4 hover:underline"
                  href={`/orders/${encodeURIComponent(order.orderId)}`}
                >
                  {formatOrderDisplayCode(order.orderId, order.displayCode)}
                </Link>
                <span className="text-muted-foreground">
                  {" "}
                  · {order.customerName} · {flowStatusLabel(order.effectiveStatusKey)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {blockingNotes.length > 0 ? (
        <div className="space-y-1.5">
          <p className="font-medium text-foreground text-xs uppercase tracking-wide">
            Notas de entrega abiertas
          </p>
          <ul className="space-y-1 text-muted-foreground">
            {blockingNotes.map((note) => (
              <li key={note.deliveryNoteId}>
                {deliveryNoteDisplayCode(note)} ·{" "}
                {DELIVERY_NOTE_STATUS_LABELS[note.status] ?? note.status}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        className="inline-flex text-primary text-sm underline-offset-4 hover:underline"
        href="/orders"
      >
        Ir al tablero de pedidos
      </Link>
    </div>
  );
}

function SettingLabel({
  htmlFor,
  label,
  tooltip,
}: Readonly<{
  htmlFor: string;
  label: string;
  tooltip: string;
}>) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label={`Ayuda: ${label}`}
            className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
          >
            <CircleHelp aria-hidden className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function SettingsInventoryView({ canEdit }: SettingsInventoryViewProps) {
  const [policy, setPolicy] = useState<ShortfallPolicy | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [deduction, setDeduction] = useState<DeductionPointState | null>(null);
  const [savingDeduction, setSavingDeduction] = useState(false);

  const [lotSettings, setLotSettings] = useState<LotNomenclature | null>(null);
  const [lotDraft, setLotDraft] = useState<{
    enabled: boolean;
    pattern: string;
    seqPadding: number;
  } | null>(null);
  const [savingLot, setSavingLot] = useState(false);
  const [batchSettings, setBatchSettings] = useState<BatchSettings | null>(null);
  const [batchDraft, setBatchDraft] = useState<BatchSettings | null>(null);
  const [savingBatch, setSavingBatch] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const value = await fetchShortfallPolicyViaProxy();
        if (!cancelled) setPolicy(value);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "No se pudo cargar la política.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const value = await fetchDeductionPointViaProxy();
        if (!cancelled) setDeduction(value);
      } catch (err) {
        if (!cancelled) {
          setDeduction(DEFAULT_DEDUCTION);
          toast.error(
            err instanceof Error ? err.message : "No se pudo cargar la lógica de inventario.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const value = await fetchBatchSettingsViaProxy();
        if (!cancelled) {
          setBatchSettings(value);
          setBatchDraft(value);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "No se pudo cargar configuración de lotes.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const value = await fetchLotNomenclatureViaProxy();
        if (!cancelled) {
          setLotSettings(value);
          setLotDraft({
            enabled: value.enabled,
            pattern: value.pattern,
            seqPadding: value.seqPadding,
          });
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "No se pudo cargar la nomenclatura de lotes.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const savePolicy = useCallback(
    async (next: ShortfallPolicy) => {
      if (!canEdit) return;
      setSavingPolicy(true);
      setPolicy(next);
      try {
        const result = await updateShortfallPolicyViaProxy(next);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Política de faltantes actualizada.");
      } finally {
        setSavingPolicy(false);
      }
    },
    [canEdit],
  );

  const saveDeduction = useCallback(
    async (next: InventoryDeductionPoint) => {
      if (!canEdit || !deduction || next === deduction.point) return;
      setSavingDeduction(true);
      const prev = deduction;
      setDeduction({ ...deduction, point: next });
      try {
        const result = await updateDeductionPointViaProxy(next);
        if (!result.ok) {
          setDeduction(prev);
          toast.error(result.error);
          try {
            const fresh = await fetchDeductionPointViaProxy();
            setDeduction(fresh);
          } catch {
            /* keep previous state */
          }
          return;
        }
        toast.success("Lógica de inventario actualizada.");
        try {
          const fresh = await fetchDeductionPointViaProxy();
          setDeduction(fresh);
        } catch {
          /* keep optimistic value */
        }
      } finally {
        setSavingDeduction(false);
      }
    },
    [canEdit, deduction],
  );

  const preview = useMemo(() => {
    if (!lotDraft || !lotSettings) return null;
    return renderLotCode(lotDraft.pattern, {
      date: new Date(),
      vendorName: SAMPLE_VENDOR,
      sku: SAMPLE_SKU,
      seq: lotSettings.nextSeq,
      seqPadding: lotDraft.seqPadding,
    });
  }, [lotDraft, lotSettings]);

  const saveLot = useCallback(async () => {
    if (!canEdit || !lotDraft) return;
    setSavingLot(true);
    try {
      const result = await updateLotNomenclatureViaProxy(lotDraft);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setLotSettings(result.settings);
      toast.success("Nomenclatura de lotes actualizada.");
    } finally {
      setSavingLot(false);
    }
  }, [canEdit, lotDraft]);

  const saveBatch = useCallback(async () => {
    if (!canEdit || !batchDraft) return;
    setSavingBatch(true);
    try {
      const result = await updateBatchSettingsViaProxy(batchDraft);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setBatchSettings(result.settings);
      setBatchDraft(result.settings);
      toast.success("Configuración de lotes actualizada.");
    } finally {
      setSavingBatch(false);
    }
  }, [batchDraft, canEdit]);

  const lotDirty =
    lotDraft &&
    lotSettings &&
    (lotDraft.enabled !== lotSettings.enabled ||
      lotDraft.pattern !== lotSettings.pattern ||
      lotDraft.seqPadding !== lotSettings.seqPadding);
  const batchDirty =
    batchDraft &&
    batchSettings &&
    (batchDraft.trackBatchesDefault !== batchSettings.trackBatchesDefault ||
      batchDraft.requireLotOnReceipt !== batchSettings.requireLotOnReceipt ||
      batchDraft.trackExpiry !== batchSettings.trackExpiry ||
      batchDraft.expiryWarningDays !== batchSettings.expiryWarningDays ||
      batchDraft.expiredStockPolicy !== batchSettings.expiredStockPolicy);

  return (
    <TooltipProvider>
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lotes y vencimiento</CardTitle>
          <CardDescription>
            Define el valor predeterminado para productos y cómo se capturan lotes al recibir.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-lg space-y-4">
          {batchDraft === null ? (
            <SkeletonFieldList rows={5} />
          ) : (
            <>
              {[
                {
                  key: "trackBatchesDefault",
                  label: "Rastrear lotes (predeterminado)",
                  help: "Cada producto puede heredar este valor o anularlo.",
                  tooltip:
                    "Activa el rastreo de lotes por defecto para productos nuevos o productos configurados como “heredar”. Podés cambiarlo por producto.",
                },
                {
                  key: "requireLotOnReceipt",
                  label: "Lote obligatorio al recibir",
                  help: "Exige número de lote para productos con rastreo efectivo.",
                  tooltip:
                    "Obliga a escribir o generar un número de lote al recibir mercadería de productos que rastrean lotes.",
                },
                {
                  key: "trackExpiry",
                  label: "Rastrear vencimiento",
                  help: "Muestra y guarda fecha de vencimiento al recibir lotes.",
                  tooltip:
                    "Permite guardar fecha de vencimiento por lote y usar avisos de vencimiento en inventario.",
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <SettingLabel
                      htmlFor={`batch-${item.key}`}
                      label={item.label}
                      tooltip={item.tooltip}
                    />
                    <p className="text-muted-foreground text-sm">{item.help}</p>
                  </div>
                  <Switch
                    id={`batch-${item.key}`}
                    checked={Boolean(batchDraft[item.key as keyof BatchSettings])}
                    disabled={!canEdit || savingBatch}
                    onCheckedChange={(checked) =>
                      setBatchDraft((d) => (d ? { ...d, [item.key]: checked } : d))
                    }
                  />
                </div>
              ))}

              <div className="space-y-2">
                <Label htmlFor="expiry-warning-days">Días de aviso de vencimiento</Label>
                <Input
                  id="expiry-warning-days"
                  type="number"
                  min={1}
                  max={365}
                  disabled={!canEdit || savingBatch}
                  value={batchDraft.expiryWarningDays}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    setBatchDraft((d) =>
                      d ? { ...d, expiryWarningDays: Math.min(365, Math.max(1, Math.trunc(n))) } : d,
                    );
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expired-stock-policy">Política de stock vencido</Label>
                <Select
                  disabled={!canEdit || savingBatch}
                  value={batchDraft.expiredStockPolicy}
                  onValueChange={(value) =>
                    setBatchDraft((d) =>
                      d ? { ...d, expiredStockPolicy: value as ExpiredStockPolicy } : d,
                    )
                  }
                >
                  <SelectTrigger id="expired-stock-policy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warn">Avisar</SelectItem>
                    <SelectItem value="block">Bloquear</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  El bloqueo se aplicará cuando esté disponible el consumo por lote (FEFO).
                </p>
              </div>

              {canEdit ? (
                <Button disabled={!batchDirty || savingBatch} type="button" onClick={() => void saveBatch()}>
                  {savingBatch ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
                  Guardar configuración
                </Button>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Solo propietarios y operadores pueden cambiar esta configuración.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
          <CardDescription>
            Cuándo se descuenta el inventario y qué hacer cuando un pedido confirmado no tiene
            stock suficiente.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-lg space-y-3">
          <div className="space-y-2">
            <SettingLabel
              htmlFor="inventory-deduction-point"
              label="¿Cuándo se descuenta el inventario?"
              tooltip="Elegí si el stock se reduce al marcar el pedido como entregado, o al despachar la nota de entrega. No se puede cambiar mientras haya pedidos con inventario reservado o notas de entrega abiertas."
            />
            {deduction === null ? (
              <SkeletonFieldList rows={1} />
            ) : (
              <>
                <Select
                  disabled={!canEdit || savingDeduction || !deduction.canSwitch}
                  value={deduction.point}
                  onValueChange={(value) =>
                    void saveDeduction(value as InventoryDeductionPoint)
                  }
                >
                  <SelectTrigger id="inventory-deduction-point">
                    <SelectValue placeholder="Seleccioná una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEDUCTION_POINT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!deduction.canSwitch ? (
                  <DeductionPointBlockingNotice blocking={deduction.blocking} />
                ) : null}
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="shortfall-policy">Política de faltantes</Label>
            {policy === null ? (
              <SkeletonFieldList rows={1} />
            ) : (
              <Select
                disabled={!canEdit || savingPolicy}
                value={policy}
                onValueChange={(value) => void savePolicy(value as ShortfallPolicy)}
              >
                <SelectTrigger id="shortfall-policy">
                  <SelectValue placeholder="Seleccioná una política" />
                </SelectTrigger>
                <SelectContent>
                  {SHORTFALL_POLICY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {!canEdit ? (
            <p className="text-muted-foreground text-sm">
              Solo propietarios y operadores pueden cambiar esta configuración.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nomenclatura de lotes</CardTitle>
          <CardDescription>
            Patrón opcional para sugerir códigos de lote al recibir mercadería. El código generado
            se puede editar antes de confirmar.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-lg space-y-4">
          {lotDraft === null ? (
            <SkeletonFieldList rows={4} />
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <SettingLabel
                    htmlFor="lot-nomenclature-enabled"
                    label="Activar nomenclatura"
                    tooltip="Cuando está activa, Zumo sugiere automáticamente un código de lote usando el patrón configurado al recibir mercadería. El usuario puede editarlo antes de confirmar."
                  />
                  <p className="text-muted-foreground text-sm">
                    Si está desactivada, el campo de lote queda vacío como hoy.
                  </p>
                </div>
                <Switch
                  id="lot-nomenclature-enabled"
                  checked={lotDraft.enabled}
                  disabled={!canEdit || savingLot}
                  onCheckedChange={(enabled) =>
                    setLotDraft((d) => (d ? { ...d, enabled } : d))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lot-pattern">Patrón</Label>
                <Input
                  id="lot-pattern"
                  disabled={!canEdit || savingLot}
                  value={lotDraft.pattern}
                  onChange={(e) =>
                    setLotDraft((d) => (d ? { ...d, pattern: e.target.value } : d))
                  }
                />
                <div className="flex flex-wrap gap-1.5">
                  {LOT_TOKENS.map((token) => (
                    <Badge key={token} variant="outline">
                      {token}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lot-seq-padding">Relleno de secuencia</Label>
                <Input
                  id="lot-seq-padding"
                  type="number"
                  min={1}
                  max={8}
                  disabled={!canEdit || savingLot}
                  value={lotDraft.seqPadding}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    setLotDraft((d) =>
                      d ? { ...d, seqPadding: Math.min(8, Math.max(1, Math.trunc(n))) } : d,
                    );
                  }}
                />
                <p className="text-muted-foreground text-xs">
                  Cantidad de dígitos para el token {"{SEQ}"} (1–8).
                </p>
              </div>

              {preview ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Ejemplo: </span>
                  <span className="font-mono">{preview}</span>
                </p>
              ) : null}

              {canEdit ? (
                <Button
                  disabled={!lotDirty || savingLot}
                  type="button"
                  onClick={() => void saveLot()}
                >
                  {savingLot ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
                  Guardar nomenclatura
                </Button>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Solo propietarios y operadores pueden cambiar esta configuración.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </TooltipProvider>
  );
}
