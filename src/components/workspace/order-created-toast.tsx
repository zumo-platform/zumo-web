"use client";

import { useEffect, useState } from "react";

import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyTextWithUserGesture } from "@/lib/copy-text";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import { cn } from "@/lib/utils";

function OrderCreatedToastContent({
  orderId,
  displayCode,
  customerName,
}: Readonly<{
  orderId: string;
  displayCode: string;
  customerName: string;
}>) {
  const [copied, setCopied] = useState(false);
  const code = formatOrderDisplayCode(orderId, displayCode);
  const detailUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/orders/${encodeURIComponent(orderId)}`
      : `/orders/${encodeURIComponent(orderId)}`;

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function handleCopy() {
    const ok = copyTextWithUserGesture(detailUrl);
    if (ok) setCopied(true);
  }

  return (
    <div className="flex w-[min(100vw-2rem,22rem)] max-w-sm items-start gap-3 rounded-lg border border-border bg-background p-4 text-foreground shadow-lg">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-sm">Pedido creado</p>
        <p className="text-sm">
          <span className="font-semibold tabular-nums">{code}</span>
          <span className="text-muted-foreground"> · </span>
          <span>{customerName}</span>
        </p>
      </div>
      <Button
        aria-label={copied ? "Copiado" : "Copiar enlace del pedido"}
        className={cn(
          "h-8 shrink-0 gap-1.5 px-2 transition-colors",
          copied && "text-emerald-600",
        )}
        size="sm"
        type="button"
        variant="outline"
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <Check aria-hidden className="size-3.5 animate-in zoom-in-50 duration-200" />
            <span className="animate-in fade-in slide-in-from-left-1 text-xs duration-200">
              Copiado
            </span>
          </>
        ) : (
          <Copy aria-hidden className="size-3.5" />
        )}
      </Button>
    </div>
  );
}

export function showOrderCreatedToast(args: Readonly<{
  orderId: string;
  displayCode: string;
  customerName: string;
}>): void {
  toast.custom(
    () => (
      <OrderCreatedToastContent
        customerName={args.customerName}
        displayCode={args.displayCode}
        orderId={args.orderId}
      />
    ),
    { duration: 10_000 },
  );
}
