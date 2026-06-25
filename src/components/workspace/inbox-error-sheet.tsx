"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AlertCircle, ExternalLink, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  RECLAMO_STATUS_LABELS,
  RECLAMO_TYPE_OPTIONS,
  fetchInboxErrorOrderLinesViaProxy,
  fetchInboxErrorViaProxy,
  fetchSellerOptionsViaProxy,
  updateInboxErrorViaProxy,
  type InboxErrorDetail,
  type InboxErrorInvolvedProduct,
  type InboxSellerOption,
  type ReclamoStatus,
  type ReclamoType,
  type UpdateInboxErrorPayload,
} from "@/lib/dashboard-inbox";
import { formatInstantDateTimeInTimezone } from "@/lib/supplier-timezone";
import { useWorkspacePreferences } from "@/lib/workspace-preferences-context";

const NONE_VALUE = "__none";

function formatErrorWhen(iso: string | null, timeZone: string): string {
  const formatted = formatInstantDateTimeInTimezone(iso, timeZone, "es-CR");
  return formatted === "—" ? "Unknown" : formatted;
}

function nextStatusOptions(current: ReclamoStatus): ReclamoStatus[] {
  switch (current) {
    case "open":
      return ["open", "in_progress", "resolved"];
    case "in_progress":
      return ["in_progress", "open", "resolved"];
    case "resolved":
      return ["resolved", "reopened"];
    case "reopened":
      return ["reopened", "in_progress", "resolved"];
    default:
      return ["open"];
  }
}

function productKey(product: InboxErrorInvolvedProduct): string {
  return product.productId != null ? `pid:${product.productId}` : `name:${product.name}:${product.sku}`;
}

