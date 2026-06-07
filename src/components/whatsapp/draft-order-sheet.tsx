"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { EditableOrderLinesTable } from "@/components/workspace/editable-order-lines-table";
import { OrderBackorderIndicators } from "@/components/workspace/order-backorder-indicators";
import { BackorderWarningIcon } from "@/components/workspace/backorder-risk-warning";
import { MatchCoverageIndicator } from "@/components/workspace/match-coverage-indicator";
import { DeliveryDateField, useDeliveryDateSelectionState } from "@/components/workspace/delivery-date-select";
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
import {
  buildEditableOrderLines,
  editableLineSubtotal,
  patchPayloadFromLines,
  productToEditableLine,
  type EditableOrderLine,
} from "@/lib/editable-order-lines";
import type { Conversation, Order } from "@/lib/dashboard-types";
import { orderHasBackorderRiskFromEditableLines } from "@/lib/order-backorder-risk";
import { parseMatchCoverage } from "@/lib/match-coverage";
import { pickDefaultDeliveryDate } from "@/lib/delivery";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import { formatOrderMoney } from "@/lib/order-product-search";
import {
  useSupplierTimeFormatters,
  useWorkspacePreferences,
} from "@/lib/workspace-preferences-context";
import { cn } from "@/lib/utils";

import { OrderProductCatalogDialog } from "./order-product-catalog-dialog";
import { OrderProductSearch } from "./order-product-search";
import {
  conversationPocName,
  formatAiConfidencePct,
} from "./whatsapp-helpers";

export type DraftOrderSheetVariant = "active" | "blocked";

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
  const { autoCommitEnabled } = useWorkspacePreferences();
  const { formatInstantDateTime } = useSupplierTimeFormatters();

  const [localStatus, setLocalStatus] = useState(order.status);
  const [localDisplayCode, setLocalDisplayCode] = useState(order.displayCode ?? null);
  const [loading, setLoading] = useState(editable);
  const [saving, setSaving] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const [detail, setDetail] = useState<DashboardOrderDetail | null>(null);
  const [customer, setCustomer] = useState<DashboardCustomerDetail | null>(null);
  const [products, setProducts] = useState<DashboardProductRow[]>([]);
  const [sellerName, setSellerName] = useState<string>("—");
  const [lines, setLines] = useState<EditableOrderLine[]>([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [storedDeliveryDate, setStoredDeliveryDate] = useState<string | null>(null);
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
    () => lines.filter((l) => !l.unmatched).reduce((sum, l) => sum + editableLineSubtotal(l), 0),
    [lines],
  );

  const hasBackorderRisk = useMemo(
    () => orderHasBackorderRiskFromEditableLines(lines),
    [lines],
  );
  const isBackordered = detail?.isBackordered ?? detail?.lines.some((l) => l.qtyBackordered > 0) ?? false;

  const hasUnmatched = lines.some((l) => l.unmatched);
  const customerIdForDates = detail?.customerId ?? order.customerId ?? null;
  const {
    dates: availableDeliveryDates,
    loading: deliveryDatesLoading,
    error: deliveryDatesError,
    isValid: isDeliveryDateValid,
  } = useDeliveryDateSelectionState(customerIdForDates, storedDeliveryDate);
  const deliveryDateValid = isDeliveryDateValid(deliveryDate);
  const canSave =
    editable &&
    !saving &&
    lines.some((l) => !l.unmatched) &&
    !hasUnmatched &&
    deliveryDateValid;

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
      const nextLines = buildEditableOrderLines(orderDetail, catalog);
      const nextDelivery = orderDetail.deliveryDate?.trim() ?? "";

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
      setStoredDeliveryDate(orderDetail.deliveryDate);
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
    if (!editable || availableDeliveryDates.length === 0) return;
    if (!deliveryDate || !deliveryDateValid) {
      setDeliveryDate(
        pickDefaultDeliveryDate(storedDeliveryDate, availableDeliveryDates),
      );
    }
  }, [
    availableDeliveryDates,
    deliveryDate,
    deliveryDateValid,
    editable,
    storedDeliveryDate,
  ]);

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
      return [...prev, productToEditableLine(product)];
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

  async function handleSave(): Promise<boolean> {
    if (!canSave) {
      if (!deliveryDateValid) {
        toast.error("Seleccioná una fecha de entrega disponible según la logística configurada.");
      }
      return false;
    }
    const payloadLines = patchPayloadFromLines(lines);

    setSaving(true);
    try {
      const updated = await patchDashboardOrderViaProxy(order.orderId, {
        deliveryDate,
        lines: payloadLines,
      });
      const catalog = new Map(products.map((p) => [p.productId, p]));
      const nextLines = buildEditableOrderLines(updated, catalog);
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
      return true;
    } catch (err) {
      const msg =
        err instanceof DashboardOrderActionError
          ? err.message
          : "No se pudo guardar el pedido.";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  }

  const persistBeforeLifecycle = useCallback(async (): Promise<boolean> => {
    const payloadLines = patchPayloadFromLines(lines);
    const currentSnapshot = JSON.stringify({ deliveryDate, lines: payloadLines });
    if (currentSnapshot === savedSnapshot) return true;
    return handleSave();
  }, [deliveryDate, lines, savedSnapshot]);

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
            <OrderBackorderIndicators
              hasBackorderRisk={hasBackorderRisk}
              isBackordered={isBackordered}
            />
          </div>
        </div>
        <SheetDescription className="text-left">
          {pocName} · {formatInstantDateTime(order.createdAt)}
        </SheetDescription>
        <MatchCoverageIndicator
          autoCommitEnabled={autoCommitEnabled}
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
              <DeliveryDateField
                dates={availableDeliveryDates}
                error={deliveryDatesError}
                id="delivery-date"
                loading={deliveryDatesLoading}
                preservedDate={storedDeliveryDate}
                value={deliveryDate}
                onChange={setDeliveryDate}
              />
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

            {hasBackorderRisk ? (
              <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 text-xs dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                <BackorderWarningIcon className="mt-0.5" />
                <span>
                  Al confirmar, las cantidades que superen el stock disponible quedarán como Pendiente
                  (backorder).
                </span>
              </p>
            ) : null}

            {hasUnmatched ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 text-xs dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                Hay productos sin coincidencia en el catálogo. Eliminá esas líneas antes de
                guardar.
              </p>
            ) : null}

            <EditableOrderLinesTable
              lines={lines}
              onChangeQuantity={changeQuantity}
              onRemoveLine={removeLine}
            />

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
            deliveryDateValid={deliveryDateValid}
            hasBackorderRisk={hasBackorderRisk}
            orderId={order.orderId}
            status={localStatus}
            onBeforeAction={persistBeforeLifecycle}
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
