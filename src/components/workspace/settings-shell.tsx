import type { ReactNode } from "react";

import { SettingsNav } from "@/components/workspace/settings-nav";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";

export function SettingsShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <WorkspacePageHeader
        description="Configurá tu negocio, el comportamiento del AI y los permisos del equipo."
        title="Opciones"
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-60 shrink-0 border-r bg-muted/10 md:block">
          <SettingsNav />
        </aside>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="border-b p-2 md:hidden">
            <SettingsNav />
          </div>
          <div className="mx-auto w-full max-w-3xl p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
