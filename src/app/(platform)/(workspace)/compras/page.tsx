import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ComprasView } from "@/components/workspace/compras-view";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = { title: "Compras" };

export const dynamic = "force-dynamic";

export default async function ComprasPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ tab?: string }> }>) {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) redirect("/login");
  const { tab } = await searchParams;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <ComprasView initialTab={tab === "ordenes" ? "ordenes" : "proveedores"} />
    </div>
  );
}
