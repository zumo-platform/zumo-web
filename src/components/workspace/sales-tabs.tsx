"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/sales/pipeline", label: "Flujo" },
  { href: "/quotes", label: "Cotizaciones" },
  { href: "/sales/opportunities", label: "Oportunidades" },
];

export function SalesTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones de ventas" className="flex shrink-0 items-center gap-1 border-b px-4 py-2">
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
