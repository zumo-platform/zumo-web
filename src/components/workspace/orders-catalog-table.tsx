"use client";

import { useMemo, useState } from "react";

import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MessageCircle, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardOrderListRow } from "@/lib/dashboard-orders";
import { cn } from "@/lib/utils";

function formatOrderDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function formatOrderTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function formatDeliveryDate(raw: string | null): string {
  if (!raw || !raw.trim()) return "—";
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return raw.trim();
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(t));
}

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "delivered":
      return "secondary";
    case "cancelled":
      return "destructive";
    case "pending":
    case "draft":
      return "outline";
    default:
      return "default";
  }
}

export function OrdersCatalogTable({
  data,
  customerNameById,
}: Readonly<{
  data: DashboardOrderListRow[];
  customerNameById: ReadonlyMap<number, string>;
}>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columns = useMemo<ColumnDef<DashboardOrderListRow>[]>(
    () => [
      {
        accessorKey: "orderId",
        header: "Order code",
        cell: ({ row }) => (
          <span className="block max-w-[min(200px,32vw)] truncate font-mono text-sm" title={row.original.orderId}>
            {row.original.orderId}
          </span>
        ),
      },
      {
        id: "customerName",
        header: "Customer name",
        cell: ({ row }) => {
          const name =
            customerNameById.get(row.original.customerId) ?? `Customer #${row.original.customerId}`;
          return (
            <span className="block max-w-[min(220px,36vw)] truncate text-sm" title={name}>
              {name}
            </span>
          );
        },
      },
      {
        id: "orderCreated",
        header: "Order created",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">{formatOrderDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: "deliveryDate",
        header: "Delivery date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">{formatDeliveryDate(row.original.deliveryDate)}</span>
        ),
      },
      {
        id: "orderCreation",
        header: "Order creation",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">{formatOrderTime(row.original.createdAt)}</span>
        ),
      },
      {
        id: "lineCount",
        header: "Number of items in the order",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">{row.original.lineCount.toLocaleString("en")}</span>
        ),
      },
      {
        id: "status",
        header: "Order status",
        cell: ({ row }) => (
          <Badge className="capitalize" variant={statusBadgeVariant(row.original.status)}>
            {row.original.status.replaceAll("_", " ")}
          </Badge>
        ),
      },
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all orders"
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select order ${row.original.orderId}`}
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "channel",
        header: "Channel",
        cell: ({ row }) => {
          const hasWa = Boolean(row.original.conversationId);
          return (
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              {hasWa ? (
                <>
                  <MessageCircle aria-hidden className="size-3.5 shrink-0" />
                  <span>WhatsApp</span>
                </>
              ) : (
                <span>—</span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const o = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`More actions for order ${o.orderId}`}
                  className="size-8"
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() =>
                    toast.message("Order detail", {
                      description: `Coming soon (${o.orderId}).`,
                    })
                  }
                >
                  View details
                </DropdownMenuItem>
                {o.conversationId ? (
                  <DropdownMenuItem asChild>
                    <Link href="/inbox">Open in Inbox</Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>Open in Inbox</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [customerNameById],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table useReactTable
  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.orderId,
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {selectedCount > 0 ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm"
          role="status"
        >
          <span className="text-foreground">
            {selectedCount === 1 ? "1 order selected" : `${selectedCount} orders selected`}
          </span>
          <Button disabled size="sm" type="button" variant="secondary">
            Bulk edit (coming soon)
          </Button>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.id === "select" && "w-10 px-2",
                      header.column.id === "channel" && "w-[7.5rem]",
                      header.column.id === "actions" && "w-10 px-2",
                      (header.column.id === "lineCount" || header.column.id === "orderCreation") &&
                        "min-w-[8.5rem]",
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow data-state={row.getIsSelected() ? "selected" : undefined} key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-28 text-center text-muted-foreground text-sm" colSpan={columns.length}>
                  No orders yet — rows will appear here when they exist.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
