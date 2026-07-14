import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { QuoteDetailView } from "@/components/workspace/quote-detail-view";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = { title: "Cotización" };
export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) redirect("/login");
  const { quoteId } = await params;
  return <QuoteDetailView quoteId={quoteId} />;
}
