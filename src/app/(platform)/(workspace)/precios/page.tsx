import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PricingExperience } from "@/components/workspace/pricing-experience";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Precios",
};

export default async function PreciosPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <PricingExperience />
    </div>
  );
}
