import type { ReactNode } from "react";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { workspacePageHeaderClassName } from "@/lib/workspace-layout";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type ClientsPageHeaderMode = "list" | "creation";

/**
 * Application page header inspired by “page-header-2”: breadcrumbs plus title row with actions ([shadcndesign page headers](https://www.shadcndesign.com/pro-blocks/page-headers)).
 */
export function ClientsPageHeader({
  description,
  actions,
  mode = "list",
  className,
}: Readonly<{
  description: string;
  actions: ReactNode;
  mode?: ClientsPageHeaderMode;
  className?: string;
}>) {
  const isCreation = mode === "creation";

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
          {isCreation ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/clients">Clientes</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Creación de cliente</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <BreadcrumbItem>
              <BreadcrumbPage>Clientes</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-balance font-semibold text-2xl tracking-tight text-foreground md:text-3xl">
            {isCreation ? "Creación de cliente" : "Clientes"}
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
