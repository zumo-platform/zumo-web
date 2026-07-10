"use client";

import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoTip } from "@/components/workspace/info-tip";
import type { ProductFormValues } from "@/lib/product-form";
import { PRICING_TOOLTIPS } from "@/lib/pricing-copy";
import { currencySymbol, type WorkspaceCurrency } from "@/lib/workspace-currency";

function RequiredMark() {
  return (
    <abbr className="ml-0.5 cursor-help text-destructive no-underline" title="Obligatorio">
      *
    </abbr>
  );
}

export function ProductPricingBaseFields({
  disabled = false,
  currency,
  costRequired = true,
}: Readonly<{
  disabled?: boolean;
  currency: WorkspaceCurrency;
  /** When false, cost is optional for the current pricing rule. */
  costRequired?: boolean;
}>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductFormValues>();

  const symbol = currencySymbol(currency);

  return (
    <div className="grid gap-4 border-b pb-6 sm:grid-cols-2">
      <div className="space-y-2">
        <Label className="flex items-center gap-1" htmlFor="price-tab-price">
          Precio de lista
          <RequiredMark />
          <InfoTip label="Precio de lista" text={PRICING_TOOLTIPS.listPrice} />
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground text-sm">
            {symbol}
          </span>
          <Input
            className="pl-7"
            disabled={disabled}
            id="price-tab-price"
            inputMode="decimal"
            {...register("price")}
          />
        </div>
        {errors.price ? <p className="text-destructive text-xs">{errors.price.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1" htmlFor="price-tab-cost">
          Costo del producto
          {costRequired ? <RequiredMark /> : null}
          <InfoTip label="Costo del producto" text={PRICING_TOOLTIPS.cost} />
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground text-sm">
            {symbol}
          </span>
          <Input
            className="pl-7"
            disabled={disabled}
            id="price-tab-cost"
            inputMode="decimal"
            {...register("cost")}
          />
        </div>
        {errors.cost ? <p className="text-destructive text-xs">{errors.cost.message}</p> : null}
      </div>
    </div>
  );
}
