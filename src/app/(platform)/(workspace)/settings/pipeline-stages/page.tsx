import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PipelineStagesView } from "@/components/workspace/pipeline-stages-view";
import { getServerApiBaseUrl } from "@/lib/api";
import { fetchSellerCanEditDashboard } from "@/lib/dashboard-settings";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Opciones — Etapas del pipeline",
};

export const dynamic = "force-dynamic";

export default async function PipelineStagesPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();
  const canEdit = await fetchSellerCanEditDashboard(apiUrl, idToken, accessToken);

  return <PipelineStagesView canEdit={canEdit} />;
}
