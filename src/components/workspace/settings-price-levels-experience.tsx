"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonCard } from "@/components/ui/skeleton-blocks";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InfoTip } from "@/components/workspace/info-tip";
import { PriceLevelFormDialog } from "@/components/workspace/price-level-form-dialog";
import {
  deactivatePriceLevelViaProxy,
  fetchPriceLevelsViaProxy,
  recalculatePriceLevelViaProxy,
  PRICE_BASIS_LABEL,
  PRICE_METHOD_LABEL,
  type PriceLevelDetail,
  type PriceLevelSummary,
} from "@/lib/dashboard-price-levels";
import { PRICING_TOOLTIPS } from "@/lib/pricing-copy";
import { formatRatePct } from "@/lib/product-pricing";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

export function SettingsPriceLevelsExperience({
  engineEnabled,
}: Readonly<{ engineEnabled: boolean }>) {
  const { can } = useWorkspacePermissions();
  const canEdit = can("pricing.edit_own");

  const [levels, setLevels] = useState<PriceLevelSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLevel, setEditLevel] = useState<PriceLevelDetail | null>(null);
  const [recalcBusyId, setRecalcBusyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchPriceLevelsViaProxy();
      setLevels(rows.filter((l) => l.active));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron cargar los niveles.");
      setLevels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleRecalculate(priceLevelId: number) {
    if (!canEdit || recalcBusyId != null) return;
    setRecalcBusyId(priceLevelId);
    try {
      const { productCount } = await recalculatePriceLevelViaProxy(priceLevelId);
      toast.success(`Precios recalculados para ${String(productCount)} productos.`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo recalcular.");
    } finally {
      setRecalcBusyId(null);
    }
  }

  async function handleDeactivate(level: PriceLevelSummary) {
    if (!canEdit) return;
    if (!window.confirm(`¿Desactivar el nivel "${level.name}"?`)) return;
    try {
      await deactivatePriceLevelViaProxy(level.priceLevelId);
      toast.success("Nivel desactivado.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo desactivar.");
    }
  }

  if (!engineEnabled) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-sm">
        <p className="text-muted-foreground leading-relaxed">
          Activá el{" "}
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/settings/pricing">
            motor de precios
          </Link>{" "}
          para crear niveles de precio y calcular precios por tipo de cliente.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-base">Niveles de precio</h2>
            <p className="text-muted-foreground text-sm">
              Reglas de margen o sobreprecio por segmento de cliente.
              <InfoTip label="Nivel" text={PRICING_TOOLTIPS.level} />
            </p>
          </div>
          {canEdit ? (
            <Button
              type="button"
              onClick={() => {
                setEditLevel(null);
                setDialogOpen(true);
              }}
            >
              <Plus aria-hidden className="size-4" />
              Nuevo nivel
            </Button>
          ) : null}
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : levels && levels.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {levels.map((level) => (
              <Card key={level.priceLevelId}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{level.name}</CardTitle>
                    <Badge variant="secondary">
                      {formatRatePct(level.defaultRatePct)} {PRICE_METHOD_LABEL[level.method].toLowerCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    {PRICE_METHOD_LABEL[level.method]} sobre {PRICE_BASIS_LABEL[level.basis].toLowerCase()}
                    {level.minRatePct || level.maxRatePct ? (
                      <>
                        {" "}
                        · banda {formatRatePct(level.minRatePct)}–{formatRatePct(level.maxRatePct)}
                      </>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {level.categoryCount === 0
                      ? "Todas las categorías"
                      : `${String(level.categoryCount)} categoría${level.categoryCount === 1 ? "" : "s"}`}
                  </p>
                  {canEdit ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditLevel({
                            ...level,
                            categoryIds: [],
                          });
                          setDialogOpen(true);
                          void import("@/lib/dashboard-price-levels").then(({ fetchPriceLevelViaProxy }) =>
                            fetchPriceLevelViaProxy(level.priceLevelId).then((detail) => {
                              if (detail) setEditLevel(detail);
                            }),
                          );
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        disabled={recalcBusyId === level.priceLevelId}
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => void handleRecalculate(level.priceLevelId)}
                      >
                        {recalcBusyId === level.priceLevelId ? (
                          <Loader2 aria-hidden className="size-3.5 animate-spin" />
                        ) : (
                          <RefreshCw aria-hidden className="size-3.5" />
                        )}
                        Recalcular
                      </Button>
                      <InfoTip label="Recalcular" text={PRICING_TOOLTIPS.recalculate} />
                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => void handleDeactivate(level)}
                      >
                        Desactivar
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
            Todavía no hay niveles de precio. Creá uno para empezar a calcular precios por cliente.
          </div>
        )}
      </div>

      <PriceLevelFormDialog
        initial={editLevel}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => void refresh()}
      />
    </TooltipProvider>
  );
}
