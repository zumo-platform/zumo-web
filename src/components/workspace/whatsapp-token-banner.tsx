"use client";

import { useState } from "react";

import { AlertTriangle, X } from "lucide-react";

import type { WhatsappStatusResult } from "@/lib/dashboard-types";

const META_APP_URL = "https://developers.facebook.com/apps/1449079386459388";

function getBannerConfig(status: WhatsappStatusResult | null): {
  color: "red" | "yellow";
  text: string;
} | null {
  if (!status) return null;

  if (status.tokenValid) return null;

  if (!status.connected || status.tokenType === "none") {
    return {
      color: "red",
      text: "⚠️ WhatsApp no está conectado. Configurá el token para recibir mensajes.",
    };
  }

  if (status.tokenType === "unknown") {
    return {
      color: "yellow",
      text: "⚠️ No se pudo verificar el estado de WhatsApp. Revisá la configuración.",
    };
  }

  if (!status.tokenValid) {
    return {
      color: "red",
      text: "⚠️ Tu token de WhatsApp venció. Los mensajes no se están procesando.",
    };
  }

  return null;
}

export function WhatsappTokenBanner({
  status,
}: Readonly<{
  status: WhatsappStatusResult | null;
}>) {
  const [dismissed, setDismissed] = useState(false);
  const config = getBannerConfig(status);

  if (!config || dismissed) return null;

  const colorClasses =
    config.color === "red"
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-yellow-50 border-yellow-200 text-yellow-800";

  return (
    <div
      role="alert"
      className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5 text-sm ${colorClasses}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <AlertTriangle aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0">{config.text}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <a
          className="whitespace-nowrap rounded border border-current px-2.5 py-1 font-medium text-xs transition-opacity hover:opacity-80"
          href={META_APP_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          Configurar
        </a>
        <button
          aria-label="Cerrar notificación"
          className="rounded p-0.5 transition-opacity hover:opacity-70"
          type="button"
          onClick={() => setDismissed(true)}
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
