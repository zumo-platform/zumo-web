"use client";

import { Download, PackagePlus, Settings } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ProductUploadSheets } from "@/components/workspace/product-upload-sheets";

export function ProductsHeaderActions({
  onProductsChanged,
}: Readonly<{
  onProductsChanged: () => void;
}>) {
  return (
    <ProductUploadSheets
      onProductsChanged={onProductsChanged}
      renderTrigger={({ open }) => (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            type="button"
            onClick={() => toast.message("Importar productos — próximamente")}
          >
            <Download aria-hidden className="size-4" />
            Importar
          </Button>
          <Button
            variant="outline"
            size="icon"
            type="button"
            className="size-9"
            aria-label="Ajustes de productos"
            onClick={() => toast.message("Ajustes — próximamente")}
          >
            <Settings aria-hidden className="size-4" />
          </Button>
          <Button size="sm" className="gap-2" type="button" onClick={open}>
            <PackagePlus aria-hidden className="size-4" />
            Agregar producto
          </Button>
        </div>
      )}
    />
  );
}
