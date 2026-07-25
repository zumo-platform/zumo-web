import type { Metadata } from "next";

import { MarketAdminTable } from "@/components/admin/market-admin-table";

export const metadata: Metadata = {
  title: "Admin · Market",
};

export default function MarketAdminPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Negocios del mercado</h1>
        <p className="text-muted-foreground text-sm">
          Curá el directorio HORECA: revisá importaciones, publicá, archivá y fusioná
          duplicados. Solo los negocios <strong>publicados</strong> son visibles para los
          proveedores.
        </p>
      </div>
      <MarketAdminTable />
    </div>
  );
}
