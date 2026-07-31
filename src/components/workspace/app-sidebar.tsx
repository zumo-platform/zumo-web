"use client";

import { useEffect, useState } from "react";

import {
  ChevronRight,
  Inbox,
  MapPin,
  Megaphone,
  MessageSquare,
  Package,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { SupplierWorkspaceMenu } from "@/components/workspace/supplier-workspace-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import type { SellerMe } from "@/lib/dashboard-types";
import { prefetchInventoryWorkspaceData } from "@/lib/products-catalog-cache";
import {
  prefetchCustomersWorkspaceData,
  prefetchOrdersWorkspaceData,
} from "@/lib/orders-catalog-cache";
import { cn } from "@/lib/utils";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

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
    }
  | { type: "pedidos" }
  | { type: "ventas" }
  | { type: "compras" };

type SidebarSubNavItem = Readonly<{
  href: string;
  label: string;
  isActive: (path: string) => boolean;
}>;

const PEDIDOS_SUB_NAV: readonly SidebarSubNavItem[] = [
  {
    href: "/orders?status=all",
    label: "Pedidos",
    isActive: (path) =>
      path === "/orders" ||
      path === "/orders/creation" ||
      (path.startsWith("/orders/") && !path.startsWith("/orders/delivery-notes")),
  },
  {
    href: "/orders/delivery-notes",
    label: "Notas de entrega",
    isActive: (path) =>
      path === "/orders/delivery-notes" || path.startsWith("/orders/delivery-notes/"),
  },
];

const SALES_SUB_NAV: readonly SidebarSubNavItem[] = [
  {
    href: "/sales/pipeline",
    label: "Flujo",
    isActive: (path) => path === "/sales/pipeline" || path.startsWith("/sales/pipeline/"),
  },
  {
    href: "/sales/opportunities",
    label: "Oportunidades",
    isActive: (path) =>
      path === "/sales/opportunities" || path.startsWith("/sales/opportunities/"),
  },
  {
    href: "/quotes",
    label: "Cotizaciones",
    isActive: (path) => path === "/quotes" || path.startsWith("/quotes/"),
  },
];

const COMPRAS_SUB_NAV: readonly SidebarSubNavItem[] = [
  {
    href: "/compras/proveedores",
    label: "Proveedores",
    isActive: (path) => path === "/compras/proveedores" || path === "/compras",
  },
  {
    href: "/compras/ordenes",
    label: "Órdenes de compra",
    isActive: (path) => path.startsWith("/compras/ordenes"),
  },
];

function isPedidosNavItem(item: NavItem): item is { type: "pedidos" } {
  return "type" in item && item.type === "pedidos";
}

function isVentasNavItem(item: NavItem): item is { type: "ventas" } {
  return "type" in item && item.type === "ventas";
}

function isComprasNavItem(item: NavItem): item is { type: "compras" } {
  return "type" in item && item.type === "compras";
}

function isDisabledNavItem(
  item: NavItem,
): item is Extract<NavItem, { disabled: true }> {
  return "disabled" in item;
}

function isLinkNavItem(
  item: NavItem,
): item is Extract<NavItem, { href: string }> {
  return "href" in item;
}

