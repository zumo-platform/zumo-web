"use client";

import { useMemo, useState, type ComponentType } from "react";

import {
  ArrowDownUp,
  AtSign,
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  Search,
  SlidersHorizontal,
  Store,
  Target,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { ConversationOrderState, ConversationUiStatus } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

import {
  ESTADO_OPTIONS,
  KIND_OPTIONS,
  PEDIDO_OPTIONS,
  SORT_OPTIONS,
  type AssignedFilter,
  type ConversationFilterState,
  type ConversationKind,
  type SortOption,
} from "./conversation-filters";

export type SellerOption = Readonly<{ sellerId: number; name: string }>;

export type ConversationFilterBarProps = Readonly<{
  filters: ConversationFilterState;
  onChange: (next: ConversationFilterState) => void;
  sellers: readonly SellerOption[];
  canViewAll: boolean;
}>;

const ESTADO_ICON: Record<ConversationUiStatus, ComponentType<{ className?: string }>> = {
  sin_responder: Circle,
  abierto: CircleDashed,
  cerrado: CircleCheck,
};

const KIND_ICON: Record<ConversationKind, ComponentType<{ className?: string }>> = {
  cliente: Store,
  desconocido: CircleHelp,
};

function TriggerLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return <span className="truncate font-medium text-sm">{children}</span>;
}

