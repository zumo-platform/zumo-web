import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { ComprasTabs } from "@/components/workspace/compras-tabs";
import { getAuthSession } from "@/lib/session";

export default async function ComprasLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) redirect("/login");
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <ComprasTabs />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
