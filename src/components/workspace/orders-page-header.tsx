import type { ReactNode } from "react";

import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * Page header aligned with {@link ClientsPageHeader} / {@link ProductsPageHeader}.
 */
export function OrdersPageHeader({
  description,
  actions,
}: Readonly<{
  description: string;
  actions: ReactNode;
}>) {
  return (
    <header className="shrink-0 border-b bg-background px-6 py-5">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/inbox">Inicio</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Pedidos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-balance font-semibold text-2xl tracking-tight text-foreground md:text-3xl">
            Pedidos
          </h1>
          <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed md:text-[15px]">
            {description}
          </p>
        </div>
        {actions}
      </div>
    </header>
  );
}
