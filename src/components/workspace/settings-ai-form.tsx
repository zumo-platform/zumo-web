"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DRAFT_EXPIRATION_OPTIONS,
  patchDashboardSettingsViaProxy,
  type DraftExpirationHours,
} from "@/lib/dashboard-settings";
import type { SupplierSettings } from "@/lib/dashboard-types";

const READONLY_TOOLTIP = "Solo administradores pueden cambiar esta configuración";

export function SettingsAiForm({
  initialAi,
  canEdit,
}: Readonly<{
  initialAi: SupplierSettings["ai"];
  canEdit: boolean;
}>) {
  const router = useRouter();
  const [autoCommitEnabled, setAutoCommitEnabled] = useState(initialAi.autoCommitEnabled);
  const [draftExpirationHours, setDraftExpirationHours] = useState<DraftExpirationHours>(
    initialAi.draftExpirationHours,
  );
  const [savingAutoCommit, setSavingAutoCommit] = useState(false);
  const [savingExpiration, setSavingExpiration] = useState(false);

  async function saveAutoCommit(next: boolean) {
    if (!canEdit || savingAutoCommit) return;
    const prev = autoCommitEnabled;
    setAutoCommitEnabled(next);
    setSavingAutoCommit(true);
    try {
      const result = await patchDashboardSettingsViaProxy({ aiAutoCommitEnabled: next });
      const ai = result.ai;
      if (!ai) throw new Error("Respuesta de configuración inválida.");
      setAutoCommitEnabled(ai.autoCommitEnabled);
      toast.success(
        ai.autoCommitEnabled
          ? "Confirmación automática activada"
          : "Confirmación automática desactivada",
      );
      router.refresh();
    } catch (err) {
      setAutoCommitEnabled(prev);
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSavingAutoCommit(false);
    }
  }

  async function saveExpiration(next: DraftExpirationHours) {
    if (!canEdit || savingExpiration || next === draftExpirationHours) return;
    const prev = draftExpirationHours;
    setDraftExpirationHours(next);
    setSavingExpiration(true);
    try {
      const result = await patchDashboardSettingsViaProxy({ draftExpirationHours: next });
      const ai = result.ai;
      if (!ai) throw new Error("Respuesta de configuración inválida.");
      setDraftExpirationHours(ai.draftExpirationHours);
      toast.success("Caducidad de borradores actualizada");
      router.refresh();
    } catch (err) {
      setDraftExpirationHours(prev);
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSavingExpiration(false);
    }
  }

  const controlsDisabled = !canEdit || savingAutoCommit || savingExpiration;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h2 className="font-semibold text-base">Confirmación automática de pedidos</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Permití que Zumo confirme pedidos automáticamente cuando todos los productos se
                reconozcan al 100% y el cliente esté registrado.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Cuando está activada: los pedidos perfectos pasan directo a confirmados sin tu
                intervención. Cuando está desactivada (recomendado al inicio): vos confirmás cada
                pedido manualmente.
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex shrink-0 items-center gap-2 pt-1">
                  {savingAutoCommit ? (
                    <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />
                  ) : null}
                  <Switch
                    checked={autoCommitEnabled}
                    disabled={controlsDisabled}
                    id="auto-commit"
                    onCheckedChange={(checked) => void saveAutoCommit(checked)}
                  />
                  <Label className="sr-only" htmlFor="auto-commit">
                    Confirmación automática
                  </Label>
                </div>
              </TooltipTrigger>
              {!canEdit ? <TooltipContent side="left">{READONLY_TOOLTIP}</TooltipContent> : null}
            </Tooltip>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="font-semibold text-base">Caducidad de borradores</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Cuánto tiempo guardamos un borrador antes de cancelarlo automáticamente si nadie lo
                revisó.
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="max-w-xs">
                  <Select
                    disabled={controlsDisabled}
                    value={String(draftExpirationHours)}
                    onValueChange={(value) =>
                      void saveExpiration(Number(value) as DraftExpirationHours)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná una duración" />
                    </SelectTrigger>
                    <SelectContent>
                      {DRAFT_EXPIRATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              {!canEdit ? <TooltipContent side="bottom">{READONLY_TOOLTIP}</TooltipContent> : null}
            </Tooltip>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Borradores creados antes de cambiar esta configuración mantendrán su fecha de
              caducidad original.
            </p>
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}
