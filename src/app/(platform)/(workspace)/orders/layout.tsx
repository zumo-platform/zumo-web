import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { OrdersTabs } from "@/components/workspace/orders-tabs";
import { getAuthSession } from "@/lib/session";

export default async function OrdersLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) redirect("/login");
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <OrdersTabs />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
