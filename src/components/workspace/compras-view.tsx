"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComprasPageHeader } from "@/components/workspace/compras-page-header";
import { ComprasProveedoresView } from "@/components/workspace/compras-proveedores-view";
import { PurchaseOrdersListView } from "@/components/workspace/purchase-orders-list-view";
import { cn } from "@/lib/utils";
import {
  workspaceContentInnerClassName,
  workspaceContentOuterClassName,
  workspaceTableScrollClassName,
} from "@/lib/workspace-layout";

export function ComprasView({
  initialTab,
}: Readonly<{ initialTab: "proveedores" | "ordenes" }>) {
  const [tab, setTab] = useState<"proveedores" | "ordenes">(initialTab);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <ComprasPageHeader />
      <div className={cn(workspaceTableScrollClassName, workspaceContentOuterClassName)}>
        <div className={cn(workspaceContentInnerClassName, "gap-4")}>
          <Tabs
            className="min-w-0"
            value={tab}
            onValueChange={(v) => setTab(v as "proveedores" | "ordenes")}
          >
            <TabsList>
              <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
              <TabsTrigger value="ordenes">Órdenes de compra</TabsTrigger>
            </TabsList>
            <TabsContent className="mt-6" value="proveedores">
              <ComprasProveedoresView />
            </TabsContent>
            <TabsContent className="mt-6" value="ordenes">
              <PurchaseOrdersListView />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
