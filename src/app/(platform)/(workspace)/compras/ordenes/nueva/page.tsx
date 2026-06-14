import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreatePurchaseOrderForm } from "@/components/workspace/create-purchase-order-form";
import { getServerApiBaseUrl } from "@/lib/api";
import { activeProducts, fetchProductsDashboard } from "@/lib/dashboard-products";
import { fetchVendorsServer, fetchWarehousesServer } from "@/lib/purchase-orders-server";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = { title: "Nueva orden de compra" };

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) redirect("/login");

  const apiUrl = getServerApiBaseUrl();
  const [vendors, warehouses, productsRaw] = await Promise.all([
    fetchVendorsServer(apiUrl, idToken, accessToken),
    fetchWarehousesServer(apiUrl, idToken, accessToken),
    fetchProductsDashboard(apiUrl, idToken, accessToken),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <CreatePurchaseOrderForm
        products={activeProducts(productsRaw ?? [])}
        vendors={vendors ?? []}
        warehouses={warehouses ?? []}
      />
    </div>
  );
}
