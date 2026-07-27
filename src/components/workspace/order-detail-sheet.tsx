"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MessageCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { OrderDetailSheetSkeleton } from "@/components/workspace/workspace-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import {
  EditableCustomerAddressField,
  EditableCustomerTextField,
} from "@/components/workspace/customer-field-editor";
import { MatchCoverageIndicator, LineMatchIndicator } from "@/components/workspace/match-coverage-indicator";
import { EditableOrderLinesTable } from "@/components/workspace/editable-order-lines-table";
import { OrderBackorderIndicators } from "@/components/workspace/order-backorder-indicators";
import { OrderStockReservationIndicator } from "@/components/workspace/order-stock-reservation-indicator";
import {
  BackorderRiskWarning,
  BackorderWarningIcon,
  backorderRiskLineTooltip,
} from "@/components/workspace/backorder-risk-warning";
import {
  DeliveryDateField,
  useDeliveryDateSelectionState,
} from "@/components/workspace/delivery-date-select";
import { OrderLifecycleActions } from "@/components/workspace/order-lifecycle-actions";
import { OrderProductCatalogDialog } from "@/components/whatsapp/order-product-catalog-dialog";
import { OrderProductSearch } from "@/components/whatsapp/order-product-search";
import {
  buildEditableOrderLines,
  editableLineSubtotal,
  patchPayloadFromLines,
  productToEditableLine,
  type EditableOrderLine,
} from "@/lib/editable-order-lines";
import {
  DashboardOrderActionError,
  deleteDashboardDraftViaProxy,
  markDashboardOrderSeenViaProxy,
  parseDashboardOrderDetail,
  patchDashboardOrderViaProxy,
  rejectDashboardOrderViaProxy,
  updateDashboardOrderStatusViaProxy,
  type DashboardOrderPatch,
} from "@/lib/dashboard-orders";
import { fetchDashboardSettingsViaProxy } from "@/lib/dashboard-settings";
import { formatQty } from "@/lib/inventory-format";
import { fetchProductsViaProxy, selectableProducts, type DashboardProductRow } from "@/lib/dashboard-products";
import { patchDashboardCustomerViaProxy } from "@/lib/dashboard-customers";
import { parseMatchCoverage } from "@/lib/match-coverage";
import { pickDefaultDeliveryDate } from "@/lib/delivery";
import { formatOrderDisplayCode } from "@/lib/order-display-code";
import { statusBadgeVariant, statusLabel, resolveOrderFlowStatusKey } from "@/lib/order-status-flow";
import {
  useSupplierTimeFormatters,
  useWorkspacePermissions,
  useWorkspacePreferences,
} from "@/lib/workspace-preferences-context";
import { formatOrderMoney } from "@/lib/order-product-search";
import {
  lineAvailableStockFromCatalog,
  lineHasBackorderRisk,
  orderHasBackorderRiskFromDetailLines,
  orderHasBackorderRiskFromEditableLines,
} from "@/lib/order-backorder-risk";
import { cn } from "@/lib/utils";

export type OrderDetailSheetProps = Readonly<{
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerNameFallback?: string;
  onConfirmed?: (orderId: string) => void;
  onOrderStatusChange?: (orderId: string, status: string, patch?: DashboardOrderPatch) => void;
  onOrderSeen?: (orderId: string) => void;
  onOrderRemoved?: (orderId: string) => void;
  /** Keeps sheet status in sync when the list row updates (e.g. confirm from table). */
  syncedStatus?: string | null;
  /** Visible table order ids for prev/next navigation. */
  navigationOrderIds?: readonly string[];
  onNavigateOrder?: (orderId: string) => void;
}>;

type OrderDetailLine = Readonly<{
  productId: number | null;
  productName: string;
  quantity: number;
  qtyReserved: number;
  qtyBackordered: number;
  unit: string;
  unitPrice: number | null;
  lineSubtotal: number | null;
  resolvedUnitPrice: number | null;
  resolvedLineSubtotal: number | null;
}>;

type OrderDetail = Readonly<{
  orderId: string;
  displayCode: string | null;
  customerId: number;
  status: string;
  effectiveStatusKey: string;
  createdAt: string | null;
  deliveryDate: string | null;
  confirmedAt: string | null;
  conversationId: string | null;
  currency: string | null;
  subtotal: number | null;
  total: number | null;
  lines: OrderDetailLine[];
  matchCoverage: number | null;
  isTouchless: boolean;
  isBackordered: boolean;
  hasBackorderRisk: boolean;
  hasHeldStockReservation: boolean;
  heldReservedUnits: number;
}>;

type CustomerDetail = Readonly<{
  name: string | null;
  legalName: string | null;
  governmentId: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
}>;

