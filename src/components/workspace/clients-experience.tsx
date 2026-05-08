"use client";

import { useCallback, useState } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AddCustomerForm } from "@/components/workspace/add-customer-form";
import { ClientsEmptyState } from "@/components/workspace/clients-empty-state";
import { ClientsHeaderActions } from "@/components/workspace/clients-header-actions";
import { ClientsPageHeader } from "@/components/workspace/clients-page-header";

export function ClientsExperience({
  initialCustomerCount,
}: Readonly<{
  initialCustomerCount: number | null;
}>) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const showEmpty = initialCustomerCount === 0;
  const hasCustomers = initialCustomerCount !== null && initialCustomerCount > 0;
  const apiError = initialCustomerCount === null;

  const openForm = useCallback(() => setShowCreateForm(true), []);
  const closeForm = useCallback(() => setShowCreateForm(false), []);

  const afterSave = useCallback(() => {
    router.refresh();
    setShowCreateForm(false);
  }, [router]);

  const listDescription = showEmpty
    ? "Registra y organiza a tus compradores para acelerar pedidos y dar mejor seguimiento."
    : apiError
      ? "No pudimos verificar tu lista de clientes. Revisa la conexión con el API o inténtalo más tarde."
      : "Consulta y gestiona las relaciones con tus clientes.";

  const formDescription =
    "Completa la información del cliente. Nada se guarda en el servidor hasta que pulses Guardar.";

  const headerActions = showCreateForm ? (
    <Button size="sm" type="button" variant="outline" onClick={closeForm}>
      Volver
    </Button>
  ) : (
    <ClientsHeaderActions onAddCustomer={openForm} />
  );

  if (showCreateForm) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <ClientsPageHeader actions={headerActions} description={formDescription} />
        <AddCustomerForm onCancel={closeForm} onSaved={afterSave} />
      </div>
    );
  }

  if (showEmpty) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
        <ClientsPageHeader actions={headerActions} description={listDescription} />
        <ClientsEmptyState onPrimaryCta={openForm} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ClientsPageHeader actions={headerActions} description={listDescription} />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="font-medium text-foreground text-sm">
          {hasCustomers
            ? `Tienes ${initialCustomerCount} ${initialCustomerCount === 1 ? "cliente" : "clientes"} — la vista detallada llegará pronto.`
            : "Lista de clientes — próximamente."}
        </p>
      </div>
    </div>
  );
}
