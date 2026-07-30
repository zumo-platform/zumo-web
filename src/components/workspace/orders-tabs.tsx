"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS: ReadonlyArray<{ href: string; label: string; match: (path: string) => boolean }> = [
  {
    href: "/orders?status=all",
    label: "Pedidos",
    match: (path) =>
      path === "/orders" ||
      path === "/orders/creation" ||
      (path.startsWith("/orders/") && !path.startsWith("/orders/delivery-notes")),
  },
  {
    href: "/orders/delivery-notes",
    label: "Notas de entrega",
    match: (path) =>
      path === "/orders/delivery-notes" || path.startsWith("/orders/delivery-notes/"),
  },
];

export function OrdersTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones de pedidos" className="flex shrink-0 items-center gap-1 border-b px-4 py-2">
      {TABS.map((t) => {
        const active = t.match(pathname);
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
