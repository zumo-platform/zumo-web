"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Empty onboarding when the supplier has no customers yet (matches product design).
 */
export function ClientsEmptyState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-balance font-semibold text-2xl tracking-tight text-foreground md:text-3xl">
          Registra tus clientes a Zumo
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-balance text-muted-foreground text-base leading-relaxed md:text-lg">
          Al traer tus clientes vas a mejorar el flujo de tus pedidos, el servicio al cliente e
          incrementarás tu cartera de ventas. Zumo pone a tu cliente en el centro de tus
          operaciones.
        </p>
        <div className="mt-10">
          <Button
            className="rounded-lg px-8"
            size="lg"
            type="button"
            onClick={() => toast.message("Agregar clientes — próximamente")}
          >
            Agregar Clientes
          </Button>
        </div>
      </div>
    </div>
  );
}
