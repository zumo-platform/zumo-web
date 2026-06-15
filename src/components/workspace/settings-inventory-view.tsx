"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";
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
  fetchLotNomenclatureViaProxy,
  LOT_TOKENS,
  renderLotCode,
  updateLotNomenclatureViaProxy,
  type LotNomenclature,
} from "@/lib/lot-nomenclature";
import {
  fetchShortfallPolicyViaProxy,
  SHORTFALL_POLICY_OPTIONS,
  updateShortfallPolicyViaProxy,
  type ShortfallPolicy,
} from "@/lib/inventory";

type SettingsInventoryViewProps = Readonly<{
  canEdit: boolean;
}>;

const SAMPLE_VENDOR = "Acme Foods";
const SAMPLE_SKU = "SKU-001";

export function SettingsInventoryView({ canEdit }: SettingsInventoryViewProps) {
  const [policy, setPolicy] = useState<ShortfallPolicy | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const [lotSettings, setLotSettings] = useState<LotNomenclature | null>(null);
  const [lotDraft, setLotDraft] = useState<{
    enabled: boolean;
    pattern: string;
    seqPadding: number;
  } | null>(null);
  const [savingLot, setSavingLot] = useState(false);

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

  const lotDirty =
    lotDraft &&
    lotSettings &&
    (lotDraft.enabled !== lotSettings.enabled ||
      lotDraft.pattern !== lotSettings.pattern ||
      lotDraft.seqPadding !== lotSettings.seqPadding);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
          <CardDescription>
            Qué hacer cuando un pedido confirmado no tiene stock suficiente para todas las líneas.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-lg space-y-3">
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
                  <Label htmlFor="lot-nomenclature-enabled">Activar nomenclatura</Label>
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
  );
}
