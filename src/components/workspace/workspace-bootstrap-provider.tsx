"use client";

import { useEffect, useState } from "react";

import { NotificationProvider } from "@/components/workspace/notification-provider";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import {
  defaultBootstrap,
  loadWorkspaceBootstrap,
  readCachedWorkspaceBootstrap,
  type WorkspaceBootstrap,
} from "@/lib/workspace-bootstrap";

export function WorkspaceBootstrapProvider({
  appVersion,
  children,
}: Readonly<{
  appVersion: string;
  children: React.ReactNode;
}>) {
  // Always match SSR: never read session cache in the initial state initializer.
  const [bootstrap, setBootstrap] = useState<WorkspaceBootstrap>(defaultBootstrap);

  useEffect(() => {
    let cancelled = false;
    const cached = readCachedWorkspaceBootstrap();
    if (cached) setBootstrap(cached);

    void loadWorkspaceBootstrap().then((data) => {
      if (!cancelled) setBootstrap(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WorkspaceShell
      appVersion={appVersion}
      seller={bootstrap.seller}
      supplier={bootstrap.supplier}
      whatsappStatus={bootstrap.whatsappStatus}
      workspacePreferences={bootstrap.preferences}
    >
      <NotificationProvider>{children}</NotificationProvider>
    </WorkspaceShell>
  );
}
