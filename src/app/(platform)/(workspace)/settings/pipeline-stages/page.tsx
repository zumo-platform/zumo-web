import type { Metadata } from "next";

import { PipelineStagesView } from "@/components/workspace/pipeline-stages-view";

export const metadata: Metadata = { title: "Etapas del pipeline" };

export default function PipelineStagesPage() {
  return <PipelineStagesView />;
}
