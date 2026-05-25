import { redirect } from "next/navigation";

import { CustomerDetailExperience } from "@/components/workspace/customer-detail-experience";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchCustomersDashboard } from "@/lib/dashboard-customers";
import { getAuthSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: Readonly<{
  params: Promise<{ customerId: string }>;
}>) {
  const { customerId: rawId } = await params;
  const customerId = Number(rawId);
  if (!Number.isInteger(customerId) || customerId <= 0) {
    redirect("/clients");
  }

  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();
  const customers = await fetchCustomersDashboard(apiUrl, idToken, accessToken);
  const navigationCustomerIds = customers?.map((c) => c.customerId) ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <CustomerDetailExperience
        customerId={customerId}
        navigationCustomerIds={navigationCustomerIds}
      />
    </div>
  );
}
