import type { Metadata } from "next";

import { OpportunitiesListView } from "@/components/workspace/opportunities-list-view";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchPipelineServer } from "@/lib/dashboard-pipeline";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = { title: "Oportunidades" };
export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const { accessToken, idToken } = await getAuthSession();
  const board = await fetchPipelineServer(getServerApiBaseUrl(), idToken, accessToken);
  return <OpportunitiesListView initialBoard={board} />;
}
