import type { ReactNode } from "react";

import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  workspacePageHeaderClassName,
} from "@/lib/workspace-layout";

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
  className,
}: Readonly<{
  description: string;
  actions: ReactNode;
  className?: string;
}>) {
  return (
    <header className={cn("shrink-0 border-b bg-background", workspacePageHeaderClassName, className)}>
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/whatsapp">Inicio</Link>
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
