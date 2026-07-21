"use client";

import { useMemo, useState } from "react";

import { ChevronDown, EyeOff, Mail, MessageCircle, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { InboxChannel, InboxSellerOption } from "@/lib/dashboard-inbox";
import { cn } from "@/lib/utils";

export type InboxChannelFilter = "all" | InboxChannel;

const CHANNEL_FILTERS: ReadonlyArray<{
  value: InboxChannelFilter;
  label: string;
  icon?: typeof Mail;
}> = [
  { value: "all", label: "Todos" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "email", label: "Correo", icon: Mail },
];

export function InboxFiltersBar({
  channelFilter,
  onChannelFilterChange,
  unseenOnly,
  onUnseenOnlyChange,
  selectedSellerIds,
  onSelectedSellerIdsChange,
  sellers,
  canFilterBySeller,
}: Readonly<{
  channelFilter: InboxChannelFilter;
  onChannelFilterChange: (value: InboxChannelFilter) => void;
  unseenOnly: boolean;
  onUnseenOnlyChange: (value: boolean) => void;
  selectedSellerIds: ReadonlySet<number>;
  onSelectedSellerIdsChange: (ids: Set<number>) => void;
  sellers: readonly InboxSellerOption[];
  canFilterBySeller: boolean;
}>) {
  const [sellerQuery, setSellerQuery] = useState("");

  const activeSellers = useMemo(
    () => sellers.filter((s) => s.active !== false),
    [sellers],
  );

  const filteredSellers = useMemo(() => {
    const q = sellerQuery.trim().toLowerCase();
    if (!q) return activeSellers;
    return activeSellers.filter((s) => s.name.toLowerCase().includes(q));
  }, [activeSellers, sellerQuery]);

  const sellerLabel =
    selectedSellerIds.size === 0
      ? "Todos los vendedores"
      : selectedSellerIds.size === 1
        ? (activeSellers.find((s) => selectedSellerIds.has(s.sellerId))?.name ?? "1 vendedor")
        : `${selectedSellerIds.size} vendedores`;

  function toggleSeller(sellerId: number) {
    const next = new Set(selectedSellerIds);
    if (next.has(sellerId)) next.delete(sellerId);
    else next.add(sellerId);
    onSelectedSellerIdsChange(next);
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
      <div
        aria-label="Filtrar por canal"
        className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-0.5"
        role="group"
      >
        {CHANNEL_FILTERS.map((opt) => {
          const Icon = opt.icon;
          const active = channelFilter === opt.value;
          return (
            <button
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors",
                active
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                opt.value === "whatsapp" && active && "text-emerald-800",
                opt.value === "email" && active && "text-sky-800",
              )}
              key={opt.value}
              type="button"
              onClick={() => onChannelFilterChange(opt.value)}
            >
              {Icon ? <Icon aria-hidden className="size-3" /> : null}
              {opt.label}
            </button>
          );
        })}
      </div>

      <button
        aria-pressed={unseenOnly}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
          unseenOnly
            ? "border-amber-300 bg-amber-50 font-medium text-amber-900"
            : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground",
        )}
        type="button"
        onClick={() => onUnseenOnlyChange(!unseenOnly)}
      >
        <EyeOff aria-hidden className="size-3.5" />
        No vistos
      </button>

      {canFilterBySeller ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 gap-1.5 px-2.5 text-xs" type="button" variant="outline">
              <Users aria-hidden className="size-3.5" />
              <span className="max-w-[9rem] truncate">{sellerLabel}</span>
              <ChevronDown aria-hidden className="size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Vendedores</DropdownMenuLabel>
            <div className="px-2 pb-2">
              <Input
                className="h-8"
                placeholder="Buscar vendedor…"
                value={sellerQuery}
                onChange={(e) => setSellerQuery(e.target.value)}
              />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={selectedSellerIds.size === 0}
              onCheckedChange={() => onSelectedSellerIdsChange(new Set())}
              onSelect={(e) => e.preventDefault()}
            >
              Todos los vendedores
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {filteredSellers.map((seller) => (
              <DropdownMenuCheckboxItem
                checked={selectedSellerIds.has(seller.sellerId)}
                key={seller.sellerId}
                onCheckedChange={() => toggleSeller(seller.sellerId)}
                onSelect={(e) => e.preventDefault()}
              >
                {seller.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
