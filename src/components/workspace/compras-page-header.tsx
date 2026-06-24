import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { workspacePageHeaderClassName } from "@/lib/workspace-layout";

export function ComprasPageHeader() {
  return (
    <header className={cn("shrink-0 border-b bg-background", workspacePageHeaderClassName)}>
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/whatsapp">Inicio</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Compras</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-balance font-semibold text-2xl tracking-tight text-foreground md:text-3xl">
            Compras
          </h1>
          <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed md:text-[15px]">
            Gestiona tus proveedores y las órdenes de compra de inventario.
          </p>
        </div>
      </div>
    </header>
  );
}
