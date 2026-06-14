import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PurchaseOrderDetailClient } from "@/components/workspace/purchase-order-detail-client";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = { title: "Detalle de orden de compra" };

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({
  params,
}: Readonly<{ params: Promise<{ poId: string }> }>) {
  const { idToken, accessToken } = await getAuthSession();
  if (!idToken && !accessToken) redirect("/login");
  const { poId } = await params;
  return <PurchaseOrderDetailClient poId={poId} />;
}
