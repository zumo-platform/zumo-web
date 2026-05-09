import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ClientsExperience } from "@/components/workspace/clients-experience";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Creación de cliente",
};

export default async function ClientCreationPage() {
  const { idToken } = await getAuthSession();

  if (!idToken) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <ClientsExperience variant="creation" />
    </div>
  );
}
