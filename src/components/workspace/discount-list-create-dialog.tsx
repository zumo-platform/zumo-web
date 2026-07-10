"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { CalendarIcon, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InfoTip } from "@/components/workspace/info-tip";
import { fetchCustomersViaProxy, fetchSellersViaProxy } from "@/lib/dashboard-customers";
import {
  createDiscountListViaProxy,
  fetchCustomersByLabelViaProxy,
  fetchCustomersBySellerViaProxy,
  fetchCustomersByZoneViaProxy,
  updateDiscountListViaProxy,
  type CreateDiscountListPayload,
  type DiscountListCustomerFilterRow,
  type DiscountListDetail,
  type DiscountListMode,
} from "@/lib/dashboard-discount-lists";
import { fetchDeliveryZonesViaProxy } from "@/lib/delivery";
import { activeProducts, type DashboardProductRow } from "@/lib/dashboard-products";
import { loadProductCategoryMap } from "@/lib/products-catalog-cache";
import { DISCOUNT_TOOLTIPS } from "@/lib/pricing-copy";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

type CoverageKind = "whole" | "manual";
type ListKind = "default" | "regular";

type WizardState = {
  name: string;
  description: string;
  mode: DiscountListMode;
  generalDiscountPct: string;
  coverage: CoverageKind;
  listKind: ListKind;
  startsAtLocal: string;
  expiresAtLocal: string;
  categoryIds: Set<number>;
  selectedProducts: Map<number, string>;
  selectedCustomerIds: Set<number>;
};

function emptyWizard(): WizardState {
  return {
    name: "",
    description: "",
    mode: "general",
    generalDiscountPct: "3",
    coverage: "manual",
    listKind: "regular",
    startsAtLocal: "",
    expiresAtLocal: "",
    categoryIds: new Set(),
    selectedProducts: new Map(),
    selectedCustomerIds: new Set(),
  };
}

function wizardFromDetail(detail: DiscountListDetail): WizardState {
  const selectedProducts = new Map<number, string>();
  for (const item of detail.items) {
    selectedProducts.set(
      item.productId,
      item.discountPct != null ? String(Number(item.discountPct)) : "",
    );
  }
  return {
    name: detail.name,
    description: detail.description ?? "",
    mode: detail.mode,
    generalDiscountPct:
      detail.generalDiscountPct != null ? String(Number(detail.generalDiscountPct)) : "3",
    coverage: detail.wholeCatalog ? "whole" : "manual",
    listKind: detail.appliesToAll || detail.isDefault ? "default" : "regular",
    startsAtLocal: detail.startsAt ? toLocalDatetimeValue(detail.startsAt) : "",
    expiresAtLocal: detail.expiresAt ? toLocalDatetimeValue(detail.expiresAt) : "",
    categoryIds: new Set(detail.categoryIds),
    selectedProducts,
    selectedCustomerIds: new Set(detail.customerIds),
  };
}

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoFromLocal(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function scheduleRangeValid(startsAtLocal: string, expiresAtLocal: string): boolean {
  if (!startsAtLocal.trim() || !expiresAtLocal.trim()) return true;
  const start = new Date(startsAtLocal);
  const end = new Date(expiresAtLocal);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;
  return start.getTime() <= end.getTime();
}

function buildPayload(state: WizardState): CreateDiscountListPayload {
  const appliesToAll = state.listKind === "default";
  const items =
    state.mode === "manual" || state.selectedProducts.size > 0
      ? [...state.selectedProducts.entries()].map(([productId, pct]) => ({
          productId,
          discountPct:
            state.mode === "manual"
              ? Number(pct)
              : undefined,
        }))
      : [];

  return {
    name: state.name.trim(),
    description: state.description.trim() || null,
    mode: state.mode,
    generalDiscountPct:
      state.mode === "general" ? Number(state.generalDiscountPct) : null,
    wholeCatalog: state.coverage === "whole",
    appliesToAll,
    isDefault: state.listKind === "default",
    categoryIds: state.coverage === "manual" ? [...state.categoryIds] : [],
    items,
    customerIds: appliesToAll ? [] : [...state.selectedCustomerIds],
    startsAt: toIsoFromLocal(state.startsAtLocal),
    expiresAt: toIsoFromLocal(state.expiresAtLocal),
  };
}

function FieldHeading({
  label,
  tooltip,
  optional,
}: Readonly<{
  label: string;
  tooltip?: string;
  optional?: boolean;
}>) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="font-semibold text-sm">
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground"> (Opcional)</span>
        ) : null}
      </Label>
      {tooltip ? <InfoTip label={label} text={tooltip} /> : null}
    </div>
  );
}