export function ConversationFilterBar({
  filters,
  onChange,
  sellers,
  canViewAll,
}: ConversationFilterBarProps) {
  const [sellerQuery, setSellerQuery] = useState("");

  const toggleStatus = (value: ConversationUiStatus) => {
    const has = filters.statuses.includes(value);
    const next = has
      ? filters.statuses.filter((s) => s !== value)
      : [...filters.statuses, value];
    onChange({
      ...filters,
      statuses: next.length ? next : ESTADO_OPTIONS.map((o) => o.value),
    });
  };

  const toggleKind = (value: ConversationKind) => {
    const has = filters.kinds.includes(value);
    const next = has ? filters.kinds.filter((k) => k !== value) : [...filters.kinds, value];
    onChange({ ...filters, kinds: next.length ? next : KIND_OPTIONS.map((o) => o.value) });
  };

  const togglePedido = (value: ConversationOrderState) => {
    const has = filters.pedidoStates.includes(value);
    const next = has
      ? filters.pedidoStates.filter((p) => p !== value)
      : [...filters.pedidoStates, value];
    onChange({ ...filters, pedidoStates: next });
  };

  const clearPedido = () => onChange({ ...filters, pedidoStates: [] });
  const setSort = (value: SortOption) => onChange({ ...filters, sort: value });

  const assignedValue: string =
    filters.assigned.mode === "seller"
      ? `seller:${String(filters.assigned.sellerId)}`
      : filters.assigned.mode;

  const setAssigned = (raw: string) => {
    let next: AssignedFilter;
    if (raw.startsWith("seller:")) {
      next = { mode: "seller", sellerId: Number.parseInt(raw.slice("seller:".length), 10) };
    } else if (raw === "me" || raw === "all" || raw === "unassigned") {
      next = { mode: raw };
    } else {
      next = { mode: "me" };
    }
    onChange({ ...filters, assigned: next });
  };

  const filteredSellers = useMemo(() => {
    const q = sellerQuery.trim().toLowerCase();
    if (!q) return sellers;
    return sellers.filter((s) => s.name.toLowerCase().includes(q));
  }, [sellers, sellerQuery]);

  const estadoActive = filters.statuses.length < ESTADO_OPTIONS.length;
  const kindActive = filters.kinds.length < KIND_OPTIONS.length;
  const pedidoCount = filters.pedidoStates.length;

  return (
    <div className="flex flex-col gap-2 border-b bg-muted/20 p-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-full min-w-0 gap-1 px-2" size="sm" type="button" variant="outline">
              <TriggerLabel>Estado</TriggerLabel>
              {estadoActive ? (
                <Badge className="h-4 shrink-0 px-1 text-[10px]" variant="secondary">
                  {filters.statuses.length}
                </Badge>
              ) : null}
              <ChevronDown aria-hidden className="size-3.5 shrink-0 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Estado</DropdownMenuLabel>
            {ESTADO_OPTIONS.map((opt) => {
              const Icon = ESTADO_ICON[opt.value];
              return (
                <DropdownMenuCheckboxItem
                  checked={filters.statuses.includes(opt.value)}
                  key={opt.value}
                  onCheckedChange={() => toggleStatus(opt.value)}
                  onSelect={(e) => e.preventDefault()}
                >
                  <Icon className="mr-2 size-4 text-muted-foreground" />
                  {opt.label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-full min-w-0 gap-1 px-2" size="sm" type="button" variant="outline">
              <TriggerLabel>Asignado</TriggerLabel>
              <ChevronDown aria-hidden className="size-3.5 shrink-0 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {canViewAll ? (
              <div className="p-1.5">
                <div className="relative">
                  <Search
                    aria-hidden
                    className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    className="h-8 pl-7 text-sm"
                    onChange={(e) => setSellerQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Buscar compañero de trabajo"
                    value={sellerQuery}
                  />
                </div>
              </div>
            ) : null}
            <DropdownMenuRadioGroup onValueChange={setAssigned} value={assignedValue}>
              <DropdownMenuRadioItem value="me">
                <AtSign className="mr-2 size-4 text-muted-foreground" />
                Asignados a mí
              </DropdownMenuRadioItem>
              {canViewAll ? (
                <DropdownMenuRadioItem value="all">
                  <Users className="mr-2 size-4 text-muted-foreground" />
                  Todos
                </DropdownMenuRadioItem>
              ) : null}
              {canViewAll ? (
                <DropdownMenuRadioItem value="unassigned">
                  <Target className="mr-2 size-4 text-muted-foreground" />
                  Sin Asignar
                </DropdownMenuRadioItem>
              ) : null}
              {canViewAll && filteredSellers.length > 0 ? <DropdownMenuSeparator /> : null}
              {canViewAll
                ? filteredSellers.map((s) => (
                    <DropdownMenuRadioItem key={s.sellerId} value={`seller:${String(s.sellerId)}`}>
                      <span className="mr-2 inline-flex size-4 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground">
                        {s.name.slice(0, 1).toUpperCase()}
                      </span>
                      {s.name}
                    </DropdownMenuRadioItem>
                  ))
                : null}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-full min-w-0 gap-1 px-2" size="sm" type="button" variant="outline">
              <TriggerLabel>Pedido</TriggerLabel>
              {pedidoCount > 0 ? (
                <Badge className="h-4 shrink-0 px-1 text-[10px]" variant="secondary">
                  {pedidoCount}
                </Badge>
              ) : null}
              <ChevronDown aria-hidden className="size-3.5 shrink-0 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Pedido</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={pedidoCount === 0}
              onCheckedChange={() => clearPedido()}
              onSelect={(e) => e.preventDefault()}
            >
              Todos
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {PEDIDO_OPTIONS.map((opt) => (
              <DropdownMenuCheckboxItem
                checked={filters.pedidoStates.includes(opt.value)}
                key={opt.value}
                onCheckedChange={() => togglePedido(opt.value)}
                onSelect={(e) => e.preventDefault()}
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Filtrar por tipo de contacto"
              className="relative size-8 shrink-0 p-0"
              size="sm"
              type="button"
              variant="outline"
            >
              <SlidersHorizontal aria-hidden className="size-4" />
              {kindActive ? (
                <span className="-right-1 -top-1 absolute size-2 rounded-full bg-primary" />
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Tipo de contacto</DropdownMenuLabel>
            {KIND_OPTIONS.map((opt) => {
              const Icon = KIND_ICON[opt.value];
              return (
                <DropdownMenuCheckboxItem
                  checked={filters.kinds.includes(opt.value)}
                  key={opt.value}
                  onCheckedChange={() => toggleKind(opt.value)}
                  onSelect={(e) => e.preventDefault()}
                >
                  <Icon className="mr-2 size-4 text-muted-foreground" />
                  {opt.label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className={cn("h-9 pl-8 text-sm")}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Buscar contactos"
            value={filters.search}
          />
          {filters.search ? (
            <button
              aria-label="Limpiar búsqueda"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground text-xs hover:text-foreground"
              onClick={() => onChange({ ...filters, search: "" })}
              type="button"
            >
              ✕
            </button>
          ) : null}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Ordenar conversaciones"
              className="size-9 shrink-0 p-0"
              size="sm"
              type="button"
              variant="outline"
            >
              <ArrowDownUp aria-hidden className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              onValueChange={(v) => setSort(v as SortOption)}
              value={filters.sort}
            >
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      filters.sort === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
