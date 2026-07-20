"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { patchDashboardCustomerViaProxy } from "@/lib/dashboard-customers";

export function CustomerEmailOrderingToggle({
  customerId,
  enabled,
  onChange,
}: Readonly<{
  customerId: number;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}>) {
  const [saving, setSaving] = useState(false);

  async function handleToggle(checked: boolean) {
    setSaving(true);
    try {
      await patchDashboardCustomerViaProxy(customerId, { emailOrderingEnabled: checked });
      onChange(checked);
      toast.success(
        checked
          ? "Lectura de pedidos por correo activada."
          : "Lectura de pedidos por correo desactivada.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-sm">Leer pedidos por correo con IA</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Cuando está activo, la IA extrae automáticamente los pedidos que este cliente envíe por
            correo. Si está inactivo, los correos se guardan para revisión manual.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          {saving ? (
            <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />
          ) : null}
          <Switch
            checked={enabled}
            disabled={saving}
            id={`email-ordering-${customerId}`}
            onCheckedChange={(checked) => void handleToggle(checked)}
          />
          <Label className="sr-only" htmlFor={`email-ordering-${customerId}`}>
            Leer pedidos por correo con IA
          </Label>
        </div>
      </div>
    </div>
  );
}