type ProductLookup = Readonly<{
  sku: string | null;
  presentation: string | null;
}>;

function asStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parsePositiveCustomerId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}


function csvField(v: string | number | null): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function effectiveUnitPrice(line: OrderDetailLine): number | null {
  return line.unitPrice ?? line.resolvedUnitPrice ?? null;
}

function lineUnitPriceTotal(line: OrderDetailLine): number | null {
  const unitPrice = effectiveUnitPrice(line);
  if (unitPrice === null) return null;
  return line.quantity * unitPrice;
}

function lineSubtotalValue(line: OrderDetailLine): number | null {
  if (line.lineSubtotal !== null) return line.lineSubtotal;
  if (line.unitPrice === null && line.resolvedLineSubtotal !== null) {
    return line.resolvedLineSubtotal;
  }
  return lineUnitPriceTotal(line);
}

function parseOrderDetail(raw: unknown, fallbackOrderId: string): OrderDetail | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!root) return null;

  const o =
    root.order && typeof root.order === "object" && !Array.isArray(root.order)
      ? (root.order as Record<string, unknown>)
      : root;

  const orderId = asStringOrNull(o.orderId) ?? fallbackOrderId;
  const customerId = parsePositiveCustomerId(o.customerId);
  if (!customerId) return null;

  const status = asStringOrNull(o.status) ?? "draft";
  const linesRaw = Array.isArray(o.lines) ? o.lines : [];
  const lines: OrderDetailLine[] = [];

  for (const item of linesRaw) {
    if (!item || typeof item !== "object") continue;
    const line = item as Record<string, unknown>;
    const productName = asStringOrNull(line.productName) ?? asStringOrNull(line.productNameRaw) ?? "—";
    const quantity = asNumberOrNull(line.quantity);
    if (quantity === null || quantity <= 0) continue;
    const qtyBackordered = Math.max(0, asNumberOrNull(line.qtyBackordered) ?? 0);
    const qtyReservedRaw = asNumberOrNull(line.qtyReserved);
    const qtyReserved =
      qtyReservedRaw !== null ? Math.max(0, qtyReservedRaw) : Math.max(0, quantity - qtyBackordered);
    const unit = asStringOrNull(line.unit) ?? "—";
    lines.push({
      productId: parsePositiveCustomerId(line.productId),
      productName,
      quantity,
      qtyReserved,
      qtyBackordered,
      unit,
      unitPrice: asNumberOrNull(line.unitPrice),
      lineSubtotal: asNumberOrNull(line.lineSubtotal),
      resolvedUnitPrice: asNumberOrNull(line.resolvedUnitPrice),
      resolvedLineSubtotal: asNumberOrNull(line.resolvedLineSubtotal),
    });
  }

  const isBackordered =
    o.isBackordered === true || lines.some((line) => line.qtyBackordered > 0);
  const hasBackorderRisk =
    typeof o.hasBackorderRisk === "boolean" ? o.hasBackorderRisk : isBackordered;
  const hasHeldStockReservation = o.hasHeldStockReservation === true;
  const heldReservedUnits =
    typeof o.heldReservedUnits === "number" && Number.isFinite(o.heldReservedUnits)
      ? Math.max(0, o.heldReservedUnits)
      : 0;

  return {
    orderId,
    displayCode: asStringOrNull(o.displayCode) ?? asStringOrNull(o.display_code),
    customerId,
    status,
    effectiveStatusKey:
      asStringOrNull(o.effectiveStatusKey) ??
      asStringOrNull(o.effective_status_key) ??
      status,
    createdAt: asStringOrNull(o.createdAt),
    deliveryDate: asStringOrNull(o.deliveryDate),
    confirmedAt: asStringOrNull(o.confirmedAt),
    conversationId: asStringOrNull(o.conversationId),
    currency: asStringOrNull(o.currency),
    subtotal: asNumberOrNull(o.subtotal),
    total: asNumberOrNull(o.total),
    lines,
    matchCoverage: parseMatchCoverage(o.matchCoverage),
    isTouchless: o.isTouchless === true,
    isBackordered,
    hasBackorderRisk,
    hasHeldStockReservation,
    heldReservedUnits,
  };
}

function parseCustomerDetail(raw: unknown): CustomerDetail | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!root) return null;
  const c =
    root.customer && typeof root.customer === "object" && !Array.isArray(root.customer)
      ? (root.customer as Record<string, unknown>)
      : null;
  if (!c) return null;

  return {
    name: asStringOrNull(c.name),
    legalName: asStringOrNull(c.legalName),
    governmentId: asStringOrNull(c.governmentId),
    addressLine1: asStringOrNull(c.addressLine1),
    addressLine2: asStringOrNull(c.addressLine2),
    city: asStringOrNull(c.city),
    region: asStringOrNull(c.region),
  };
}

