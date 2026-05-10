import { redirect } from "next/navigation";

import { ClientsExperience } from "@/components/workspace/clients-experience";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchCustomersDashboard } from "@/lib/dashboard-customers";
import { getAuthSession } from "@/lib/session";

export default async function ClientsPage() {
  const { accessToken, idToken } = await getAuthSession();

  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();
  const initialCustomers = await fetchCustomersDashboard(apiUrl, idToken, accessToken);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <ClientsExperience initialCustomers={initialCustomers} variant="list" />
    </div>
  );
}
