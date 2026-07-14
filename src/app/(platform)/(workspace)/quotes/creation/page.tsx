import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { QuoteForm } from "@/components/workspace/quote-form";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = { title: "Nueva cotización" };
export const dynamic = "force-dynamic";

export default async function QuoteCreationPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) redirect("/login");
  return <QuoteForm mode="create" />;
}
