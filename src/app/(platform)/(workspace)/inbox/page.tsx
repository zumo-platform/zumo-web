import { Inbox } from "lucide-react";

import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";

export default function InboxPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <WorkspacePageHeader
        description="Bandeja unificada de mensajes y pedidos — próximamente."
        title="Inbox"
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <Inbox aria-hidden className="size-12 text-muted-foreground opacity-40" />
        <p className="font-medium text-foreground text-sm">Inbox en construcción</p>
        <p className="max-w-md text-muted-foreground text-sm leading-relaxed">
          Por ahora, los mensajes de WhatsApp están en la pestaña{" "}
          <span className="font-medium text-foreground">WhatsApp</span>.
        </p>
      </div>
    </div>
  );
}
