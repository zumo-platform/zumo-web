"use client";

import { Download, Filter, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function OrdersHeaderActions({
  showCreateOrder = true,
}: Readonly<{
  /** When false (zero orders), "Crear pedido" lives in the empty state instead. */
  showCreateOrder?: boolean;
}>) {
  return (
    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
      {showCreateOrder ? (
        <Button asChild className="gap-2" size="sm" type="button">
          <Link href="/orders/creation">
            <Plus aria-hidden className="size-4" />
            Crear pedido
          </Link>
        </Button>
      ) : null}
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
        <Link href="/whatsapp">
          <ShoppingCart aria-hidden className="size-4" />
          Ir a WhatsApp
        </Link>
      </Button>
    </div>
  );
}
