"use client";

import { useEffect, useState } from "react";

import {
  ChevronDown,
  HelpCircle,
  Home,
  Loader2,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const MENU_ITEMS = [
  { href: "/whatsapp", icon: Home, label: "Inicio" },
  { href: "/vendedores", icon: Users, label: "Usuarios" },
  { href: "/settings", icon: Settings, label: "Opciones" },
] as const;

function SupplierLogo({
  businessName,
  logoUrl,
  className,
}: Readonly<{
  businessName: string;
  logoUrl?: string | null;
  className?: string;
}>) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- supplier branding URLs vary by tenant
      <img
        alt=""
        className={cn("rounded-md object-cover", className)}
        src={logoUrl}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent font-bold text-sidebar-accent-foreground",
        className,
      )}
    >
      {businessName.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function SupplierWorkspaceMenu({
  businessName,
  logoUrl,
}: Readonly<{
  businessName: string;
  logoUrl?: string | null;
}>) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function logout() {
    setLogoutPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } finally {
      setLogoutPending(false);
    }
  }

  const triggerButton = (
    <button
      aria-label={`Menú de ${businessName}`}
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-lg border border-sidebar-border bg-background/70 px-2 py-1.5 text-left transition-colors",
        "hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:hover:bg-sidebar-accent",
      )}
      type="button"
    >
      <SupplierLogo
        businessName={businessName}
        className="size-8 shrink-0 text-xs"
        logoUrl={logoUrl}
      />
      <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <span className="block truncate font-semibold text-sm leading-tight">{businessName}</span>
        <span className="block truncate text-muted-foreground text-xs leading-tight">Zumo</span>
      </span>
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors",
          open && "border-sidebar-border bg-background",
          "group-data-[collapsible=icon]:hidden",
        )}
      >
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </span>
    </button>
  );

  if (!mounted) {
    return (
      <div className="min-w-0 w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        {triggerButton}
      </div>
    );
  }

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <div className="min-w-0 w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-(--radix-dropdown-menu-trigger-width) min-w-52 p-1"
          side="bottom"
          sideOffset={6}
        >
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link className="cursor-pointer" href={item.href} prefetch>
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={(event) => {
              event.preventDefault();
              toast.message("Soporte — próximamente");
            }}
          >
            <HelpCircle />
            <span>Soporte</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            disabled={logoutPending}
            onSelect={(event) => {
              event.preventDefault();
              void logout();
            }}
          >
            {logoutPending ? <Loader2 className="animate-spin" /> : <LogOut />}
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}
