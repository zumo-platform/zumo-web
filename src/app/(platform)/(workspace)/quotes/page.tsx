import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { QuotesListView } from "@/components/workspace/quotes-list-view";
import { SalesTabs } from "@/components/workspace/sales-tabs";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchQuotesServer } from "@/lib/dashboard-quotes";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = { title: "Cotizaciones" };
export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) redirect("/login");

  const apiUrl = getServerApiBaseUrl();
  const quotes = await fetchQuotesServer(apiUrl, idToken, accessToken);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <SalesTabs />
      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
        <QuotesListView initialQuotes={quotes} />
      </div>
    </div>
  );
}
