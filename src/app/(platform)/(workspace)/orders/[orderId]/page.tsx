import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OrderDetailPageClient } from "@/components/workspace/order-detail-page-client";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Detalle del pedido",
};

export default async function OrderDetailPage({
  params,
}: Readonly<{
  params: Promise<{ orderId: string }>;
}>) {
  const { idToken, accessToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const { orderId } = await params;

  return <OrderDetailPageClient orderId={orderId} />;
}
