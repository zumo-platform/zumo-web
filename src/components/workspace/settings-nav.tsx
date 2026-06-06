"use client";

import type { LucideIcon } from "lucide-react";
import { Building, Package, Shield, Sparkles, Truck, Warehouse, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const SETTINGS_NAV: ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/settings/business", label: "Negocio", icon: Building },
  { href: "/settings/delivery", label: "Logística", icon: Truck },
  { href: "/settings/warehouses", label: "Bodegas", icon: Warehouse },
  { href: "/settings/inventory", label: "Inventario", icon: Package },
  { href: "/settings/ai", label: "Comportamiento del AI", icon: Sparkles },
  { href: "/settings/permissions", label: "Permisos del equipo", icon: Shield },
  { href: "/settings/order-flow", label: "Flujo de pedidos", icon: Workflow },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones de opciones" className="flex flex-col gap-1 p-2">
      {SETTINGS_NAV.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            href={item.href}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
