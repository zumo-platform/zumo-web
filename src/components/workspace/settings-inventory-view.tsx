"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchShortfallPolicyViaProxy,
  SHORTFALL_POLICY_OPTIONS,
  updateShortfallPolicyViaProxy,
  type ShortfallPolicy,
} from "@/lib/inventory";

type SettingsInventoryViewProps = Readonly<{
  canEdit: boolean;
}>;

export function SettingsInventoryView({ canEdit }: SettingsInventoryViewProps) {
  const [policy, setPolicy] = useState<ShortfallPolicy | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const value = await fetchShortfallPolicyViaProxy();
        if (!cancelled) setPolicy(value);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "No se pudo cargar la política.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const savePolicy = useCallback(
    async (next: ShortfallPolicy) => {
      if (!canEdit) return;
      setSaving(true);
      setPolicy(next);
      try {
        const result = await updateShortfallPolicyViaProxy(next);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Política de faltantes actualizada.");
      } finally {
        setSaving(false);
      }
    },
    [canEdit],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventario</CardTitle>
        <CardDescription>
          Qué hacer cuando un pedido confirmado no tiene stock suficiente para todas las líneas.
        </CardDescription>
      </CardHeader>
      <CardContent className="max-w-lg space-y-3">
        <div className="space-y-2">
          <Label htmlFor="shortfall-policy">Política de faltantes</Label>
          {policy === null ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Cargando…
            </div>
          ) : (
            <Select
              disabled={!canEdit || saving}
              value={policy}
              onValueChange={(value) => void savePolicy(value as ShortfallPolicy)}
            >
              <SelectTrigger id="shortfall-policy">
                <SelectValue placeholder="Seleccioná una política" />
              </SelectTrigger>
              <SelectContent>
                {SHORTFALL_POLICY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {!canEdit ? (
          <p className="text-muted-foreground text-sm">
            Solo propietarios y operadores pueden cambiar esta configuración.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
