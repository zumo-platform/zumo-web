"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  createCustomStatusViaProxy,
  slugifyStatusKey,
  validateCustomStatusKeyClient,
  type SupplierCustomStatus,
} from "@/lib/order-status-flow";
import { cn } from "@/lib/utils";

const COLOR_SWATCHES = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
] as const;

export function CustomStatusFormSheet({
  open,
  onOpenChange,
  onCreated,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (status: SupplierCustomStatus) => void;
}>) {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [color, setColor] = useState<string | null>(COLOR_SWATCHES[2] ?? null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setLabel("");
    setKey("");
    setKeyTouched(false);
    setColor(COLOR_SWATCHES[2] ?? null);
    setDescription("");
    setFieldErrors({});
  }, [open]);

  useEffect(() => {
    if (keyTouched) return;
    setKey(slugifyStatusKey(label));
  }, [label, keyTouched]);

  async function handleSubmit() {
    const keyError = validateCustomStatusKeyClient(key);
    if (!label.trim()) {
      setFieldErrors({ label: "El nombre es obligatorio." });
      return;
    }
    if (keyError) {
      setFieldErrors({ key: keyError });
      return;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      const created = await createCustomStatusViaProxy({
        key,
        label,
        color,
        description: description.trim() || null,
      });
      toast.success("Estado creado.");
      onCreated(created);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el estado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Nuevo estado</SheetTitle>
          <SheetDescription>
            Creá un estado personalizado para insertarlo en el flujo después de Confirmado.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-2">
          <div className="space-y-2">
            <Label htmlFor="custom-status-label">Nombre</Label>
            <Input
              id="custom-status-label"
              maxLength={40}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            {fieldErrors.label ? (
              <p className="text-destructive text-xs">{fieldErrors.label}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-status-key">Clave</Label>
            <Input
              id="custom-status-key"
              value={key}
              onChange={(e) => {
                setKeyTouched(true);
                setKey(e.target.value);
              }}
            />
            <p className="text-muted-foreground text-xs">
              Se usa internamente; no puede coincidir con un estado del sistema.
            </p>
            {fieldErrors.key ? <p className="text-destructive text-xs">{fieldErrors.key}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  aria-label={`Color ${swatch}`}
                  className={cn(
                    "size-8 rounded-full border-2",
                    color === swatch ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: swatch }}
                  type="button"
                  onClick={() => setColor(swatch)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-status-description">Descripción (opcional)</Label>
            <Textarea
              id="custom-status-description"
              maxLength={200}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter className="gap-2 sm:gap-0">
          <Button disabled={saving} type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={saving || !label.trim() || !key.trim()} type="button" onClick={() => void handleSubmit()}>
            {saving ? <Loader2 aria-hidden className="size-4 animate-spin" /> : "Guardar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
