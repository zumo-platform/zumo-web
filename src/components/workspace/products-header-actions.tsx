"use client";

import { Download, PackagePlus, Settings } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductUploadSheets } from "@/components/workspace/product-upload-sheets";
import type { DashboardWarehouseRow } from "@/lib/inventory";

export function ProductsHeaderActions({
  onProductsChanged,
  warehouses,
  warehouseId,
  onWarehouseIdChange,
}: Readonly<{
  onProductsChanged: () => void;
  warehouses: readonly DashboardWarehouseRow[];
  warehouseId: number | null;
  onWarehouseIdChange: (warehouseId: number | null) => void;
}>) {
  return (
    <ProductUploadSheets
      onProductsChanged={onProductsChanged}
      renderTrigger={({ open }) => (
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:items-end">
          <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
            <Select
              value={warehouseId != null ? String(warehouseId) : "all"}
              onValueChange={(value) => {
                onWarehouseIdChange(value === "all" ? null : Number(value));
              }}
            >
              <SelectTrigger aria-label="Filtrar por bodega" className="h-9 w-full min-w-[11rem] sm:w-[13rem]">
                <SelectValue placeholder="Todas las bodegas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las bodegas</SelectItem>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.warehouseId} value={String(wh.warehouseId)}>
                    {wh.name}
                    {wh.isDefault ? " (predeterminada)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
            <Button asChild size="sm" variant="outline">
              <Link href="/products/backorders">Faltantes</Link>
            </Button>
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
        </div>
      )}
    />
  );
}
