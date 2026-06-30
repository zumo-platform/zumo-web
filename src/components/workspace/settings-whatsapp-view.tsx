"use client";

import { useCallback, useState } from "react";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { WhatsAppConnect } from "@/components/settings/whatsapp-connect";
import { Button } from "@/components/ui/button";
import {
  connectWhatsappViaProxy,
  disconnectWhatsappViaProxy,
} from "@/lib/dashboard-api";
import type { WhatsappStatusResult } from "@/lib/dashboard-types";

type Props = {
  appId: string;
  configId: string;
  initialStatus: WhatsappStatusResult | null;
};

export function SettingsWhatsappView({ appId, configId, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<WhatsappStatusResult | null>(initialStatus);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleComplete = useCallback(
    async (payload: { code: string; wabaId: string; phoneNumberId: string }) => {
      setConnecting(true);
      try {
        const result = await connectWhatsappViaProxy(payload);
        if (!result?.ok) {
          const detail =
            typeof result?.detail === "string" && result.detail.trim()
              ? result.detail.trim()
              : "No se pudo conectar WhatsApp.";
          toast.error(detail);
          return;
        }
        toast.success("WhatsApp conectado correctamente.");
        setStatus({
          connected: true,
          tokenValid: true,
          tokenType: "unknown",
          expiresAt: null,
          message: result.phone ? `Conectado: ${result.phone}` : "WhatsApp conectado",
        });
        refresh();
      } catch {
        toast.error("Error al conectar WhatsApp. Intentá de nuevo.");
      } finally {
        setConnecting(false);
      }
    },
    [refresh],
  );

  const handleDisconnect = useCallback(async () => {
    if (!window.confirm("¿Desconectar WhatsApp? Dejarás de recibir pedidos por este número.")) {
      return;
    }
    setDisconnecting(true);
    try {
      const result = await disconnectWhatsappViaProxy();
      if (!result?.ok) {
        toast.error("No se pudo desconectar WhatsApp.");
        return;
      }
      toast.success("WhatsApp desconectado.");
      setStatus({
        connected: false,
        tokenValid: false,
        tokenType: "none",
        expiresAt: null,
        message: "Sin conexión de WhatsApp",
      });
      refresh();
    } catch {
      toast.error("Error al desconectar WhatsApp.");
    } finally {
      setDisconnecting(false);
    }
  }, [refresh]);

  const isConnected = status?.connected === true && status?.tokenValid !== false;
  const isConnecting = connecting || status?.message?.toLowerCase().includes("connecting");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conexión de WhatsApp</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conectá la cuenta de WhatsApp Business de tu empresa para empezar a recibir pedidos.
        </p>
      </div>

      {isConnecting ? (
        <div className="flex items-center gap-3 rounded-lg border p-6 text-sm">
          <Loader2 aria-hidden className="size-5 animate-spin text-muted-foreground" />
          <span>Conectando tu cuenta de WhatsApp…</span>
        </div>
      ) : isConnected ? (
        <div className="space-y-4 rounded-lg border p-6">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 aria-hidden className="size-5" />
            <span className="font-medium">WhatsApp conectado</span>
          </div>
          {status?.message ? (
            <p className="font-mono text-sm text-muted-foreground">{status.message}</p>
          ) : null}
          <Button
            disabled={disconnecting}
            onClick={() => void handleDisconnect()}
            variant="destructive"
          >
            {disconnecting ? (
              <>
                <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
                Desconectando…
              </>
            ) : (
              "Desconectar"
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border p-6">
          {!configId ? (
            <p className="text-sm text-destructive">
              Falta NEXT_PUBLIC_WHATSAPP_ES_CONFIG_ID en el entorno del dashboard.
            </p>
          ) : null}
          <WhatsAppConnect
            appId={appId}
            configId={configId}
            disabled={connecting || !configId}
            onComplete={(payload) => void handleComplete(payload)}
          />
        </div>
      )}
    </div>
  );
}
