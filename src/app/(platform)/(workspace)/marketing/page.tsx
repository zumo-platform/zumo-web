import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MarketingExperience } from "@/components/workspace/marketing-experience";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Marketing",
};

export default async function MarketingPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <MarketingExperience />
    </div>
  );
}
