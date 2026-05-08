"use client";

import { useState } from "react";

import {
  Calendar,
  FileText,
  HelpCircle,
  Inbox,
  Loader2,
  LogOut,
  MessageSquare,
  Settings,
  ShoppingCart,
  Store,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { ZumoIsotype, ZumoWordmark } from "@/components/branding/zumo-logos";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { SellerMe } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type NavItem =
  | {
      href: string;
      icon: typeof Inbox;
      label: string;
    }
  | {
      disabled: true;
      tooltip: string;
      icon: typeof Inbox;
      label: string;
    };

const mainNav: NavItem[] = [
  { href: "/inbox", icon: Inbox, label: "Inbox" },
  {
    disabled: true,
    tooltip: "Pronto",
    icon: MessageSquare,
    label: "WhatsApp",
  },
  { href: "/orders", icon: ShoppingCart, label: "Pedidos" },
  {
    disabled: true,
    tooltip: "Pronto",
    icon: Calendar,
    label: "Calendario",
  },
  { href: "/clients", icon: Store, label: "Clientes" },
  {
    disabled: true,
    tooltip: "Pronto",
    icon: FileText,
    label: "Productos",
  },
  {
    disabled: true,
    tooltip: "Pronto",
    icon: Tag,
    label: "Precios",
  },
  {
    disabled: true,
    tooltip: "Pronto",
    icon: Users,
    label: "Vendedores",
  },
];

export function AppSidebar({
  seller,
  supplier,
  appVersion,
}: Readonly<{
  seller: SellerMe["seller"];
  supplier: SellerMe["supplier"] | null;
  appVersion: string;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const businessName = supplier?.businessName?.trim() || "Mi negocio";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border border-b px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            className={cn(
              "flex min-w-0 items-center gap-1 text-sidebar-foreground",
              "group-data-[collapsible=icon]:justify-center",
            )}
            href="/inbox"
          >
            <span className="group-data-[collapsible=icon]:hidden">
              <ZumoWordmark className="max-h-7 max-w-[min(100%,6.5rem)] md:max-h-8" />
            </span>
            <span className="hidden group-data-[collapsible=icon]:flex">
              <ZumoIsotype />
            </span>
          </Link>
          <SidebarTrigger className="shrink-0 text-sidebar-foreground" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-0 py-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => {
                const Icon = item.icon;

                if ("disabled" in item) {
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        disabled
                        tooltip={item.tooltip}
                        className="opacity-50"
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(`${item.href}/`));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        active &&
                          "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground",
                      )}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t p-2">
        <div className="flex items-center gap-2 rounded-md px-2 py-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent font-bold text-sidebar-accent-foreground text-xs shadow-sm">
            {businessName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate font-semibold text-sm">{businessName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:px-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold">
            {initials(seller.name || seller.email || "?")}
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate font-medium text-sm">{seller.name || "Usuario"}</p>
            <p className="truncate text-muted-foreground text-xs">{seller.email}</p>
          </div>
        </div>

        <SidebarSeparator className="my-1" />

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Soporte"
              type="button"
              onClick={() => toast.message("Soporte — próximamente")}
            >
              <HelpCircle />
              <span>Soporte</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Opciones">
              <Link href="/profile">
                <Settings />
                <span>Opciones</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <LogoutMenuButton />
          </SidebarMenuItem>
        </SidebarMenu>

        <p className="px-2 pt-2 text-center text-muted-foreground text-[10px] group-data-[collapsible=icon]:hidden">
          Versión {appVersion}
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function LogoutMenuButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } finally {
      setPending(false);
    }
  }

  return (
    <SidebarMenuButton disabled={pending} tooltip="Cerrar sesión" type="button" onClick={logout}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut />
      )}
      <span>Cerrar sesión</span>
    </SidebarMenuButton>
  );
}
