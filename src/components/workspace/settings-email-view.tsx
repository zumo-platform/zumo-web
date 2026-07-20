"use client";

import { useCallback, useState } from "react";

import { CheckCircle2, ChevronDown, Copy, Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { patchEmailSettingsViaProxy } from "@/lib/dashboard-settings";
import type { EmailSettings } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

const READONLY_TOOLTIP = "Solo administradores pueden cambiar esta configuración";

type Props = Readonly<{
  initial: EmailSettings;
  canEdit: boolean;
}>;

export function SettingsEmailView({ initial, canEdit }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initial);
  const [activating, setActivating] = useState(false);
  const [savingReply, setSavingReply] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleActivate = useCallback(async () => {
    setActivating(true);
    try {
      const result = await patchEmailSettingsViaProxy({ enableEmailChannel: true });
      setEmail(result.email);
      toast.success("Canal de correo activado.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo activar el canal de correo.");
    } finally {
      setActivating(false);
    }
  }, [refresh]);

  const handleReplyToggle = useCallback(
    async (checked: boolean) => {
      setSavingReply(true);
      try {
        const result = await patchEmailSettingsViaProxy({ emailReplyEnabled: checked });
        setEmail(result.email);
        toast.success(checked ? "Respuesta automática activada." : "Respuesta automática desactivada.");
        refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo guardar la configuración.");
      } finally {
        setSavingReply(false);
      }
    },
    [refresh],
  );

  const handleCopy = useCallback(async () => {
    const addr = email.address?.trim();
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      toast.success("Dirección copiada.");
    } catch {
      toast.error("No se pudo copiar la dirección.");
    }
  }, [email.address]);

  const address = email.address?.trim() ?? "";
  const tokenAddress = address || "pedidos+{token}@zumob2b.com";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Canal de correo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recibí pedidos por correo electrónico en la misma bandeja que WhatsApp.
          </p>
        </div>

        {!email.enabled ? (
          <div className="space-y-4 rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">
              Activá el canal para obtener una dirección única donde tus clientes pueden enviar pedidos
              por correo.
            </p>
            <Button disabled={!canEdit || activating} onClick={() => void handleActivate()} type="button">
              {activating ? (
                <>
                  <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
                  Activando…
                </>
              ) : (
                "Activar canal de correo"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border p-6">
            <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400">
              <CheckCircle2 aria-hidden className="size-5" />
              <span className="font-medium">Canal de correo activo</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inbound-email-address">Dirección de pedidos</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  className="font-mono text-sm"
                  id="inbound-email-address"
                  readOnly
                  value={address}
                />
                <Button
                  className="shrink-0"
                  onClick={() => void handleCopy()}
                  type="button"
                  variant="outline"
                >
                  <Copy aria-hidden className="mr-2 size-4" />
                  Copiar
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30">
              <button
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium"
                onClick={() => setForwardOpen((open) => !open)}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <Mail aria-hidden className="size-4 text-muted-foreground" />
                  ¿Cómo conectar tu correo actual?
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn("size-4 shrink-0 transition-transform", forwardOpen && "rotate-180")}
                />
              </button>
              {forwardOpen ? (
                <div className="space-y-4 border-t px-4 py-4 text-sm text-muted-foreground leading-relaxed">
                  <div>
                    <p className="font-medium text-foreground">Opción A — Dales tu dirección ZUMO directamente</p>
                    <p className="mt-1">
                      Compartí <span className="font-mono text-foreground">{tokenAddress}</span> con tus
                      clientes para que envíen sus pedidos ahí.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Opción B — Reenvía tu correo actual (recomendado)</p>
                    <p className="mt-1">
                      Configurá un reenvío automático (a nivel de servidor) desde tu dirección actual — por
                      ejemplo <span className="font-mono">pedidos@tudominio.com</span> — hacia{" "}
                      <span className="font-mono text-foreground">{tokenAddress}</span>. En Google Workspace:
                      reglas de enrutamiento. En Microsoft 365: reglas de flujo de correo. Así tus clientes
                      siguen escribiendo a tu dirección de siempre.
                    </p>
                  </div>
                  <p className="text-xs italic">
                    Nota: usá un reenvío del servidor (no &quot;Reenviar&quot; manual desde tu bandeja), para
                    que ZUMO reconozca al cliente original.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {email.enabled ? (
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <h2 className="font-semibold text-base">Responder automáticamente por correo</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Cuando está activo, ZUMO responde los pedidos por correo automáticamente. Requiere que el
                  cliente tenga la lectura por IA activada.
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex shrink-0 items-center gap-2 pt-1">
                    {savingReply ? (
                      <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />
                    ) : null}
                    <Switch
                      checked={email.replyEnabled}
                      disabled={!canEdit || savingReply}
                      id="email-reply-enabled"
                      onCheckedChange={(checked) => void handleReplyToggle(checked)}
                    />
                    <Label className="sr-only" htmlFor="email-reply-enabled">
                      Responder automáticamente por correo
                    </Label>
                  </div>
                </TooltipTrigger>
                {!canEdit ? <TooltipContent side="left">{READONLY_TOOLTIP}</TooltipContent> : null}
              </Tooltip>
            </div>
          </section>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
