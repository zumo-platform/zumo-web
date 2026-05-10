import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProductsExperience } from "@/components/workspace/products-experience";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchProductsDashboard } from "@/lib/dashboard-products";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Productos",
};

export default async function ProductsPage() {
  const { accessToken, idToken } = await getAuthSession();

  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const initialProducts = await fetchProductsDashboard(getServerApiBaseUrl(), idToken, accessToken);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <ProductsExperience initialProducts={initialProducts} />
    </div>
  );
}
