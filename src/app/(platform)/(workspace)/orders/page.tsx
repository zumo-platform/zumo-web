import { Package } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";

export default function OrdersPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <WorkspacePageHeader
        description="Review and manage orders from your WhatsApp conversations."
        title="Pedidos"
      />
      <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
        <Card className="max-w-lg border-dashed">
          <CardHeader className="text-center sm:text-left">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted sm:mx-0">
              <Package aria-hidden className="size-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Coming soon</CardTitle>
            <CardDescription>
              This screen will list confirmed and pending orders with filters and exports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-relaxed">
              For now, open <span className="font-medium text-foreground">Inbox</span> to confirm
              draft orders tied to a conversation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
