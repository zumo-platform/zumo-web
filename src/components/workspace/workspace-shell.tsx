"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { SellerMe } from "@/lib/dashboard-types";

import { AppSidebar } from "./app-sidebar";

export function WorkspaceShell({
  seller,
  supplier,
  appVersion,
  children,
}: Readonly<{
  seller: SellerMe["seller"];
  supplier: SellerMe["supplier"] | null;
  appVersion: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-svh w-full">
      <SidebarProvider defaultOpen>
        <AppSidebar appVersion={appVersion} seller={seller} supplier={supplier} />
        <SidebarInset className="flex min-h-svh flex-1 flex-col overflow-hidden bg-background">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
