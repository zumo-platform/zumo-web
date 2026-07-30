import type { Metadata } from "next";

import { DeliveryNotesExperience } from "@/components/workspace/delivery-notes-experience";

export const metadata: Metadata = {
  title: "Notas de entrega",
};

export default function DeliveryNotesPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <DeliveryNotesExperience />
    </div>
  );
}
