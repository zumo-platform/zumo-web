"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mergeAdminBusinesses } from "@/lib/admin-market";

export function MarketAdminMergeDialog({
  open,
  onClose,
  onMerged,
}: Readonly<{ open: boolean; onClose: () => void; onMerged: () => void }>) {
  const [survivorId, setSurvivorId] = useState("");
  const [duplicateId, setDuplicateId] = useState("");
  const [busy, setBusy] = useState(false);

  async function doMerge() {
    const survivor = survivorId.trim();
    const duplicate = duplicateId.trim();
    if (!survivor || !duplicate || survivor === duplicate) {
      toast.error("Ingresá dos IDs distintos");
      return;
    }
    setBusy(true);
    try {
      await mergeAdminBusinesses(survivor, duplicate);
      toast.success("Duplicado fusionado y archivado");
      setSurvivorId("");
      setDuplicateId("");
      onMerged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fusionar duplicados</DialogTitle>
          <DialogDescription>
            El sobreviviente se mantiene; el duplicado se archiva y sus prospectos se mueven
            al sobreviviente. Copiá los IDs desde la tabla.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="merge-survivor">
              ID sobreviviente (se mantiene)
            </Label>
            <Input
              id="merge-survivor"
              placeholder="mkb_…"
              value={survivorId}
              onChange={(e) => setSurvivorId(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="merge-duplicate">
              ID duplicado (se archiva)
            </Label>
            <Input
              id="merge-duplicate"
              placeholder="mkb_…"
              value={duplicateId}
              onChange={(e) => setDuplicateId(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={busy} variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={busy} onClick={() => void doMerge()}>
            Fusionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
