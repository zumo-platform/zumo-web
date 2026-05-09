"use client";

import { useCallback, useState, type ReactNode } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddCustomerForm } from "@/components/workspace/add-customer-form";
import { ClientsCustomersTable } from "@/components/workspace/clients-customers-table";
import { ClientsEmptyState } from "@/components/workspace/clients-empty-state";
import { ClientsHeaderActions } from "@/components/workspace/clients-header-actions";
import { ClientsPageHeader } from "@/components/workspace/clients-page-header";
import type { DashboardCustomerRow } from "@/lib/dashboard-customers";

export type ClientsExperienceVariant = "list" | "creation";

type ClientsListSection = "general" | "import";

export function ClientsExperience({
  initialCustomers,
  variant,
}: Readonly<{
  variant: ClientsExperienceVariant;
  /** List variant: supplier portfolio from GET /dashboard/customers (`null` = fetch error). */
  initialCustomers?: DashboardCustomerRow[] | null;
}>) {
  const router = useRouter();
  const [section, setSection] = useState<ClientsListSection>("general");

  const customerRows = variant === "list" ? (initialCustomers ?? null) : null;

  const apiError = variant === "list" && customerRows === null;
  const showEmpty = variant === "list" && customerRows !== null && customerRows.length === 0;
  const hasCustomers = variant === "list" && customerRows !== null && customerRows.length > 0;

  const goImportSection = useCallback(() => setSection("import"), []);

  const goClientsIndex = useCallback(() => {
    router.push("/clients");
  }, [router]);

  const openCreationPage = useCallback(() => {
    router.push("/clients/creation");
  }, [router]);

  const afterSave = useCallback(() => {
    router.replace("/clients");
  }, [router]);

  const listDescription = showEmpty
    ? "Registra y organiza a tus compradores para acelerar pedidos y dar mejor seguimiento."
    : apiError
      ? "No pudimos verificar tu lista de clientes. Revisa la conexión con el API o inténtalo más tarde."
      : hasCustomers && customerRows
        ? `Tienes ${customerRows.length} ${customerRows.length === 1 ? "cliente" : "clientes"}. Selecciona filas para acciones masivas (próximamente).`
        : "Consulta y gestiona tus clientes.";

  const creationDescription =
    "Completa la información del cliente. No se guarda nada hasta que pulses Guardar.";

  let headerActions: ReactNode;
  let headerMode: "list" | "creation" = "list";
  let pageDescription = listDescription;

  if (variant === "creation") {
    headerActions = (
      <Button size="sm" type="button" variant="outline" onClick={goClientsIndex}>
        Volver
      </Button>
    );
    headerMode = "creation";
    pageDescription = creationDescription;
  } else if (section !== "general") {
    headerActions = (
      <Button size="sm" type="button" variant="outline" onClick={() => setSection("general")}>
        Volver
      </Button>
    );
    pageDescription =
      section === "import"
        ? "Carga masiva y migraciones desde otros sistemas (próximamente)."
        : listDescription;
  } else {
    headerActions = (
      <ClientsHeaderActions onAddCustomer={openCreationPage} onImportCustomers={goImportSection} />
    );
  }

  let main: ReactNode;

  if (variant === "creation") {
    main = (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AddCustomerForm onCancel={goClientsIndex} onSaved={afterSave} />
      </div>
    );
  } else if (section === "import") {
    main = (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 md:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-6">
          <div>
            <h2 className="font-semibold text-foreground text-lg tracking-tight">Importación</h2>
            <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
              Carga masiva y migraciones desde otros sistemas estarán disponibles próximamente.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Archivo CSV</CardTitle>
              <CardDescription>
                Descargá una plantilla, completá tus filas y subí el archivo cuando habilitemos el flujo desde el
                panel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="secondary" disabled>
                Subir archivo (próximamente)
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Integraciones</CardTitle>
              <CardDescription>
                Conectores con ERP y hojas de cálculo compartidas quedarán en esta sección.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  } else if (showEmpty) {
    main = (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        <ClientsEmptyState onPrimaryCta={openCreationPage} />
      </div>
    );
  } else if (apiError) {
    main = (
      <div className="flex min-h-0 flex-1 overflow-y-auto px-4 md:px-8">
        <div className="mx-auto w-full max-w-3xl space-y-6 py-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conexión con el API</CardTitle>
              <CardDescription>
                No pudimos cargar tu cartera en este momento. Verificá la variable de entorno API_URL y que el backend
                responda, luego actualizá la página.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  } else if (hasCustomers && customerRows) {
    main = (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-5 md:px-6 md:py-6">
        <ClientsCustomersTable data={customerRows} />
      </div>
    );
  } else {
    main = (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground text-sm">
        No hay datos para mostrar.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <ClientsPageHeader actions={headerActions} description={pageDescription} mode={headerMode} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">{main}</div>
    </div>
  );
}
