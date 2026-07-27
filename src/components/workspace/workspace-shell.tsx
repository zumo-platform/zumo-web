"use client";

import { useEffect, useRef } from "react";

import { usePathname } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { SellerMe, WhatsappStatusResult } from "@/lib/dashboard-types";
import { ORDERS_RESET_FILTERS_SESSION_KEY } from "@/lib/dashboard-orders";
import {
  WorkspacePreferencesProvider,
  type WorkspacePreferences,
} from "@/lib/workspace-preferences-context";
import { writeSessionCache } from "@/lib/workspace-session-cache";

import { AppSidebar } from "./app-sidebar";
import { WhatsappTokenBanner } from "./whatsapp-token-banner";

/** When the user leaves `/orders`, mark the next visit to reset URL filters. */
function useMarkOrdersListExit() {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    if (prev === "/orders" && pathname !== "/orders") {
      writeSessionCache(ORDERS_RESET_FILTERS_SESSION_KEY, true, 60_000);
    }
    if (pathname === "/orders" && prev !== "/orders") {
      writeSessionCache(ORDERS_RESET_FILTERS_SESSION_KEY, true, 60_000);
    }
  }, [pathname]);
}

export function WorkspaceShell({
  seller,
  supplier,
  appVersion,
  whatsappStatus,
  workspacePreferences,
  children,
}: Readonly<{
  seller: SellerMe["seller"];
  supplier: SellerMe["supplier"] | null;
  appVersion: string;
  whatsappStatus: WhatsappStatusResult | null;
  workspacePreferences: WorkspacePreferences;
  children: React.ReactNode;
}>) {
  useMarkOrdersListExit();

  return (
    <WorkspacePreferencesProvider value={workspacePreferences}>
      <div className="h-svh max-h-svh w-full overflow-hidden">
        <SidebarProvider className="flex h-full min-h-0 w-full overflow-hidden">
          <AppSidebar appVersion={appVersion} seller={seller} supplier={supplier} />
          <SidebarInset className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
            <WhatsappTokenBanner status={whatsappStatus} />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </WorkspacePreferencesProvider>
  );
}