const baseMainNav: NavItem[] = [
  { href: "/inbox", icon: Inbox, label: "Inbox" },
  { href: "/whatsapp", icon: MessageSquare, label: "WhatsApp" },
  { type: "pedidos" },
  { type: "ventas" },
  { href: "/products", icon: Package, label: "Inventario" },
  { href: "/matches", icon: Sparkles, label: "Matches" },
  { href: "/clients", icon: Store, label: "Clientes" },
  { href: "/precios", icon: Tag, label: "Precios" },
  { href: "/vendedores", icon: Users, label: "Vendedores" },
  { type: "compras" },
  { href: "/marketing", icon: Megaphone, label: "Marketing" },
  { href: "/market", icon: MapPin, label: "Market business" },
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
  const { can } = useWorkspacePermissions();
  const businessName = supplier?.businessName?.trim() || "Mi negocio";

  const mainNav = baseMainNav.filter((item) => {
    if ("href" in item && item.href === "/marketing") {
      return can("marketing.access");
    }
    if ("href" in item && item.href === "/market") {
      return can("market.access");
    }
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border border-b px-3 py-3 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-2">
        <SupplierWorkspaceMenu businessName={businessName} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-0 py-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => {
                if (isPedidosNavItem(item)) {
                  return (
                    <ExpandableSidebarNavItem
                      key="pedidos"
                      icon={ShoppingCart}
                      isSectionActive={(path) => path.startsWith("/orders")}
                      label="Pedidos"
                      pathname={pathname}
                      router={router}
                      subNav={PEDIDOS_SUB_NAV}
                      tooltip="Pedidos"
                      onPrefetchSubItem={(href) => {
                        if (href.startsWith("/orders")) prefetchOrdersWorkspaceData();
                      }}
                    />
                  );
                }

                if (isVentasNavItem(item)) {
                  return (
                    <ExpandableSidebarNavItem
                      key="ventas"
                      icon={TrendingUp}
                      isSectionActive={(path) =>
                        path.startsWith("/sales/") || path.startsWith("/quotes")
                      }
                      label="Ventas"
                      pathname={pathname}
                      router={router}
                      subNav={SALES_SUB_NAV}
                      tooltip="Ventas"
                    />
                  );
                }

                if (isComprasNavItem(item)) {
                  return (
                    <ExpandableSidebarNavItem
                      key="compras"
                      icon={Truck}
                      isSectionActive={(path) => path.startsWith("/compras")}
                      label="Compras"
                      pathname={pathname}
                      router={router}
                      subNav={COMPRAS_SUB_NAV}
                      tooltip="Compras"
                    />
                  );
                }

                if (isDisabledNavItem(item)) {
                  const Icon = item.icon;
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

                if (!isLinkNavItem(item)) return null;

                const Icon = item.icon;
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
                      <Link
                        href={item.href === "/orders" ? "/orders?status=all" : item.href}
                        prefetch
                        onMouseEnter={() => {
                          router.prefetch(item.href);
                          if (item.href === "/products") prefetchInventoryWorkspaceData();
                          if (item.href === "/orders") prefetchOrdersWorkspaceData();
                          if (item.href === "/clients") prefetchCustomersWorkspaceData();
                        }}
                        onFocus={() => {
                          router.prefetch(item.href);
                          if (item.href === "/products") prefetchInventoryWorkspaceData();
                          if (item.href === "/orders") prefetchOrdersWorkspaceData();
                          if (item.href === "/clients") prefetchCustomersWorkspaceData();
                        }}
                      >
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

      <SidebarFooter className="border-sidebar-border border-t">
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold">
            {initials(seller.name || seller.email || "?")}
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate font-medium text-sm">{seller.name || "Usuario"}</p>
            <p className="truncate text-muted-foreground text-xs">{seller.email}</p>
          </div>
        </div>

        <p className="px-2 pt-2 text-center text-muted-foreground text-[10px] group-data-[collapsible=icon]:hidden">
          Versión {appVersion}
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function ExpandableSidebarNavItem({
  label,
  icon: Icon,
  tooltip,
  subNav,
  pathname,
  router,
  isSectionActive,
  onPrefetchSubItem,
}: Readonly<{
  label: string;
  icon: typeof Inbox;
  tooltip: string;
  subNav: readonly SidebarSubNavItem[];
  pathname: string;
  router: ReturnType<typeof useRouter>;
  isSectionActive: (path: string) => boolean;
  onPrefetchSubItem?: (href: string) => void;
}>) {
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";
  const firstSubHref = subNav[0]?.href;
  const sectionActive = isSectionActive(pathname);
  const [open, setOpen] = useState(sectionActive);

  useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  const activeButtonClass = cn(
    sectionActive &&
      "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground",
  );

  const prefetchSubItem = (href: string) => {
    router.prefetch(href);
    onPrefetchSubItem?.(href);
  };

  if (isCollapsed && firstSubHref) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={sectionActive}
          tooltip={tooltip}
          className={activeButtonClass}
        >
          <Link
            href={firstSubHref}
            prefetch
            onFocus={() => prefetchSubItem(firstSubHref)}
            onMouseEnter={() => prefetchSubItem(firstSubHref)}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={sectionActive}
        data-state={open ? "open" : "closed"}
        tooltip={tooltip}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={activeButtonClass}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
      <SidebarMenuAction
        aria-label={open ? `Contraer ${label.toLowerCase()}` : `Expandir ${label.toLowerCase()}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <ChevronRight className={cn("transition-transform", open && "rotate-90")} />
      </SidebarMenuAction>
      {open ? (
        <SidebarMenuSub>
          {subNav.map((subItem) => {
            const subActive = subItem.isActive(pathname);

            return (
              <SidebarMenuSubItem key={subItem.href}>
                <SidebarMenuSubButton asChild isActive={subActive}>
                  <Link
                    href={subItem.href}
                    prefetch
                    onMouseEnter={() => prefetchSubItem(subItem.href)}
                    onFocus={() => prefetchSubItem(subItem.href)}
                  >
                    <span>{subItem.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  );
}
