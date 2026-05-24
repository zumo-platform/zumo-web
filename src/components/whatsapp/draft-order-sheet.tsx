"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MatchCoverageIndicator } from "@/components/workspace/match-coverage-indicator";
import { OrderLifecycleActions } from "@/components/workspace/order-lifecycle-actions";
import {
  fetchCustomerDetailViaProxy,
  fetchSellersViaProxy,
  formatCustomerAddress,
  type DashboardCustomerDetail,
} from "@/lib/dashboard-customers";
import {
  DashboardOrderActionError,
  fetchDashboardOrderDetailViaProxy,
  patchDashboardOrderViaProxy,
  type DashboardOrderDetail,
} from "@/lib/dashboard-orders";
import { fetchProductsViaProxy, selectableProducts, type DashboardProductRow } from "@/lib/dashboard-products";
import type { Conversation, Order } from "@/lib/dashboard-types";
import { parseMatchCoverage } from "@/lib/match-coverage";
import { defaultDeliveryDateForOrder } from "@/lib/order-delivery-date";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import { formatOrderMoney, parseProductPrice } from "@/lib/order-product-search";
import { formatUnitAbbreviation } from "@/lib/product-unit";
import { cn } from "@/lib/utils";

import { OrderProductCatalogDialog } from "./order-product-catalog-dialog";
import { OrderProductSearch } from "./order-product-search";
import {
  conversationPocName,
  formatAiConfidencePct,
  formatOrderCreatedDateTime,
} from "./whatsapp-helpers";

export type DraftOrderSheetVariant = "active" | "blocked";

type EditableLine = {
  key: string;
  productId: number | null;
  productName: string;
  sku: string | null;
  unit: string;
  unitPrice: number;
  quantity: number;
  unmatched: boolean;
};

function statusBadgeLabel(status: string): string {
  switch (status) {
    case "draft":
      return "borrador";
    case "pending":
      return "pendiente";
    case "confirmed":
      return "confirmado";
    default:
      return status.replaceAll("_", " ");
  }
}

function lineSubtotal(line: EditableLine): number {
  return line.unitPrice * line.quantity;
}

function buildEditableLines(
  detail: DashboardOrderDetail,
  catalog: Map<number, DashboardProductRow>,
): EditableLine[] {
  return detail.lines.map((line, index) => {
    const product = line.productId !== null ? catalog.get(line.productId) : undefined;
    const unmatched = line.productId === null;
    return {
      key: unmatched ? `unmatched-${String(index)}` : `product-${String(line.productId)}`,
      productId: line.productId,
      productName: product?.name ?? line.productName,
      sku: product?.sku ?? null,
      unit: product?.unit ?? line.unit,
      unitPrice:
        product !== undefined
          ? parseProductPrice(product.price)
          : (line.unitPrice ?? 0),
      quantity: line.quantity,
      unmatched,
    };
  });
}

function productToLine(product: DashboardProductRow): EditableLine {
  return {
    key: `product-${String(product.productId)}`,
    productId: product.productId,
    productName: product.name,
    sku: product.sku,
    unit: product.unit,
    unitPrice: parseProductPrice(product.price),
    quantity: 1,
    unmatched: false,
  };
}

