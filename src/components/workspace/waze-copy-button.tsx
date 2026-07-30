"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function WazeCopyButton({
  wazeUrl,
  className,
}: Readonly<{ wazeUrl: string | null; className?: string }>) {
  if (!wazeUrl?.trim()) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(wazeUrl!);
      toast.success("Enlace de Waze copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  return (
    <Button
      aria-label="Copiar enlace de Waze"
      className={className}
      size="icon"
      title="Copiar enlace de Waze"
      type="button"
      variant="outline"
      onClick={() => void copyUrl()}
    >
      <Copy className="size-3.5" />
    </Button>
  );
}
