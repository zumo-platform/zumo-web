"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComprasProveedoresView } from "@/components/workspace/compras-proveedores-view";
import { PurchaseOrdersListView } from "@/components/workspace/purchase-orders-list-view";

export function ComprasView({
  initialTab,
}: Readonly<{ initialTab: "proveedores" | "ordenes" }>) {
  const [tab, setTab] = useState<"proveedores" | "ordenes">(initialTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-xl tracking-tight">Compras</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Gestiona tus proveedores y las órdenes de compra de inventario.
        </p>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "proveedores" | "ordenes")}>
        <TabsList>
          <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
          <TabsTrigger value="ordenes">Órdenes de compra</TabsTrigger>
        </TabsList>
        <TabsContent value="proveedores" className="mt-6">
          <ComprasProveedoresView />
        </TabsContent>
        <TabsContent value="ordenes" className="mt-6">
          <PurchaseOrdersListView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
