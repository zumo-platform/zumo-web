import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ComprasPageHeader } from "@/components/workspace/compras-page-header";
import { ComprasProveedoresView } from "@/components/workspace/compras-proveedores-view";
import { getAuthSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspaceTableScrollClassName,
} from "@/lib/workspace-layout";

export const metadata: Metadata = { title: "Proveedores" };

export const dynamic = "force-dynamic";

export default async function ComprasProveedoresPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) redirect("/login");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <ComprasPageHeader />
      <div className={cn(workspaceTableScrollClassName, workspaceContentOuterClassName)}>
        <div className={cn(workspaceContentInnerClassName, "gap-4")}>
          <ComprasProveedoresView />
        </div>
      </div>
    </div>
  );
}
