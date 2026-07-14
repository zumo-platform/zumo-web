import type { Metadata } from "next";

import { PipelineExperience } from "@/components/workspace/pipeline-experience";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchPipelineServer } from "@/lib/dashboard-pipeline";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = { title: "Pipeline de ventas" };
export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const { accessToken, idToken } = await getAuthSession();
  const board = await fetchPipelineServer(getServerApiBaseUrl(), idToken, accessToken);
  return <PipelineExperience initialBoard={board} />;
}
