import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OrdersExperience } from "@/components/workspace/orders-experience";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchCustomersDashboard } from "@/lib/dashboard-customers";
import { fetchAllOrdersDashboard } from "@/lib/dashboard-orders";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Pedidos",
};

export default async function OrdersPage() {
  const { accessToken, idToken } = await getAuthSession();

  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();
  const [initialOrders, initialCustomers] = await Promise.all([
    fetchAllOrdersDashboard(apiUrl, idToken, accessToken),
    fetchCustomersDashboard(apiUrl, idToken, accessToken),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <OrdersExperience initialCustomers={initialCustomers} initialOrders={initialOrders} />
    </div>
  );
}
