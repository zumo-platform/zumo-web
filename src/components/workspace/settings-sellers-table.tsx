"use client";

import { UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DashboardSellerRow } from "@/lib/dashboard-settings";

function roleLabel(role: string): string {
  switch (role.trim().toLowerCase()) {
    case "owner":
      return "Propietario";
    case "admin":
      return "Administrador";
    case "seller":
      return "Vendedor";
    default:
      return role.replaceAll("_", " ");
  }
}

function formatLastLogin(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SettingsSellersTable({
  sellers,
}: Readonly<{
  sellers: DashboardSellerRow[];
}>) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            {sellers.length === 1
              ? "1 vendedor en tu negocio"
              : `${sellers.length} vendedores en tu negocio`}
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button className="gap-2" disabled size="sm" type="button" variant="outline">
                  <UserPlus aria-hidden className="size-4" />
                  Invitar vendedor
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Próximamente</TooltipContent>
          </Tooltip>
        </div>

        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellers.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground text-sm" colSpan={5}>
                    No hay vendedores registrados.
                  </TableCell>
                </TableRow>
              ) : (
                sellers.map((seller) => (
                  <TableRow key={seller.sellerId}>
                    <TableCell className="font-medium">{seller.name}</TableCell>
                    <TableCell className="text-muted-foreground">{seller.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabel(seller.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={seller.active ? "secondary" : "destructive"}>
                        {seller.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {formatLastLogin(seller.lastLoginAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