function parseProductsMap(raw: unknown): Map<number, ProductLookup> {
  const map = new Map<number, ProductLookup>();
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const list = root?.products;
  if (!Array.isArray(list)) return map;

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const productId = parsePositiveCustomerId(p.productId);
    if (!productId) continue;
    map.set(productId, {
      sku: asStringOrNull(p.sku),
      presentation: asStringOrNull(p.presentation),
    });
  }
  return map;
}

function DetailRow({
  label,
  children,
  className,
}: Readonly<{ label: string; children: ReactNode; className?: string }>) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-foreground text-sm">{children}</dd>
    </div>
  );
}

export function OrderDetailSheet({
  orderId,
  open,
  onOpenChange,
  customerNameFallback,
  onConfirmed,
  onOrderStatusChange,
  onOrderSeen,
  onOrderRemoved,
  syncedStatus,
  navigationOrderIds = [],
  onNavigateOrder,
}: OrderDetailSheetProps) {
  const { autoCommitEnabled } = useWorkspacePreferences();
  const { can } = useWorkspacePermissions();
  const canOverrideBand = can("pricing.override_band");
  const { formatInstantDate, formatInstantDateTime, formatStoredDateOnly } =
    useSupplierTimeFormatters();
  const productsCatalogRef = useRef<Map<number, ProductLookup> | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [productsByPid, setProductsByPid] = useState<Map<number, ProductLookup>>(new Map());
  const [reloadToken, setReloadToken] = useState(0);
  const [editLines, setEditLines] = useState<EditableOrderLine[]>([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [storedDeliveryDate, setStoredDeliveryDate] = useState<string | null>(null);
  const [productRows, setProductRows] = useState<DashboardProductRow[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [pricingEngineEnabled, setPricingEngineEnabled] = useState(false);

  const navIndex =
    orderId && navigationOrderIds.length > 0
      ? navigationOrderIds.indexOf(orderId)
      : -1;
  const canGoPrev = navIndex > 0;
  const canGoNext = navIndex >= 0 && navIndex < navigationOrderIds.length - 1;

  const isEditable =
    order?.status === "draft" || order?.status === "pending";

  const orderProductIds = useMemo(
    () =>
      new Set(
        editLines.map((l) => l.productId).filter((id): id is number => id !== null),
      ),
    [editLines],
  );

  const hasUnmatched = editLines.some((l) => l.unmatched);
  const {
    dates: availableDeliveryDates,
    loading: deliveryDatesLoading,
    error: deliveryDatesError,
    defaultDate: defaultDeliveryDate,
    isValid: isDeliveryDateValid,
  } = useDeliveryDateSelectionState(order?.customerId ?? null, storedDeliveryDate);
  const deliveryDateValid = isDeliveryDateValid(deliveryDate);
  const editOrderTotal = useMemo(
    () => editLines.filter((l) => !l.unmatched).reduce((sum, l) => sum + editableLineSubtotal(l), 0),
    [editLines],
  );
  const canSave =
    isEditable &&
    !saving &&
    editLines.some((l) => !l.unmatched) &&
    !hasUnmatched &&
    deliveryDateValid;

  const productCatalogById = useMemo(
    () => new Map(productRows.map((product) => [product.productId, product])),
    [productRows],
  );

  const hasBackorderRisk = useMemo(() => {
    if (isEditable) {
      return orderHasBackorderRiskFromEditableLines(editLines);
    }
    if (!order) return false;
    if (order.hasBackorderRisk) return true;
    return orderHasBackorderRiskFromDetailLines(order.lines, productCatalogById);
  }, [editLines, isEditable, order, productCatalogById]);

  const isBackordered = order?.isBackordered ?? order?.lines.some((l) => l.qtyBackordered > 0) ?? false;

  const flowStatus = order ? resolveOrderFlowStatusKey(order) : null;
  const canMarkDelivered =
    flowStatus === "confirmed" ||
    flowStatus === "in_progress" ||
    flowStatus === "in_route";
  const canRejectOrder =
    flowStatus === "draft" ||
    flowStatus === "pending" ||
    flowStatus === "confirmed" ||
    flowStatus === "in_progress" ||
    flowStatus === "in_route";

  const saveCustomerField = useCallback(
    async (patch: Parameters<typeof patchDashboardCustomerViaProxy>[1]) => {
      if (!order) return;
      const updated = await patchDashboardCustomerViaProxy(order.customerId, patch);
      if (updated) {
        setCustomer({
          name: updated.name,
          legalName: updated.legalName,
          governmentId: updated.governmentId,
          addressLine1: updated.addressLine1,
          addressLine2: updated.addressLine2,
          city: updated.city,
          region: updated.region,
        });
        toast.success("Cliente actualizado.");
      }
    },
    [order],
  );

  const handleRejectOrder = useCallback(async () => {
    if (!order || !canRejectOrder || rejecting) return;
    setRejecting(true);
    try {
      if (order.status === "draft") {
        await deleteDashboardDraftViaProxy(order.orderId);
        toast.success("Borrador rechazado");
        onOrderRemoved?.(order.orderId);
        onOpenChange(false);
      } else {
        await rejectDashboardOrderViaProxy(order.orderId);
        toast.success("Pedido rechazado");
        setOrder((prev) =>
          prev ? { ...prev, status: "cancelled", effectiveStatusKey: "cancelled", hasHeldStockReservation: false, heldReservedUnits: 0 } : prev,
        );
        onOrderStatusChange?.(order.orderId, "cancelled");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo rechazar el pedido.");
    } finally {
      setRejecting(false);
    }
  }, [canRejectOrder, onOpenChange, onOrderRemoved, onOrderStatusChange, order, rejecting]);

  const handleMarkDelivered = useCallback(async () => {
    if (!order || !canMarkDelivered || markingDelivered) return;
    setMarkingDelivered(true);
    try {
      const updated = await updateDashboardOrderStatusViaProxy(order.orderId, "delivered");
      const nextKey = updated?.effectiveStatusKey ?? "delivered";
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: "delivered",
              effectiveStatusKey: nextKey,
              hasHeldStockReservation: false,
              heldReservedUnits: 0,
            }
          : prev,
      );
      onOrderStatusChange?.(order.orderId, nextKey);
      toast.success("Pedido marcado como entregado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo marcar el pedido como entregado.");
    } finally {
      setMarkingDelivered(false);
    }
  }, [canMarkDelivered, markingDelivered, onOrderStatusChange, order]);

  const loadOrder = useCallback(async (id: string, signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    setOrder(null);
    setCustomer(null);

    try {
      const orderRes = await fetch(`/api/backend/dashboard/orders/${encodeURIComponent(id)}`, {
        credentials: "same-origin",
        cache: "no-store",
        signal,
      });
      const orderBody = (await orderRes.json().catch(() => ({}))) as Record<string, unknown>;

      if (!orderRes.ok) {
        const msg =
          typeof orderBody.error === "string" && orderBody.error.trim()
            ? orderBody.error.trim()
            : `No se pudo cargar el pedido (HTTP ${String(orderRes.status)}).`;
        throw new Error(msg);
      }

      const parsedOrder = parseOrderDetail(orderBody, id);
      if (!parsedOrder) {
        throw new Error("Respuesta de pedido inválida.");
      }

      if (signal.aborted) return;
      setOrder(parsedOrder);

      const editable =
        parsedOrder.status === "draft" || parsedOrder.status === "pending";

      if (parsedOrder.status === "draft") {
        onOrderSeen?.(parsedOrder.orderId);
        void markDashboardOrderSeenViaProxy(parsedOrder.orderId).catch(() => {
          /* best-effort */
        });
      }

      let catalog = productsCatalogRef.current;
      try {
        const [productRowsFetched, settings] = await Promise.all([
          fetchProductsViaProxy(),
          fetchDashboardSettingsViaProxy(),
        ]);
        if (!signal.aborted) {
          setPricingEngineEnabled(settings?.pricing.engineEnabled ?? false);
          const selectable = selectableProducts(productRowsFetched);
          setProductRows(selectable);
          if (editable) {
            const catalogById = new Map(selectable.map((p) => [p.productId, p]));
            const detail = parseDashboardOrderDetail(orderBody, id);
            if (detail) {
              setEditLines(buildEditableOrderLines(detail, catalogById));
              setStoredDeliveryDate(detail.deliveryDate);
              setDeliveryDate(detail.deliveryDate?.trim() ?? "");
            }
          }
          catalog = new Map(
            productRowsFetched.map((p) => [
              p.productId,
              { sku: p.sku, presentation: p.presentation },
            ]),
          );
          productsCatalogRef.current = catalog;
        }
      } catch {
        if (!catalog) {
          try {
            const productsRes = await fetch("/api/backend/dashboard/products", {
              credentials: "same-origin",
              cache: "no-store",
              signal,
            });
            const productsBody = (await productsRes.json().catch(() => ({}))) as unknown;
            if (productsRes.ok && !signal.aborted) {
              catalog = parseProductsMap(productsBody);
              productsCatalogRef.current = catalog;
            }
          } catch {
            /* best-effort */
          }
        }
      }

      if (!signal.aborted) {
        setProductsByPid(catalog ?? new Map());
      }

      try {
        const customerRes = await fetch(
          `/api/backend/dashboard/customers/${encodeURIComponent(String(parsedOrder.customerId))}`,
          { credentials: "same-origin", cache: "no-store", signal },
        );
        const customerBody = (await customerRes.json().catch(() => ({}))) as unknown;
        if (customerRes.ok && !signal.aborted) {
          setCustomer(parseCustomerDetail(customerBody));
        }
      } catch {
        /* best-effort */
      }
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof Error ? err.message : "No se pudo cargar el pedido.");
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [onOrderSeen]);

  useEffect(() => {
    if (!open || !orderId) return undefined;

    const controller = new AbortController();
    void loadOrder(orderId, controller.signal);

    return () => {
      controller.abort();
    };
  }, [open, orderId, loadOrder, reloadToken]);

  useEffect(() => {
    if (!open || !order || !syncedStatus || order.status === syncedStatus) return;
    setOrder((prev) => (prev ? { ...prev, status: syncedStatus } : prev));
  }, [open, order, syncedStatus]);

  useEffect(() => {
    if (deliveryDatesLoading || availableDeliveryDates.length === 0) return;
    if (!deliveryDate || !deliveryDateValid) {
      setDeliveryDate(
        pickDefaultDeliveryDate(storedDeliveryDate, availableDeliveryDates),
      );
    }
  }, [
    availableDeliveryDates,
    deliveryDate,
    deliveryDateValid,
    deliveryDatesLoading,
    storedDeliveryDate,
  ]);

  useEffect(() => {
    if (open) return;
    setLoading(false);
    setError(null);
    setOrder(null);
    setCustomer(null);
    setProductsByPid(new Map());
    setEditLines([]);
    setDeliveryDate("");
    setStoredDeliveryDate(null);
    setProductRows([]);
    setCatalogOpen(false);
    setSaving(false);
  }, [open]);

  const displayStatus = order ? resolveOrderFlowStatusKey(order) : "draft";
  const statusText = statusLabel(undefined, displayStatus);

  const customerDisplayName =
    customer?.name ??
    customer?.legalName ??
    customerNameFallback ??
    (order ? `Cliente #${order.customerId}` : "—");

  const formatMoney = useCallback(
    (value: number | null): string => {
      if (value === null) return "—";
      try {
        return new Intl.NumberFormat("es-CR", {
          style: "currency",
          currency: order?.currency ?? "CRC",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
      } catch {
        return value.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    },
    [order?.currency],
  );

  const computedSubtotal = (() => {
    if (!order) return null;
    if (order.subtotal !== null) return order.subtotal;
    let sum = 0;
    let hasLine = false;
    for (const line of order.lines) {
      const sub = lineSubtotalValue(line);
      if (sub !== null) {
        sum += sub;
        hasLine = true;
      }
    }
    return hasLine ? sum : null;
  })();

  const computedTotal = order?.total ?? computedSubtotal;

  const handleExport = useCallback(() => {
    if (!order || order.lines.length === 0) return;

    const header = [
      "order_id",
      "sku",
      "product",
      "presentation",
      "unit",
      "quantity",
      "unit_price",
      "line_subtotal",
    ];
    const rows = order.lines.map((line) => {
      const product = line.productId !== null ? productsByPid.get(line.productId) : undefined;
      const sub = lineSubtotalValue(line);
      return [
        csvField(order.orderId),
        csvField(product?.sku ?? ""),
        csvField(line.productName),
        csvField(product?.presentation ?? ""),
        csvField(line.unit),
        csvField(line.quantity),
        csvField(effectiveUnitPrice(line)),
        csvField(sub),
      ].join(",");
    });

    const csv = `\uFEFF${[header.join(","), ...rows].join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedido_${order.orderId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [order, productsByPid]);

  const exportDisabled = loading || !order || order.lines.length === 0;
  const chatDisabled = loading || !order?.conversationId;

  function addProduct(product: DashboardProductRow) {
    setEditLines((prev) => {
      const existing = prev.find((l) => l.productId === product.productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.productId ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, productToEditableLine(product)];
    });
  }

  function removeLine(key: string) {
    setEditLines((prev) => prev.filter((l) => l.key !== key));
  }

  function changeQuantity(productId: number, delta: number) {
    setEditLines((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        return { ...l, quantity: Math.max(1, l.quantity + delta) };
      }),
    );
  }

  function changeUnitPrice(productId: number, unitPrice: number) {
    setEditLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, unitPrice } : l)),
    );
  }

  const applySavedOrder = useCallback(
    (detail: ReturnType<typeof parseDashboardOrderDetail>) => {
      if (!detail) return;
      const catalogById = new Map(productRows.map((p) => [p.productId, p]));
      setEditLines(buildEditableOrderLines(detail, catalogById));
      setOrder({
        orderId: detail.orderId,
        displayCode: detail.displayCode,
        customerId: detail.customerId,
        status: detail.status,
        effectiveStatusKey: detail.effectiveStatusKey,
        createdAt: detail.createdAt,
        deliveryDate: detail.deliveryDate,
        confirmedAt: order?.confirmedAt ?? null,
        conversationId: order?.conversationId ?? null,
        currency: order?.currency ?? null,
        subtotal: detail.subtotal,
        total: detail.total,
        lines: detail.lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          quantity: l.quantity,
          qtyReserved: l.qtyReserved,
          qtyBackordered: l.qtyBackordered,
          unit: l.unit,
          unitPrice: l.unitPrice,
          lineSubtotal: l.lineSubtotal,
          resolvedUnitPrice: l.resolvedUnitPrice,
          resolvedLineSubtotal: l.resolvedLineSubtotal,
        })),
        matchCoverage: detail.matchCoverage,
        isTouchless: detail.isTouchless,
        isBackordered: detail.isBackordered,
        hasBackorderRisk: detail.hasBackorderRisk,
        hasHeldStockReservation: detail.hasHeldStockReservation,
        heldReservedUnits: detail.heldReservedUnits,
      });
    },
    [order?.confirmedAt, order?.conversationId, order?.currency, productRows],
  );

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!order || !canSave) {
      if (!deliveryDateValid) {
        toast.error("Seleccioná una fecha de entrega válida (hoy o posterior).");
      }
      return false;
    }
    setSaving(true);
    try {
      const updated = await patchDashboardOrderViaProxy(order.orderId, {
        deliveryDate,
        lines: patchPayloadFromLines(editLines),
      });
      applySavedOrder(updated);
      toast.success("Pedido guardado.");
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
  }, [applySavedOrder, canSave, deliveryDate, deliveryDateValid, editLines, order]);

  const persistBeforeLifecycle = useCallback(async (): Promise<boolean> => {
    if (!order || !isEditable) return deliveryDateValid;
    return handleSave();
  }, [deliveryDateValid, handleSave, isEditable, order]);

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-3xl">
        <SheetHeader className="shrink-0 space-y-3 border-b px-6 py-4 pr-9">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                aria-label="Pedido anterior"
                disabled={!canGoPrev || loading}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => {
                  if (canGoPrev && onNavigateOrder) {
                    onNavigateOrder(navigationOrderIds[navIndex - 1]!);
                  }
                }}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                aria-label="Pedido siguiente"
                disabled={!canGoNext || loading}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => {
                  if (canGoNext && onNavigateOrder) {
                    onNavigateOrder(navigationOrderIds[navIndex + 1]!);
                  }
                }}
              >
                <ChevronRight className="size-4" />
              </Button>
              {navigationOrderIds.length > 1 && navIndex >= 0 ? (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {navIndex + 1} / {navigationOrderIds.length}
                </span>
              ) : null}
            </div>
            {order && canRejectOrder ? (
              <Button
                className="gap-1.5"
                disabled={rejecting || loading}
                size="sm"
                type="button"
                variant="destructive"
                onClick={() => void handleRejectOrder()}
              >
                {rejecting ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  <XCircle aria-hidden className="size-4" />
                )}
                Rechazar pedido
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <SheetTitle className="text-left text-lg">
                Pedido{" "}
                {orderId
                  ? formatOrderDisplayCode(orderId, order?.displayCode)
                  : "—"}
              </SheetTitle>
              <SheetDescription className="text-left">{customerDisplayName}</SheetDescription>
              {order ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="w-fit" variant={statusBadgeVariant(displayStatus)}>
                    {statusText}
                  </Badge>
                  <OrderBackorderIndicators
                    hasBackorderRisk={hasBackorderRisk}
                    isBackordered={isBackordered}
                  />
                  <OrderStockReservationIndicator
                    hasHeldStockReservation={order.hasHeldStockReservation}
                    heldReservedUnits={order.heldReservedUnits}
                  />
                  <MatchCoverageIndicator
                    autoCommitEnabled={autoCommitEnabled}
                    isTouchless={order.isTouchless}
                    lineCount={order.lines.length}
                    matchCoverage={order.matchCoverage}
                    size="md"
                  />
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {isEditable ? (
                <button
                  className="text-sm underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canSave || saving}
                  type="button"
                  onClick={() => void handleSave()}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              ) : null}
              <Button
                className="gap-1.5"
                disabled={exportDisabled}
                size="sm"
                type="button"
                variant="outline"
                onClick={handleExport}
              >
                <Download aria-hidden className="size-4" />
                Exportar
              </Button>
              {order?.conversationId ? (
                <Button asChild className="gap-1.5" size="sm" type="button" variant="secondary">
                  <Link href="/whatsapp">
                    <MessageCircle aria-hidden className="size-4" />
                    Ir al chat
                  </Link>
                </Button>
              ) : (
                <Button className="gap-1.5" disabled={chatDisabled} size="sm" type="button" variant="secondary">
                  <MessageCircle aria-hidden className="size-4" />
                  Ir al chat
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? <OrderDetailSheetSkeleton /> : null}

          {!loading && error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <AlertCircle aria-hidden className="size-10 text-destructive" />
              <p className="max-w-sm text-destructive text-sm">{error}</p>
              {orderId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReloadToken((t) => t + 1)}
                >
                  Reintentar
                </Button>
              ) : null}
            </div>
          ) : null}

          {!loading && !error && order ? (
            <div className="space-y-6">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <DetailRow label="Código del pedido">
                  <span className="font-mono">
                    {formatOrderDisplayCode(order.orderId, order.displayCode)}
                  </span>
                </DetailRow>
                <DetailRow label="Fecha de creación (hora)">
                  {formatInstantDateTime(order.createdAt)}
                </DetailRow>
                <DetailRow label="Fecha de creación">{formatInstantDate(order.createdAt)}</DetailRow>
                <DetailRow label="Fecha de entrega">
                  {isEditable ? (
                    <DeliveryDateField
                      className="max-w-xs"
                      dates={availableDeliveryDates}
                      error={deliveryDatesError}
                      id="order-detail-delivery-date"
                      label=""
                      loading={deliveryDatesLoading}
                      preservedDate={storedDeliveryDate}
                      showLabel={false}
                      value={deliveryDate}
                      onChange={setDeliveryDate}
                    />
                  ) : (
                    formatStoredDateOnly(order.deliveryDate)
                  )}
                </DetailRow>
                <DetailRow label="Razón social">
                  <EditableCustomerTextField
                    fallbackDisplay={customer?.name ?? null}
                    placeholder="Razón social"
                    value={customer?.legalName ?? null}
                    onSave={async (next) => saveCustomerField({ legalName: next })}
                  />
                </DetailRow>
                <DetailRow label="Identificación">
                  <EditableCustomerTextField
                    placeholder="Identificación"
                    value={customer?.governmentId ?? null}
                    onSave={async (next) => saveCustomerField({ governmentId: next })}
                  />
                </DetailRow>
                <DetailRow className="sm:col-span-2" label="Dirección de entrega">
                  <EditableCustomerAddressField
                    addressLine1={customer?.addressLine1 ?? null}
                    city={customer?.city ?? null}
                    region={customer?.region ?? null}
                    onSave={async (patch) =>
                      saveCustomerField({
                        addressLine1: patch.addressLine1,
                        city: patch.city,
                        region: patch.region,
                      })
                    }
                  />
                </DetailRow>
              </dl>

              <Separator />

              {isEditable ? (
                <div className="space-y-4">
                  {hasBackorderRisk ? (
                    <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 text-xs dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                      <BackorderWarningIcon className="mt-0.5" />
                      <span>
                        Al confirmar, las cantidades que superen el stock disponible quedarán como
                        Pendiente (backorder).
                      </span>
                    </p>
                  ) : null}
                  {hasUnmatched ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 text-xs dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                      Hay productos sin coincidencia en el catálogo. Eliminá esas líneas antes de
                      guardar.
                    </p>
                  ) : null}
                  <div className="space-y-2">
                    <Label>Agregar productos</Label>
                    <OrderProductSearch
                      orderProductIds={orderProductIds}
                      products={productRows}
                      onOpenCatalog={() => setCatalogOpen(true)}
                      onSelectProduct={addProduct}
                    />
                  </div>
                  <EditableOrderLinesTable
                    canOverrideBand={canOverrideBand}
                    lines={editLines}
                    pricingEngineEnabled={pricingEngineEnabled}
                    onChangeQuantity={changeQuantity}
                    onChangeUnitPrice={changeUnitPrice}
                    onRemoveLine={removeLine}
                  />
                  <div className="flex justify-end">
                    <p className="font-semibold text-sm">
                      Valor total:{" "}
                      <span className="tabular-nums">{formatOrderMoney(editOrderTotal)}</span>
                    </p>
                  </div>
                </div>
              ) : (
              <div className="rounded-lg border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Presentación</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio unitario</TableHead>
                      <TableHead className="text-right">Precio total</TableHead>
                      <TableHead className="text-right">Subtotal de línea</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.lines.length === 0 ? (
                      <TableRow>
                        <TableCell
                          className="h-24 text-center text-muted-foreground text-sm"
                          colSpan={9}
                        >
                          Este pedido todavía no tiene líneas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      order.lines.map((line, index) => {
                        const product =
                          line.productId !== null ? productsByPid.get(line.productId) : undefined;
                        const availableStock = lineAvailableStockFromCatalog(
                          line.productId,
                          productCatalogById,
                        );
                        const atRisk = lineHasBackorderRisk({
                          quantity: line.quantity,
                          availableStock,
                          qtyBackordered: line.qtyBackordered,
                        });
                        return (
                          <TableRow key={`${line.productName}-${index}`}>
                            <TableCell className="font-mono text-xs">
                              {product?.sku ?? "—"}
                            </TableCell>
                            <TableCell>{line.productName}</TableCell>
                            <TableCell>{line.unit}</TableCell>
                            <TableCell>{product?.presentation ?? "—"}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {availableStock === null ? "—" : formatQty(availableStock)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              <div className="flex items-center justify-end gap-1.5">
                                {atRisk && availableStock !== null ? (
                                  <BackorderRiskWarning
                                    tooltip={backorderRiskLineTooltip({
                                      quantity: line.quantity,
                                      available: availableStock,
                                    })}
                                  />
                                ) : null}
                                {order.matchCoverage != null ? (
                                  <LineMatchIndicator
                                    matched={line.productId != null}
                                    quantity={line.quantity}
                                  />
                                ) : (
                                  <span>{line.quantity.toLocaleString("es")}</span>
                                )}
                              </div>
                              {line.qtyBackordered > 0 ? (
                                <p className="mt-1 text-left text-amber-800 text-xs dark:text-amber-300">
                                  Pedido {line.quantity.toLocaleString("es")} · Reservado{" "}
                                  {line.qtyReserved.toLocaleString("es")} · Pendiente{" "}
                                  {line.qtyBackordered.toLocaleString("es")}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(effectiveUnitPrice(line))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(lineUnitPriceTotal(line))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(lineSubtotalValue(line))}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              )}

              {!isEditable ? (
              <div className="ml-auto max-w-xs space-y-2 text-right text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">{formatMoney(computedSubtotal)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t pt-2">
                  <span className="font-medium">Total</span>
                  <span className="font-semibold tabular-nums">{formatMoney(computedTotal)}</span>
                </div>
              </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="sticky bottom-0 flex shrink-0 flex-col gap-3 border-t bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            {order?.hasHeldStockReservation ? (
              <>
                Stock reservado en bodega
                {order.heldReservedUnits > 0
                  ? ` (${formatQty(order.heldReservedUnits)} uds.). `
                  : ". "}
                Marcá entregado o cancelá para liberar el inventario.
              </>
            ) : order?.confirmedAt ? (
              `Confirmado el ${formatInstantDateTime(order.confirmedAt)}`
            ) : displayStatus === "pending" ? (
              "En Revisión (pendiente de confirmación)."
            ) : displayStatus === "draft" ? (
              "Borrador extraído por el AI."
            ) : (
              `Estado actual: ${statusText}.`
            )}
          </p>
          {order && (order.status === "draft" || order.status === "pending") ? (
            <OrderLifecycleActions
              deliveryDateValid={deliveryDateValid}
              hasBackorderRisk={hasBackorderRisk}
              layout="inline"
              orderId={order.orderId}
              showEditLink={false}
              status={order.status}
              onBeforeAction={persistBeforeLifecycle}
              onRemoved={(id) => {
                onOrderRemoved?.(id);
                onOpenChange(false);
              }}
              onStatusChange={(id, status, patch) => {
                setOrder((prev) =>
                  prev
                    ? {
                        ...prev,
                        status,
                        effectiveStatusKey: status,
                        displayCode: patch?.displayCode ?? prev.displayCode,
                      }
                    : prev,
                );
                onOrderStatusChange?.(id, status, patch);
                if (status === "confirmed") onConfirmed?.(id);
              }}
            />
          ) : null}
          {order && canMarkDelivered ? (
            <Button
              disabled={markingDelivered || loading}
              size="sm"
              type="button"
              onClick={() => void handleMarkDelivered()}
            >
              {markingDelivered ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : null}
              Marcar entregado
            </Button>
          ) : null}
        </footer>
        {order && isEditable ? (
          <OrderProductCatalogDialog
            onConfirm={(selected) => {
              for (const product of selected) addProduct(product);
            }}
            onOpenChange={setCatalogOpen}
            open={catalogOpen}
            orderProductIds={orderProductIds}
            products={productRows}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
