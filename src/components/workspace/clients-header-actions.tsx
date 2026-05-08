"use client";

import { Download, Settings, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ClientsHeaderActions() {
  return (
    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        type="button"
        onClick={() => toast.message("Importar clientes — próximamente")}
      >
        <Download aria-hidden className="size-4" />
        Importar
      </Button>
      <Button
        variant="outline"
        size="icon"
        type="button"
        className="size-9"
        aria-label="Ajustes de clientes"
        onClick={() => toast.message("Ajustes — próximamente")}
      >
        <Settings aria-hidden className="size-4" />
      </Button>
      <Button
        size="sm"
        className="gap-2"
        type="button"
        onClick={() => toast.message("Agregar clientes — próximamente")}
      >
        <UserPlus aria-hidden className="size-4" />
        Agregar cliente
      </Button>
    </div>
  );
}
