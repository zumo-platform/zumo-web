"use client";

import { useEffect, useState } from "react";

import { AlertTriangle, Check, Copy } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { copyTextWithUserGesture } from "@/lib/copy-text";

export type ErrorAlertProps = Readonly<{
  title: string;
  message: string;
  code: string;
  details?: string;
  onRetry?: () => void;
}>;

export function ErrorAlert({ title, message, code, details, onRetry }: ErrorAlertProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function handleCopy() {
    const payload = details?.trim() || JSON.stringify({ code, message, timestamp: new Date().toISOString() }, null, 2);
    const ok = copyTextWithUserGesture(payload);
    if (ok) setCopied(true);
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-muted-foreground text-xs">
            Código: <span className="text-foreground">{code}</span>
          </span>
          <Button
            aria-label={copied ? "Copiado" : "Copiar detalles del error"}
            className="h-8 gap-1.5 px-2"
            size="sm"
            type="button"
            variant="ghost"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check aria-hidden className="size-3.5" />
                Copiado
              </>
            ) : (
              <>
                <Copy aria-hidden className="size-3.5" />
                Copiar
              </>
            )}
          </Button>
        </div>
        {onRetry ? (
          <Button className="mt-1" size="sm" type="button" variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
