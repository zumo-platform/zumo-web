"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { SellerMe, WhatsappStatusResult } from "@/lib/dashboard-types";

import { AppSidebar } from "./app-sidebar";
import { WhatsappTokenBanner } from "./whatsapp-token-banner";

export function WorkspaceShell({
  seller,
  supplier,
  appVersion,
  whatsappStatus,
  children,
}: Readonly<{
  seller: SellerMe["seller"];
  supplier: SellerMe["supplier"] | null;
  appVersion: string;
  whatsappStatus: WhatsappStatusResult | null;
  children: React.ReactNode;
}>) {
  return (
    <div className="h-svh max-h-svh w-full overflow-hidden">
      <SidebarProvider className="flex h-full min-h-0 w-full overflow-hidden">
        <AppSidebar appVersion={appVersion} seller={seller} supplier={supplier} />
        <SidebarInset className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
          <WhatsappTokenBanner status={whatsappStatus} />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
