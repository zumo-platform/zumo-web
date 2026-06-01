import type { Metadata } from "next";

import { ProductsExperience } from "@/components/workspace/products-experience";

export const metadata: Metadata = {
  title: "Inventario",
};

export default function ProductsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <ProductsExperience />
    </div>
  );
}
