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

const READONLY_TOOLTIP = "Solo administradores pueden cambiar esta configuraci\u00f3n";

const COPY = {
  chatbotTitle: "Comportamiento del AI",
  chatbotLead:
    "Permit\u00ed que el chatbot responda autom\u00e1ticamente en WhatsApp cuando los clientes escriben.",
  chatbotDetail:
    "Activado: el cliente recibe respuestas del asistente en la conversaci\u00f3n. Desactivado: Zumo sigue leyendo los mensajes y creando borradores de pedido, pero no env\u00eda respuestas \u2014 tu equipo responde manualmente.",
  autoCommitTitle: "Confirmaci\u00f3n autom\u00e1tica de pedidos",
  autoCommitLead:
    "Permit\u00ed que Zumo confirme pedidos autom\u00e1ticamente cuando todos los productos se reconozcan al 100% y el cliente est\u00e9 registrado.",
  autoCommitDetail:
    "Cuando est\u00e1 activada: los pedidos perfectos pasan directo a confirmados sin tu intervenci\u00f3n. Cuando est\u00e1 desactivada (recomendado al inicio): vos confirm\u00e1s cada pedido manualmente.",
  autoCommitLabel: "Confirmaci\u00f3n autom\u00e1tica",
  draftExpiryTitle: "Caducidad de borradores",
  draftExpiryLead:
    "Cu\u00e1nto tiempo guardamos un borrador antes de cancelarlo autom\u00e1ticamente si nadie lo revis\u00f3.",
  draftExpiryPlaceholder: "Seleccion\u00e1 una duraci\u00f3n",
  draftExpiryFootnote:
    "Borradores creados antes de cambiar esta configuraci\u00f3n mantendr\u00e1n su fecha de caducidad original.",
} as const;

export function SettingsAiForm({
  initialAi,
  canEdit,
}: Readonly<{
  initialAi: SupplierSettings["ai"];
  canEdit: boolean;
}>) {
  const router = useRouter();
  const [chatbotEnabled, setChatbotEnabled] = useState(initialAi.chatbotEnabled);
  const [autoCommitEnabled, setAutoCommitEnabled] = useState(initialAi.autoCommitEnabled);
  const [draftExpirationHours, setDraftExpirationHours] = useState<DraftExpirationHours>(
    initialAi.draftExpirationHours,
  );
  const [savingChatbot, setSavingChatbot] = useState(false);
  const [savingAutoCommit, setSavingAutoCommit] = useState(false);
  const [savingExpiration, setSavingExpiration] = useState(false);

  async function saveChatbot(next: boolean) {
    if (!canEdit || savingChatbot) return;
    const prev = chatbotEnabled;
    setChatbotEnabled(next);
    setSavingChatbot(true);
    try {
      const result = await patchDashboardSettingsViaProxy({ aiChatbotEnabled: next });
      const ai = result.ai;
      if (!ai) throw new Error("Respuesta de configuraci\u00f3n inv\u00e1lida.");
      setChatbotEnabled(ai.chatbotEnabled);
      toast.success(
        ai.chatbotEnabled
          ? "Respuestas del chatbot activadas"
          : "Respuestas del chatbot desactivadas \u2014 solo borradores",
      );
      router.refresh();
    } catch (err) {
      setChatbotEnabled(prev);
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSavingChatbot(false);
    }
  }

  async function saveAutoCommit(next: boolean) {
    if (!canEdit || savingAutoCommit) return;
    const prev = autoCommitEnabled;
    setAutoCommitEnabled(next);
    setSavingAutoCommit(true);
    try {
      const result = await patchDashboardSettingsViaProxy({ aiAutoCommitEnabled: next });
      const ai = result.ai;
      if (!ai) throw new Error("Respuesta de configuraci\u00f3n inv\u00e1lida.");
      setAutoCommitEnabled(ai.autoCommitEnabled);
      toast.success(
        ai.autoCommitEnabled
          ? "Confirmaci\u00f3n autom\u00e1tica activada"
          : "Confirmaci\u00f3n autom\u00e1tica desactivada",
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
      if (!ai) throw new Error("Respuesta de configuraci\u00f3n inv\u00e1lida.");
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

  const controlsDisabled =
    !canEdit || savingChatbot || savingAutoCommit || savingExpiration;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h2 className="font-semibold text-base">{COPY.chatbotTitle}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{COPY.chatbotLead}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{COPY.chatbotDetail}</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex shrink-0 items-center gap-2 pt-1">
                  {savingChatbot ? (
                    <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />
                  ) : null}
                  <Switch
                    checked={chatbotEnabled}
                    disabled={controlsDisabled}
                    id="chatbot-enabled"
                    onCheckedChange={(checked) => void saveChatbot(checked)}
                  />
                  <Label className="sr-only" htmlFor="chatbot-enabled">
                    Respuestas del chatbot
                  </Label>
                </div>
              </TooltipTrigger>
              {!canEdit ? <TooltipContent side="left">{READONLY_TOOLTIP}</TooltipContent> : null}
            </Tooltip>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h2 className="font-semibold text-base">{COPY.autoCommitTitle}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{COPY.autoCommitLead}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{COPY.autoCommitDetail}</p>
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
                    {COPY.autoCommitLabel}
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
              <h2 className="font-semibold text-base">{COPY.draftExpiryTitle}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{COPY.draftExpiryLead}</p>
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
                      <SelectValue placeholder={COPY.draftExpiryPlaceholder} />
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
            <p className="text-muted-foreground text-xs leading-relaxed">{COPY.draftExpiryFootnote}</p>
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}
