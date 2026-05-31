"use client";

import { useEffect, useState } from "react";

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
  const [bootstrap, setBootstrap] = useState<WorkspaceBootstrap>(
    () => readCachedWorkspaceBootstrap() ?? defaultBootstrap,
  );

  useEffect(() => {
    let cancelled = false;
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
      {children}
    </WorkspaceShell>
  );
}
