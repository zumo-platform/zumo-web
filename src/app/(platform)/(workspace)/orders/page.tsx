import type { Metadata } from "next";

import { OrdersExperience } from "@/components/workspace/orders-experience";

export const metadata: Metadata = {
  title: "Pedidos",
};

export default function OrdersPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <OrdersExperience />
    </div>
  );
}
