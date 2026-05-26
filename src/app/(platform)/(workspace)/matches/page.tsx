import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MatchesExperience } from "@/components/workspace/matches-experience";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Matches",
};

export default async function MatchesPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <MatchesExperience />
    </div>
  );
}
