import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TeamExperience } from "@/components/workspace/team-experience";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Vendedores",
};

export default async function VendedoresPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  return <TeamExperience />;
}
