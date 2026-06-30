"use client";

import { Button } from "@/components/ui/button";

export function DiscountListEmptyState({
  onCreate,
  canEdit,
}: Readonly<{
  onCreate: () => void;
  canEdit: boolean;
}>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-balance font-semibold text-2xl tracking-tight text-foreground md:text-3xl">
          Agrega lista de precios
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
          Crea listas con descuentos por producto o categoría y asígnalas a tus clientes. El
          precio final se congela en cada pedido.
        </p>
        {canEdit ? (
          <div className="mt-10">
            <Button className="rounded-lg px-8" size="lg" type="button" onClick={onCreate}>
              Crear lista de precios
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