function OptionTile({
  selected,
  title,
  description,
  onSelect,
  trailing,
}: Readonly<{
  selected: boolean;
  title: string;
  description?: string;
  onSelect: () => void;
  trailing?: ReactNode;
}>) {
  return (
    <button
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/15"
          : "border-border hover:border-muted-foreground/25 hover:bg-muted/40",
      )}
      type="button"
      onClick={onSelect}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-primary" : "border-muted-foreground/35",
        )}
      >
        {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="font-medium text-sm leading-snug">{title}</div>
        {description ? (
          <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0 self-center">{trailing}</div> : null}
    </button>
  );
}

function DatetimeField({
  id,
  label,
  value,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs" htmlFor={id}>
        {label}
      </Label>
      <div className="relative">
        <CalendarIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          className="pl-9"
          id={id}
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function StepProgress({
  step,
  maxStep,
}: Readonly<{
  step: number;
  maxStep: number;
}>) {
  return (
    <div aria-hidden className="flex items-center gap-2 pt-1">
      {Array.from({ length: maxStep }, (_, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <span
            key={n}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              active || done ? "bg-primary" : "bg-muted",
              active && "opacity-100",
              done && "opacity-60",
            )}
          />
        );
      })}
    </div>
  );
}

export function DiscountListCreateDialog({
  open,
  onOpenChange,
  products,
  editList,
  onSaved,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: readonly DashboardProductRow[];
  editList: DiscountListDetail | null;
  onSaved: () => void;
}>) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [state, setState] = useState<WizardState>(emptyWizard);
  const [busy, setBusy] = useState(false);
  const [categoryMap, setCategoryMap] = useState<ReadonlyMap<number, string>>(new Map());
  const [productQuery, setProductQuery] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>("all");
  const [productPage, setProductPage] = useState(0);
  const [customerQuery, setCustomerQuery] = useState("");
  const [filterLabel, setFilterLabel] = useState<string>("");
  const [filterSellerId, setFilterSellerId] = useState<string>("");
  const [filterZoneId, setFilterZoneId] = useState<string>("");
  const [filterRows, setFilterRows] = useState<DiscountListCustomerFilterRow[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [labelOptions, setLabelOptions] = useState<string[]>([]);
  const [sellerOptions, setSellerOptions] = useState<
    ReadonlyArray<{ sellerId: number; name: string }>
  >([]);
  const [zoneOptions, setZoneOptions] = useState<
    ReadonlyArray<{ zoneId: number; name: string }>
  >([]);

  const isEdit = editList != null;
  const maxStep = state.listKind === "regular" ? 3 : 2;

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setState(editList ? wizardFromDetail(editList) : emptyWizard());
    setProductQuery("");
    setProductCategoryFilter("all");
    setProductPage(0);
    setCustomerQuery("");
    setFilterLabel("");
    setFilterSellerId("");
    setFilterZoneId("");
    setFilterRows([]);
  }, [open, editList]);

  useEffect(() => {
    if (!open) return;
    void loadProductCategoryMap().then(setCategoryMap);
    void fetchSellersViaProxy().then((sellers) => {
      setSellerOptions(
        sellers.filter((s) => s.active).map((s) => ({ sellerId: s.sellerId, name: s.name })),
      );
    });
    void fetchDeliveryZonesViaProxy().then((zones) => {
      setZoneOptions(
        zones.filter((z) => z.isActive).map((z) => ({ zoneId: z.zoneId, name: z.name })),
      );
    });
    void fetchCustomersViaProxy().then((customers) => {
      const labels = new Set<string>();
      for (const customer of customers ?? []) {
        for (const label of customer.labels) {
          if (label.label.trim()) labels.add(label.label.trim());
        }
      }
      setLabelOptions([...labels].sort((a, b) => a.localeCompare(b, "es")));
    });
  }, [open]);

  const catalog = useMemo(() => activeProducts(products), [products]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return catalog.filter((product) => {
      if (productCategoryFilter !== "all") {
        const catId = Number(productCategoryFilter);
        if (product.categoryId !== catId) return false;
      }
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        (product.sku?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [catalog, productCategoryFilter, productQuery]);

  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pagedProducts = filteredProducts.slice(
    productPage * PAGE_SIZE,
    productPage * PAGE_SIZE + PAGE_SIZE,
  );

  const runCustomerFilter = useCallback(async () => {
    setFilterLoading(true);
    try {
      let rows: DiscountListCustomerFilterRow[] = [];
      if (filterLabel) {
        rows = await fetchCustomersByLabelViaProxy(filterLabel);
      } else if (filterSellerId) {
        rows = await fetchCustomersBySellerViaProxy(Number(filterSellerId));
      } else if (filterZoneId) {
        rows = await fetchCustomersByZoneViaProxy(Number(filterZoneId));
      }
      setFilterRows(rows);
    } finally {
      setFilterLoading(false);
    }
  }, [filterLabel, filterSellerId, filterZoneId]);

  useEffect(() => {
    if (step !== 3) return;
    void runCustomerFilter();
  }, [step, runCustomerFilter]);

  const visibleCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    const base = filterRows;
    if (!q) return base;
    return base.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.email?.toLowerCase().includes(q) ?? false),
    );
  }, [customerQuery, filterRows]);

  const step1Valid =
    state.name.trim().length > 0 &&
    (state.mode !== "general" || Number(state.generalDiscountPct) >= 0) &&
    scheduleRangeValid(state.startsAtLocal, state.expiresAtLocal);

  const step2Valid =
    state.coverage === "whole" ||
    state.categoryIds.size > 0 ||
    state.selectedProducts.size > 0;

  const step3Valid =
    state.listKind === "default" || state.selectedCustomerIds.size > 0;

  async function handleSubmit() {
    if (!scheduleRangeValid(state.startsAtLocal, state.expiresAtLocal)) {
      toast.error("La fecha de inicio debe ser anterior o igual a la de fin.");
      return;
    }
    const payload = buildPayload(state);
    setBusy(true);
    try {
      const result = isEdit && editList
        ? await updateDiscountListViaProxy(editList.discountListId, payload)
        : await createDiscountListViaProxy(payload);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(isEdit ? "Lista actualizada" : "Lista creada");
      onSaved();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  function toggleCategory(categoryId: number, checked: boolean) {
    setState((prev) => {
      const next = new Set(prev.categoryIds);
      if (checked) next.add(categoryId);
      else next.delete(categoryId);
      return { ...prev, categoryIds: next };
    });
  }

  function toggleProduct(productId: number, checked: boolean) {
    setState((prev) => {
      const next = new Map(prev.selectedProducts);
      if (checked) {
        next.set(productId, prev.mode === "manual" ? prev.generalDiscountPct : "");
      } else {
        next.delete(productId);
      }
      return { ...prev, selectedProducts: next };
    });
  }

  function addAllFilteredProducts() {
    setState((prev) => {
      const next = new Map(prev.selectedProducts);
      for (const product of filteredProducts) {
        if (!next.has(product.productId)) {
          next.set(
            product.productId,
            prev.mode === "manual" ? prev.generalDiscountPct : "",
          );
        }
      }
      return { ...prev, selectedProducts: next };
    });
    toast.message(`Se agregaron ${filteredProducts.length} productos`);
  }

  function addAllFilteredCustomers() {
    setState((prev) => {
      const next = new Set(prev.selectedCustomerIds);
      for (const row of visibleCustomers) next.add(row.customerId);
      return { ...prev, selectedCustomerIds: next };
    });
    toast.message(`Se agregaron ${visibleCustomers.length} clientes`);
  }

  function toggleCustomer(customerId: number, checked: boolean) {
    setState((prev) => {
      const next = new Set(prev.selectedCustomerIds);
      if (checked) next.add(customerId);
      else next.delete(customerId);
      return { ...prev, selectedCustomerIds: next };
    });
  }

  const sheetTitle =
    step === 1
      ? isEdit
        ? "Editar lista"
        : "Crear lista"
      : step === 2
        ? "Selección de productos"
        : "Seleccionar clientes";

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg">
        <TooltipProvider delayDuration={200}>
          <SheetHeader className="shrink-0 space-y-3 border-b px-6 py-5 pr-12 text-left">
            <SheetTitle className="text-left text-xl">{sheetTitle}</SheetTitle>
            <SheetDescription className="text-left">
              Paso {step} de {maxStep} · {DISCOUNT_TOOLTIPS.bestDiscount}
            </SheetDescription>
            <StepProgress maxStep={maxStep} step={step} />
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {step === 1 ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm" htmlFor="list-name">
                    Nombre de la lista *
                  </Label>
                  <Input
                    id="list-name"
                    maxLength={120}
                    placeholder="Ej: Descuento mayoristas"
                    value={state.name}
                    onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm" htmlFor="list-desc">
                    Descripción (60 caracteres)
                  </Label>
                  <Input
                    id="list-desc"
                    maxLength={60}
                    placeholder="Breve descripción de la lista"
                    value={state.description}
                    onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-3">
                  <FieldHeading label="Aplicar descuento" tooltip={DISCOUNT_TOOLTIPS.discountGeneral} />
                  <div className="space-y-2">
                    <OptionTile
                      description={DISCOUNT_TOOLTIPS.discountGeneral}
                      selected={state.mode === "general"}
                      title="Aplicar descuento General"
                      trailing={
                        state.mode === "general" ? (
                          <Input
                            aria-label="Porcentaje de descuento general"
                            className="w-22 text-center"
                            inputMode="decimal"
                            max={100}
                            min={0}
                            placeholder="Ej: 5%"
                            type="number"
                            value={state.generalDiscountPct}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              setState((s) => ({ ...s, generalDiscountPct: e.target.value }))
                            }
                          />
                        ) : null
                      }
                      onSelect={() => setState((s) => ({ ...s, mode: "general" }))}
                    />
                    <OptionTile
                      description={DISCOUNT_TOOLTIPS.discountManual}
                      selected={state.mode === "manual"}
                      title="Aplicar descuento Manual"
                      onSelect={() => setState((s) => ({ ...s, mode: "manual" }))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <FieldHeading
                    label="Asignación de productos"
                    tooltip={DISCOUNT_TOOLTIPS.assignmentManual}
                  />
                  <div className="space-y-2">
                    <OptionTile
                      description={DISCOUNT_TOOLTIPS.assignmentAll}
                      selected={state.coverage === "whole"}
                      title="Importar catálogo completo"
                      onSelect={() => setState((s) => ({ ...s, coverage: "whole" }))}
                    />
                    <OptionTile
                      description={DISCOUNT_TOOLTIPS.assignmentManual}
                      selected={state.coverage === "manual"}
                      title="Aplicar de forma manual a cada producto"
                      onSelect={() => setState((s) => ({ ...s, coverage: "manual" }))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <FieldHeading label="Tipo de lista" tooltip={DISCOUNT_TOOLTIPS.listRegular} />
                  <div className="space-y-2">
                    <OptionTile
                      description={DISCOUNT_TOOLTIPS.listDefault}
                      selected={state.listKind === "default"}
                      title="Lista Predeterminada"
                      onSelect={() => setState((s) => ({ ...s, listKind: "default" }))}
                    />
                    <OptionTile
                      description={DISCOUNT_TOOLTIPS.listRegular}
                      selected={state.listKind === "regular"}
                      title="Lista Regular"
                      onSelect={() => setState((s) => ({ ...s, listKind: "regular" }))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <FieldHeading
                    label="¿Quieres calendarizar la lista?"
                    optional
                    tooltip={DISCOUNT_TOOLTIPS.schedule}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DatetimeField
                      id="discount-list-starts-at"
                      label="Inicio"
                      value={state.startsAtLocal}
                      onChange={(value) => setState((s) => ({ ...s, startsAtLocal: value }))}
                    />
                    <DatetimeField
                      id="discount-list-expires-at"
                      label="Fin"
                      value={state.expiresAtLocal}
                      onChange={(value) => setState((s) => ({ ...s, expiresAtLocal: value }))}
                    />
                  </div>
                  {!scheduleRangeValid(state.startsAtLocal, state.expiresAtLocal) ? (
                    <p className="text-destructive text-xs">
                      La fecha de inicio debe ser anterior o igual a la de fin.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                {state.coverage === "whole" ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                    <p className="font-medium">Catálogo completo</p>
                    <p className="mt-1 text-muted-foreground">
                      Todo tu catálogo activo ({catalog.length.toLocaleString("es")} productos)
                      quedará cubierto por esta lista.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <FieldHeading label="Categorías" />
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[...categoryMap.entries()].map(([categoryId, name]) => {
                          const checked = state.categoryIds.has(categoryId);
                          return (
                            <label
                              key={categoryId}
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                                checked
                                  ? "border-primary/30 bg-primary/5"
                                  : "hover:bg-muted/40",
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) =>
                                  toggleCategory(categoryId, v === true)
                                }
                              />
                              {name}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <FieldHeading label="Productos" />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1 space-y-2">
                          <Label className="text-muted-foreground text-xs">Buscar producto</Label>
                          <div className="relative">
                            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                            <Input
                              className="pl-8"
                              placeholder="Nombre o SKU"
                              value={productQuery}
                              onChange={(e) => {
                                setProductQuery(e.target.value);
                                setProductPage(0);
                              }}
                            />
                          </div>
                        </div>
                        <div className="min-w-40 space-y-2">
                          <Label className="text-muted-foreground text-xs">Categoría</Label>
                          <Select
                            value={productCategoryFilter}
                            onValueChange={(value) => {
                              setProductCategoryFilter(value);
                              setProductPage(0);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              {[...categoryMap.entries()].map(([id, name]) => (
                                <SelectItem key={id} value={String(id)}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="button" variant="outline" onClick={addAllFilteredProducts}>
                          Agregar {filteredProducts.length}
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12" />
                            <TableHead>Producto</TableHead>
                            {state.mode === "manual" ? (
                              <TableHead className="w-28">Descuento %</TableHead>
                            ) : null}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagedProducts.map((product) => {
                            const selected = state.selectedProducts.has(product.productId);
                            return (
                              <TableRow key={product.productId}>
                                <TableCell>
                                  <Switch
                                    checked={selected}
                                    onCheckedChange={(checked) =>
                                      toggleProduct(product.productId, checked)
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-muted-foreground text-xs">
                                    {product.categoryId != null
                                      ? categoryMap.get(product.categoryId)
                                      : "Sin categoría"}
                                  </div>
                                </TableCell>
                                {state.mode === "manual" ? (
                                  <TableCell>
                                    <Input
                                      disabled={!selected}
                                      inputMode="decimal"
                                      min={0}
                                      max={100}
                                      type="number"
                                      value={
                                        state.selectedProducts.get(product.productId) ?? ""
                                      }
                                      onChange={(e) =>
                                        setState((prev) => {
                                          const next = new Map(prev.selectedProducts);
                                          next.set(product.productId, e.target.value);
                                          return { ...prev, selectedProducts: next };
                                        })
                                      }
                                    />
                                  </TableCell>
                                ) : null}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {state.selectedProducts.size} seleccionados ·{" "}
                        {state.categoryIds.size} categorías
                      </span>
                      <div className="flex gap-2">
                        <Button
                          disabled={productPage <= 0}
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => setProductPage((p) => Math.max(0, p - 1))}
                        >
                          Anterior
                        </Button>
                        <Button
                          disabled={productPage >= productPageCount - 1}
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setProductPage((p) => Math.min(productPageCount - 1, p + 1))
                          }
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <div className="space-y-3">
                  <FieldHeading label="Filtrar clientes" tooltip={DISCOUNT_TOOLTIPS.tagFilter} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs">Etiqueta</Label>
                      <Select
                        value={filterLabel || "__none__"}
                        onValueChange={(value) => {
                          setFilterLabel(value === "__none__" ? "" : value);
                          setFilterSellerId("");
                          setFilterZoneId("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Ninguna</SelectItem>
                          {labelOptions.map((label) => (
                            <SelectItem key={label} value={label}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs">Vendedor</Label>
                      <Select
                        value={filterSellerId || "__none__"}
                        onValueChange={(value) => {
                          setFilterSellerId(value === "__none__" ? "" : value);
                          setFilterLabel("");
                          setFilterZoneId("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Todos</SelectItem>
                          {sellerOptions.map((seller) => (
                            <SelectItem key={seller.sellerId} value={String(seller.sellerId)}>
                              {seller.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs">Zona</Label>
                      <Select
                        value={filterZoneId || "__none__"}
                        onValueChange={(value) => {
                          setFilterZoneId(value === "__none__" ? "" : value);
                          setFilterLabel("");
                          setFilterSellerId("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Todas</SelectItem>
                          {zoneOptions.map((zone) => (
                            <SelectItem key={zone.zoneId} value={String(zone.zoneId)}>
                              {zone.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label className="text-muted-foreground text-xs">Buscar cliente</Label>
                    <Input
                      placeholder="Nombre o correo"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    disabled={filterLoading}
                    type="button"
                    variant="outline"
                    onClick={() => void runCustomerFilter()}
                  >
                    {filterLoading ? <Loader2 className="size-4 animate-spin" /> : "Aplicar filtro"}
                  </Button>
                  <Button type="button" variant="outline" onClick={addAllFilteredCustomers}>
                    Agregar {visibleCustomers.length}
                  </Button>
                </div>

                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12" />
                        <TableHead>Cliente</TableHead>
                        <TableHead>Correo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleCustomers.map((row) => (
                        <TableRow key={row.customerId}>
                          <TableCell>
                            <Checkbox
                              checked={state.selectedCustomerIds.has(row.customerId)}
                              onCheckedChange={(checked) =>
                                toggleCustomer(row.customerId, checked === true)
                              }
                            />
                          </TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.email ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-muted-foreground text-sm">
                  {state.selectedCustomerIds.size} clientes seleccionados
                  {filterLabel ? ` · Filtro: ${filterLabel}` : ""}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t px-6 py-4">
            <Button
              disabled={busy}
              type="button"
              variant="outline"
              onClick={() => {
                if (step === 1) onOpenChange(false);
                else setStep((s) => (s === 3 ? 2 : 1));
              }}
            >
              {step === 1 ? "Cancelar" : "Atrás"}
            </Button>
            {step < maxStep ? (
              <Button
                disabled={
                  busy ||
                  (step === 1 && !step1Valid) ||
                  (step === 2 && !step2Valid)
                }
                type="button"
                onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                disabled={busy || !step1Valid || !step2Valid || !step3Valid}
                type="button"
                onClick={() => void handleSubmit()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isEdit ? (
                  "Guardar"
                ) : (
                  "Crear lista"
                )}
              </Button>
            )}
          </div>
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  );
}
