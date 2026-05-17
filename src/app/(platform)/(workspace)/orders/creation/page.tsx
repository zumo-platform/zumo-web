import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateOrderForm } from "@/components/workspace/create-order-form";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchCustomersDashboard } from "@/lib/dashboard-customers";
import { activeProducts, fetchProductsDashboard } from "@/lib/dashboard-products";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Nuevo pedido",
};

export default async function OrderCreationPage() {
  const { accessToken, idToken } = await getAuthSession();

  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();
  const [customers, productsRaw] = await Promise.all([
    fetchCustomersDashboard(apiUrl, idToken, accessToken),
    fetchProductsDashboard(apiUrl, idToken, accessToken),
  ]);

  const products = activeProducts(productsRaw ?? []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <CreateOrderForm customers={customers ?? []} products={products} />
    </div>
  );
}
