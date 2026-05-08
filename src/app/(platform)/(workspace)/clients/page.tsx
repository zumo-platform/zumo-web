import { redirect } from "next/navigation";

import { ClientsEmptyState } from "@/components/workspace/clients-empty-state";
import { ClientsPageHeader } from "@/components/workspace/clients-page-header";
import { getAuthSession } from "@/lib/session";

type CustomersListResponse = Readonly<{
  customers?: unknown[];
  count?: number;
}>;

export default async function ClientsPage() {
  const { idToken } = await getAuthSession();

  if (!idToken) {
    redirect("/login");
  }

  const apiUrl = (process.env.API_URL ?? "").replace(/\/$/, "");

  let customerCount: number | null = null;

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/dashboard/customers`, {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as CustomersListResponse;
        customerCount =
          typeof data.count === "number"
            ? data.count
            : Array.isArray(data.customers)
              ? data.customers.length
              : 0;
      }
    } catch {
      customerCount = null;
    }
  }

  const showEmpty = customerCount === 0;

  const headerDescription = showEmpty
    ? "Registra y organiza a tus compradores para acelerar pedidos y dar mejor seguimiento."
    : customerCount === null
      ? "No pudimos verificar tu lista de clientes. Revisa la conexión con el API o inténtalo más tarde."
      : "Consulta y gestiona las relaciones con tus clientes.";

  if (showEmpty) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
        <ClientsPageHeader description={headerDescription} />
        <ClientsEmptyState />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ClientsPageHeader description={headerDescription} />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="font-medium text-foreground text-sm">
          {customerCount !== null && customerCount > 0
            ? `Tienes ${customerCount} ${customerCount === 1 ? "cliente" : "clientes"} — la vista detallada llegará pronto.`
            : "Lista de clientes — próximamente."}
        </p>
      </div>
    </div>
  );
}
