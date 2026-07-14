import type { Metadata } from "next";

import { BusinessTypesView } from "@/components/workspace/business-types-view";

export const metadata: Metadata = { title: "Tipos de negocio" };

export default function BusinessTypesPage() {
  return <BusinessTypesView />;
}