function DraftOrderSheetContent({
  order,
  conversation,
  onOpenChange,
  variant,
  confirmDisabledTitle,
  onAfterChange,
  onOrderRemoved,
}: Readonly<{
  order: Order;
  conversation: Conversation | null;
  onOpenChange: (open: boolean) => void;
  variant: DraftOrderSheetVariant;
  confirmDisabledTitle?: string;
  onAfterChange?: () => void;
  onOrderRemoved?: (orderId: string) => void;
}>) {
  const blocked = variant === "blocked";
  const editable = !blocked && (order.status === "draft" || order.status === "pending");

  const [localStatus, setLocalStatus] = useState(order.status);
  const [localDisplayCode, setLocalDisplayCode] = useState(order.displayCode ?? null);
  const [loading, setLoading] = useState(editable);
  const [saving, setSaving] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const [detail, setDetail] = useState<DashboardOrderDetail | null>(null);
  const [customer, setCustomer] = useState<DashboardCustomerDetail | null>(null);
  const [products, setProducts] = useState<DashboardProductRow[]>([]);
  const [sellerName, setSellerName] = useState<string>("—");
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(() =>
    defaultDeliveryDateForOrder(order.deliveryDate),
  );
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");

  const pocName = conversation ? conversationPocName(conversation) : "Contacto";
  const confidence = formatAiConfidencePct(order);
  const code = formatOrderDisplayCode(order.orderId, localDisplayCode);
  const showActions = localStatus === "draft" || localStatus === "pending";

  const catalogById = useMemo(
    () => new Map(products.map((p) => [p.productId, p])),
    [products],
  );

  const orderProductIds = useMemo(
    () =>
      new Set(
        lines
          .map((l) => l.productId)
          .filter((id): id is number => id !== null),
      ),
    [lines],
  );

  const orderTotal = useMemo(
    () => lines.filter((l) => !l.unmatched).reduce((sum, l) => sum + lineSubtotal(l), 0),
    [lines],
  );

  const hasUnmatched = lines.some((l) => l.unmatched);
  const canSave =
    editable &&
    !saving &&
    lines.some((l) => !l.unmatched) &&
    !hasUnmatched;

  const loadEditorData = useCallback(async () => {
    if (!editable) return;
    setLoading(true);
    try {
      const [orderDetail, productRows] = await Promise.all([
        fetchDashboardOrderDetailViaProxy(order.orderId),
        fetchProductsViaProxy(),
      ]);
      if (!orderDetail) {
        toast.error("No se pudo cargar el pedido.");
        return;
      }

      const selectable = selectableProducts(productRows);
      const catalog = new Map(selectable.map((p) => [p.productId, p]));
      const nextLines = buildEditableLines(orderDetail, catalog);
      const nextDelivery = defaultDeliveryDateForOrder(orderDetail.deliveryDate);

      const customerDetail = await fetchCustomerDetailViaProxy(orderDetail.customerId);
      let assignedSeller = "Sin vendedor asignado";
      if (customerDetail?.assignedSellerId) {
        const sellers = await fetchSellersViaProxy();
        const match = sellers.find((s) => s.sellerId === customerDetail.assignedSellerId);
        if (match) assignedSeller = match.name;
      }

      setDetail(orderDetail);
      setCustomer(customerDetail);
      setProducts(selectable);
      setLines(nextLines);
      setDeliveryDate(nextDelivery);
      setSellerName(assignedSeller);
      setLocalStatus(orderDetail.status);
      setSavedSnapshot(
        JSON.stringify({
          deliveryDate: nextDelivery,
          lines: nextLines
            .filter((l) => !l.unmatched && l.productId !== null)
            .map((l) => ({ productId: l.productId, quantity: l.quantity })),
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [editable, order.orderId]);

  useEffect(() => {
    void loadEditorData();
  }, [loadEditorData]);

  function addProduct(product: DashboardProductRow) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.productId ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, productToLine(product)];
    });
  }

  function addProductsFromCatalog(selected: DashboardProductRow[]) {
    for (const product of selected) {
      addProduct(product);
    }
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function changeQuantity(productId: number, delta: number) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        const nextQty = Math.max(1, l.quantity + delta);
        return { ...l, quantity: nextQty };
      }),
    );
  }

  async function handleSave() {
    if (!canSave) return;
    const payloadLines = lines
      .filter((l) => l.productId !== null && !l.unmatched)
      .map((l) => ({ productId: l.productId as number, quantity: l.quantity }));

    setSaving(true);
    try {
      const updated = await patchDashboardOrderViaProxy(order.orderId, {
        deliveryDate,
        lines: payloadLines,
      });
      const catalog = new Map(products.map((p) => [p.productId, p]));
      const nextLines = buildEditableLines(updated, catalog);
      setDetail(updated);
      setLines(nextLines);
      setLocalStatus(updated.status);
      setSavedSnapshot(
        JSON.stringify({
          deliveryDate,
          lines: payloadLines,
        }),
      );
      toast.success("Pedido guardado.");
      onAfterChange?.();
    } catch (err) {
      const msg =
        err instanceof DashboardOrderActionError
          ? err.message
          : "No se pudo guardar el pedido.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const customerLabel = customer?.name ?? pocName;
  const locationLabel = formatCustomerAddress(customer);

  return (
    <>
      <SheetHeader className="shrink-0 space-y-2 border-b px-6 py-4 pr-12 text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <SheetTitle className="font-mono text-base">{code}</SheetTitle>
          <div className="flex items-center gap-2">
            {editable ? (
              <button
                className={cn(
                  "text-sm underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50",
                  saving && "opacity-70",
                )}
                disabled={!canSave}
                type="button"
                onClick={() => void handleSave()}
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            ) : null}
            <Badge variant="outline">{statusBadgeLabel(localStatus)}</Badge>
          </div>
        </div>
        <SheetDescription className="text-left">
          {pocName} · {formatOrderCreatedDateTime(order.createdAt)}
        </SheetDescription>
        <MatchCoverageIndicator
          className="text-left"
          lineCount={lines.length || (order.lines?.length ?? 0)}
          matchCoverage={parseMatchCoverage(detail?.matchCoverage ?? order.matchCoverage)}
          isTouchless={Boolean(detail?.isTouchless ?? order.isTouchless)}
          size="md"
        />
        {confidence ? (
          <p className="text-left text-muted-foreground text-xs">{confidence}</p>
        ) : null}
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {loading && editable ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando pedido…
          </div>
        ) : editable ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm">{customerLabel}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delivery-date">Fecha de entrega</Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Ubicación</Label>
                <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm">{locationLabel}</p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Vendedor</Label>
                <Select disabled value="assigned-seller">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sin vendedor asignado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assigned-seller">{sellerName}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Agregar productos</Label>
              <OrderProductSearch
                orderProductIds={orderProductIds}
                products={products}
                onOpenCatalog={() => setCatalogOpen(true)}
                onSelectProduct={addProduct}
              />
            </div>

            {hasUnmatched ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 text-xs dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                Hay productos sin coincidencia en el catálogo. Eliminá esas líneas antes de
                guardar.
              </p>
            ) : null}

            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-[140px] text-center">Cant.</TableHead>
                    <TableHead className="w-[100px] text-right">P. unit.</TableHead>
                    <TableHead className="w-[100px] text-right">Subtotal</TableHead>
                    <TableHead className="w-[44px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow
                      className={cn(line.unmatched && "bg-muted/30")}
                      key={line.key}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{line.productName}</p>
                          {line.sku ? (
                            <p className="text-muted-foreground text-xs">SKU {line.sku}</p>
                          ) : null}
                          {line.unmatched ? (
                            <p className="text-amber-700 text-xs dark:text-amber-300">
                              Sin coincidencia
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {line.unmatched ? (
                          <span className="block text-center tabular-nums">{line.quantity}</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              aria-label="Disminuir cantidad"
                              size="icon-sm"
                              type="button"
                              variant="outline"
                              onClick={() => line.productId && changeQuantity(line.productId, -1)}
                            >
                              <Minus className="size-3.5" />
                            </Button>
                            <span className="min-w-[2ch] text-center tabular-nums text-sm">
                              {line.quantity}
                            </span>
                            <Button
                              aria-label="Aumentar cantidad"
                              size="icon-sm"
                              type="button"
                              variant="outline"
                              onClick={() => line.productId && changeQuantity(line.productId, 1)}
                            >
                              <Plus className="size-3.5" />
                            </Button>
                            <span className="ml-0.5 min-w-[2.5ch] text-muted-foreground text-sm">
                              {formatUnitAbbreviation(line.unit)}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatOrderMoney(line.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {line.unmatched ? "—" : formatOrderMoney(lineSubtotal(line))}
                      </TableCell>
                      <TableCell>
                        <Button
                          aria-label="Eliminar línea"
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                          onClick={() => removeLine(line.key)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell className="py-8 text-center text-muted-foreground text-sm" colSpan={5}>
                        Agregá productos al pedido.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <p className="font-semibold text-sm">
                Valor total:{" "}
                <span className="tabular-nums">{formatOrderMoney(orderTotal)}</span>
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {(order.lines ?? []).map((line, i) => (
              <li
                className="flex flex-wrap items-baseline gap-x-1 text-sm"
                key={`${order.orderId}-${i}`}
              >
                <span className="font-semibold tabular-nums">{line.quantity}</span>
                <span className="text-muted-foreground">{line.unit}</span>
                <span>{line.productName}</span>
              </li>
            ))}
            {!order.lines || order.lines.length === 0 ? (
              <li className="text-muted-foreground text-sm">Sin líneas.</li>
            ) : null}
          </ul>
        )}

        {order.deliveryNotes ? (
          <p className="mt-4 rounded-md border bg-muted/30 px-3 py-2 text-muted-foreground text-xs leading-relaxed">
            <span className="font-medium text-foreground">Nota:</span> {order.deliveryNotes}
          </p>
        ) : null}
      </div>

      {showActions ? (
        <div className="shrink-0 border-t bg-muted/10 px-6 py-4">
          <OrderLifecycleActions
            blocked={blocked}
            blockedTitle={confirmDisabledTitle}
            orderId={order.orderId}
            status={localStatus}
            onDone={() => onOpenChange(false)}
            onRemoved={(id) => {
              onOrderRemoved?.(id);
              onAfterChange?.();
              onOpenChange(false);
            }}
            onStatusChange={(_id, status, patch) => {
              setLocalStatus(status);
              if (patch?.displayCode) setLocalDisplayCode(patch.displayCode);
              onAfterChange?.();
            }}
          />
        </div>
      ) : null}

      <OrderProductCatalogDialog
        open={catalogOpen}
        orderProductIds={orderProductIds}
        products={products}
        onConfirm={addProductsFromCatalog}
        onOpenChange={setCatalogOpen}
      />
    </>
  );
}

export function DraftOrderSheet({
  order,
  conversation,
  open,
  onOpenChange,
  variant,
  confirmDisabledTitle,
  onAfterChange,
  onOrderRemoved,
}: Readonly<{
  order: Order | null;
  conversation: Conversation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: DraftOrderSheetVariant;
  confirmDisabledTitle?: string;
  onAfterChange?: () => void;
  onOrderRemoved?: (orderId: string) => void;
}>) {
  if (!order) return null;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-3xl">
        <DraftOrderSheetContent
          key={order.orderId}
          confirmDisabledTitle={confirmDisabledTitle}
          conversation={conversation}
          order={order}
          variant={variant}
          onAfterChange={onAfterChange}
          onOpenChange={onOpenChange}
          onOrderRemoved={onOrderRemoved}
        />
      </SheetContent>
    </Sheet>
  );
}
