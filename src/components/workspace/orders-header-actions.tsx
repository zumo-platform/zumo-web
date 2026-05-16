"use client";

import { Download, Filter, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function OrdersHeaderActions() {
  return (
    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        type="button"
        onClick={() => toast.message("Filtros de pedidos — próximamente")}
      >
        <Filter aria-hidden className="size-4" />
        Filtrar
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        type="button"
        onClick={() => toast.message("Exportar pedidos — próximamente")}
      >
        <Download aria-hidden className="size-4" />
        Exportar
      </Button>
      <Button asChild size="sm" className="gap-2" type="button">
        <Link href="/inbox">
          <ShoppingCart aria-hidden className="size-4" />
          Ir al inbox
        </Link>
      </Button>
    </div>
  );
}
