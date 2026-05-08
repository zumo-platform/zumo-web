import { redirect } from "next/navigation";

import { ClientsExperience } from "@/components/workspace/clients-experience";
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <ClientsExperience initialCustomerCount={customerCount} />
    </div>
  );
}
