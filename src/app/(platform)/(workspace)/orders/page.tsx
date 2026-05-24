import { Suspense } from "react";

import type { Metadata } from "next";
import { redirect } from "next/navigation";


import { OrdersExperience, OrdersExperienceFallback } from "@/components/workspace/orders-experience";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchCustomersDashboard } from "@/lib/dashboard-customers";
import {
  fetchAllOrdersDashboard,
  parseOrderStatusFilter,
} from "@/lib/dashboard-orders";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Pedidos",
};

/** Fresh list after manual creation / redirects from /orders/creation */
export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ status?: string }>;
}>) {
  const { accessToken, idToken } = await getAuthSession();

  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const params = await searchParams;
  const statusFilter = parseOrderStatusFilter(params.status);

  const apiUrl = getServerApiBaseUrl();
  const [initialOrdersResult, initialCustomers] = await Promise.all([
    fetchAllOrdersDashboard(apiUrl, idToken, accessToken, statusFilter),
    fetchCustomersDashboard(apiUrl, idToken, accessToken),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <Suspense fallback={<OrdersExperienceFallback />}>
        <OrdersExperience
          initialCustomers={initialCustomers}
          initialOrdersResult={initialOrdersResult}
          initialStatusFilter={statusFilter}
        />
      </Suspense>
    </div>
  );
}
