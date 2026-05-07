import { UserRound } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";

export default function ProfilePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <WorkspacePageHeader
        description="Account, notifications, and workspace preferences."
        title="Opciones"
      />
      <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
        <Card className="max-w-lg border-dashed">
          <CardHeader className="text-center sm:text-left">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted sm:mx-0">
              <UserRound aria-hidden className="size-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Profile settings</CardTitle>
            <CardDescription>
              Company details, password changes, and notification defaults will live here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Use the sidebar footer to sign out; API-backed profile editing is on the roadmap.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
