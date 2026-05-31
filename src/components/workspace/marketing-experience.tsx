import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { workspaceContentOuterClassName, workspacePageHeaderClassName } from "@/lib/workspace-layout";
import { cn } from "@/lib/utils";

export function MarketingExperience() {
  return (
    <>
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
              <BreadcrumbPage>Marketing</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Marketing</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
            Herramientas para promocionar tu catálogo y comunicarte con tus clientes.
          </p>
        </div>
      </header>

      <div className={cn("flex flex-1 flex-col gap-4", workspaceContentOuterClassName)}>
        <Card>
          <CardHeader>
            <CardTitle>Próximamente</CardTitle>
            <CardDescription>
              Campañas, plantillas de WhatsApp y mensajes promocionales estarán disponibles aquí.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/products">Ver inventario</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