export function InboxErrorSheet({
  errorId,
  open,
  onOpenChange,
  onResolved,
  onUpdated,
  onOpenOrder,
}: Readonly<{
  errorId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved: (errorId: string) => void;
  onUpdated?: (detail: InboxErrorDetail) => void;
  onOpenOrder?: (orderId: string) => void;
}>) {
  const { timeZone } = useWorkspacePreferences();
  const [detail, setDetail] = useState<InboxErrorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sellers, setSellers] = useState<InboxSellerOption[]>([]);
  const [orderLines, setOrderLines] = useState<InboxErrorInvolvedProduct[]>([]);

  useEffect(() => {
    if (!open || !errorId) {
      setDetail(null);
      setOrderLines([]);
      return;
    }
    let active = true;
    setLoading(true);
    void Promise.all([fetchInboxErrorViaProxy(errorId), fetchSellerOptionsViaProxy()])
      .then(([next, sellerList]) => {
        if (!active) return;
        setDetail(next);
        setSellers(sellerList);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [errorId, open]);

  useEffect(() => {
    if (!open || !errorId || !detail?.orderId) {
      setOrderLines([]);
      return;
    }
    let active = true;
    void fetchInboxErrorOrderLinesViaProxy(errorId).then((lines) => {
      if (active) setOrderLines(lines);
    });
    return () => {
      active = false;
    };
  }, [detail?.orderId, errorId, open]);

  const persist = useCallback(
    async (payload: UpdateInboxErrorPayload, successMsg?: string) => {
      if (!errorId || saving) return;
      setSaving(true);
      try {
        const updated = await updateInboxErrorViaProxy(errorId, payload);
        if (!updated) {
          toast.error("No se pudo actualizar el reclamo.");
          return;
        }
        setDetail(updated);
        onUpdated?.(updated);
        if (updated.status === "resolved") onResolved(errorId);
        if (successMsg) toast.success(successMsg);
      } finally {
        setSaving(false);
      }
    },
    [errorId, onResolved, onUpdated, saving],
  );

  const selectedProductKeys = useMemo(
    () => new Set((detail?.involvedProducts ?? []).map(productKey)),
    [detail?.involvedProducts],
  );

  const toggleProduct = (line: InboxErrorInvolvedProduct) => {
    if (!detail) return;
    const key = productKey(line);
    const current = detail.involvedProducts ?? [];
    const next = selectedProductKeys.has(key)
      ? current.filter((product) => productKey(product) !== key)
      : [...current, line];
    void persist({ involvedProducts: next });
  };

  const status = (detail?.status ?? "open") as ReclamoStatus;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{detail?.title ?? "Reclamo / error"}</SheetTitle>
          <SheetDescription>{detail?.displayCode ?? "Cargando detalle del reclamo"}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4">
          {loading ? (
            <p className="text-muted-foreground text-sm">Cargando reclamo...</p>
          ) : detail ? (
            <>
              <div className="rounded-lg border bg-card p-4">
                <p className="font-medium text-sm">Mensaje de WhatsApp</p>
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground text-sm">
                  {detail.messageText || "Unknown"}
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-xs">Cliente</dt>
                  <dd className="font-medium">{detail.customerName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Punto de contacto</dt>
                  <dd className="font-medium">{detail.contactName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Teléfono</dt>
                  <dd className="font-medium">{detail.customerPhone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Fecha / hora</dt>
                  <dd className="font-medium">{formatErrorWhen(detail.createdAt, timeZone)}</dd>
                </div>
              </dl>

              <div className="space-y-1.5">
                <label className="font-medium text-sm">Tipo de reclamo</label>
                <Select
                  value={detail.reclamoType ?? NONE_VALUE}
                  onValueChange={(value) =>
                    persist(
                      { reclamoType: value === NONE_VALUE ? null : (value as ReclamoType) },
                      "Tipo actualizado.",
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccioná un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Sin tipo</SelectItem>
                    {RECLAMO_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-sm">Pedido asociado</label>
                <div className="flex items-center gap-2">
                  <Select
                    value={detail.orderId ?? NONE_VALUE}
                    onValueChange={(value) =>
                      persist(
                        { orderId: value === NONE_VALUE ? null : value },
                        "Pedido actualizado.",
                      )
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Sin pedido asociado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Sin pedido</SelectItem>
                      {detail.orderOptions.map((option) => (
                        <SelectItem key={option.orderId} value={option.orderId}>
                          {(option.displayCode ?? option.orderId) + " · " + option.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {detail.orderId ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => detail.orderId && onOpenOrder?.(detail.orderId)}
                    >
                      <ExternalLink aria-hidden className="size-3.5" />
                      {detail.orderDisplayCode ?? "Abrir"}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-sm">Productos involucrados</p>
                {!detail.orderId ? (
                  <p className="text-muted-foreground text-xs">
                    Asociá un pedido para elegir productos involucrados.
                  </p>
                ) : (
                  <>
                    {detail.involvedProducts.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {detail.involvedProducts.map((product) => (
                          <Badge key={productKey(product)} variant="secondary" className="gap-1">
                            {product.name || product.sku || "Producto"}
                            <button
                              type="button"
                              aria-label="Quitar producto"
                              onClick={() => toggleProduct(product)}
                            >
                              <X aria-hidden className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">Ninguno seleccionado.</p>
                    )}
                    <div className="rounded-md border">
                      <p className="border-b px-3 py-1.5 text-muted-foreground text-xs">
                        Líneas del pedido {detail.orderDisplayCode ?? ""}
                      </p>
                      <ul className="max-h-44 overflow-y-auto p-1">
                        {orderLines.length === 0 ? (
                          <li className="px-2 py-1.5 text-muted-foreground text-xs">
                            Sin líneas en el pedido.
                          </li>
                        ) : (
                          orderLines.map((line) => {
                            const selected = selectedProductKeys.has(productKey(line));
                            return (
                              <li key={productKey(line)}>
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                                  onClick={() => toggleProduct(line)}
                                >
                                  <span className="truncate">
                                    {line.name || "Producto"}
                                    {line.sku ? (
                                      <span className="ml-1 text-muted-foreground text-xs">{line.sku}</span>
                                    ) : null}
                                  </span>
                                  {selected ? (
                                    <X aria-hidden className="size-3.5 text-muted-foreground" />
                                  ) : (
                                    <Plus aria-hidden className="size-3.5 text-muted-foreground" />
                                  )}
                                </button>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-sm">Vendedor asignado</label>
                <Select
                  value={detail.assignedSellerId != null ? String(detail.assignedSellerId) : NONE_VALUE}
                  onValueChange={(value) =>
                    persist(
                      { assignedSellerId: value === NONE_VALUE ? null : Number(value) },
                      "Vendedor actualizado.",
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Sin asignar</SelectItem>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.sellerId} value={String(seller.sellerId)}>
                        {seller.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-sm">Estado</label>
                <Select
                  value={status}
                  onValueChange={(value) => persist({ status: value as ReclamoStatus }, "Estado actualizado.")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {nextStatusOptions(status).map((option) => (
                      <SelectItem key={option} value={option}>
                        {RECLAMO_STATUS_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-sm">Nota</label>
                <Textarea
                  key={detail.errorId}
                  defaultValue={detail.resolutionNote}
                  placeholder="Detalle de la resolución o seguimiento..."
                  rows={3}
                  onBlur={(event) => {
                    if (event.target.value !== detail.resolutionNote) {
                      void persist({ resolutionNote: event.target.value });
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle aria-hidden className="size-4" />
              No se pudo cargar el reclamo.
            </div>
          )}
        </div>

        <SheetFooter>
          <Button
            disabled={!detail || detail.status === "resolved" || saving}
            type="button"
            onClick={() => persist({ status: "resolved" }, "Reclamo resuelto.")}
          >
            {saving ? "Guardando..." : "Resolver"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
