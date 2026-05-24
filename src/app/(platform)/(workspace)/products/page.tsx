import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { ProductsExperience } from "@/components/workspace/products-experience";
import { getServerApiBaseUrl } from "@/lib/api";
import {
  fetchProductsDashboard,
  fetchProductsDashboardViaAppProxy,
} from "@/lib/dashboard-products";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Inventario",
};

export default async function ProductsPage() {
  const { accessToken, idToken } = await getAuthSession();

  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const hdr = await headers();
  const cookieStore = await cookies();
  const hostRaw =
    hdr.get("x-forwarded-host")?.split(",")[0]?.trim() ?? hdr.get("host")?.split(",")[0]?.trim() ?? "";
  const protoRaw = hdr.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "";
  const proto = protoRaw.length > 0 ? protoRaw : "http";
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  let initialProducts = null;

  if (hostRaw.length > 0) {
    initialProducts = await fetchProductsDashboardViaAppProxy(`${proto}://${hostRaw}`, cookieHeader);
  }

  if (initialProducts === null) {
    initialProducts = await fetchProductsDashboard(getServerApiBaseUrl(), idToken, accessToken);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <ProductsExperience initialProducts={initialProducts} />
    </div>
  );
}
