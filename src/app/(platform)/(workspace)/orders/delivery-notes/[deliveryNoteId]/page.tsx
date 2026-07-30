import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DeliveryNoteDetailExperience } from "@/components/workspace/delivery-note-detail-experience";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Nota de entrega",
};

export default async function DeliveryNoteDetailPage({
  params,
}: Readonly<{ params: Promise<{ deliveryNoteId: string }> }>) {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) redirect("/login");

  const { deliveryNoteId } = await params;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <DeliveryNoteDetailExperience deliveryNoteId={deliveryNoteId} />
    </div>
  );
}
