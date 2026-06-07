import { redirect } from "next/navigation";

import { ProductDetailExperience } from "@/components/workspace/product-detail-experience";
import { getAuthSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: Readonly<{
  params: Promise<{ productId: string }>;
}>) {
  const { productId: rawId } = await params;
  const productId = Number(rawId);
  if (!Number.isInteger(productId) || productId <= 0) {
    redirect("/products");
  }

  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <ProductDetailExperience productId={productId} />
    </div>
  );
}
