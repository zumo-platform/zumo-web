"use client";

import { useEffect, useState } from "react";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Check, Copy, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyTextWithUserGesture } from "@/lib/copy-text";
import {
  hrefForNotification,
  titleForType,
  type NotificationItemDTO,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

const BORDER_BY_TYPE: Record<NotificationItemDTO["type"], string> = {
  order: "bg-blue-500",
  draft_order: "bg-muted-foreground/50",
  reclamo: "bg-red-500",
};

function NotificationAlertBody({
  item,
  toastId,
}: Readonly<{ item: NotificationItemDTO; toastId: string | number }>) {
  const [copied, setCopied] = useState(false);
  const href = hrefForNotification(item);
  const title = titleForType(item.type);

  const detailUrl =
    typeof window !== "undefined" ? `${window.location.origin}${href}` : href;

  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 120, 240], [1, 0.6, 0]);

  useEffect(() => {
    if (!copied) return undefined;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  function handleCopy() {
    if (copyTextWithUserGesture(detailUrl)) setCopied(true);
  }

  return (
    <motion.div
      className="relative flex w-[min(100vw-2rem,22rem)] max-w-sm items-stretch gap-0 overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-lg"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.9 }}
      style={{ x, opacity }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120) {
          animate(x, 320, { duration: 0.15 });
          toast.dismiss(toastId);
        } else {
          animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
        }
      }}
    >
      <span aria-hidden className={cn("w-1.5 shrink-0", BORDER_BY_TYPE[item.type])} />

      <div className="flex min-w-0 flex-1 items-start gap-3 p-3.5">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-sm">
            <span className="font-semibold tabular-nums">{item.code}</span>
            <span className="text-muted-foreground"> · </span>
            <span className="truncate">{item.customerName}</span>
          </p>
          <a
            className="inline-block text-xs text-blue-600 underline-offset-2 hover:underline"
            href={href}
            rel="noopener noreferrer"
            target="_blank"
            onClick={() => toast.dismiss(toastId)}
          >
            Ver detalle
          </a>
        </div>

        <Button
          aria-label={copied ? "Copiado" : "Copiar enlace"}
          className={cn("h-8 shrink-0 gap-1.5 px-2 transition-colors", copied && "text-emerald-600")}
          size="sm"
          type="button"
          variant="outline"
          onClick={handleCopy}
        >
          {copied ? (
            <Check aria-hidden className="size-3.5" />
          ) : (
            <Copy aria-hidden className="size-3.5" />
          )}
        </Button>
      </div>

      <button
        aria-label="Cerrar"
        className="absolute right-1.5 top-1.5 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        type="button"
        onClick={() => toast.dismiss(toastId)}
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}

export function showNotificationAlert(item: NotificationItemDTO): void {
  const id = `notif:${item.id}`;
  toast.custom((t) => <NotificationAlertBody item={item} toastId={t} />, {
    id,
    duration: 6200,
  });
}
