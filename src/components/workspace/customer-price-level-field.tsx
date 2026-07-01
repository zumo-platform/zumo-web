"use client";

import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoTip } from "@/components/workspace/info-tip";
import {
  fetchPriceLevelsViaProxy,
  type PriceLevelSummary,
} from "@/lib/dashboard-price-levels";
import { fetchDashboardSettingsViaProxy } from "@/lib/dashboard-settings";
import { PRICING_TOOLTIPS } from "@/lib/pricing-copy";

const NONE_VALUE = "__none__";

export function CustomerPriceLevelField({
  value,
  onChange,
}: Readonly<{
  value: number | null;
  onChange: (priceLevelId: number | null) => void;
}>) {
  const [engineEnabled, setEngineEnabled] = useState(false);
  const [levels, setLevels] = useState<PriceLevelSummary[]>([]);

  useEffect(() => {
    void (async () => {
      const settings = await fetchDashboardSettingsViaProxy();
      const enabled = settings?.pricing.engineEnabled ?? false;
      setEngineEnabled(enabled);
      if (!enabled) return;
      try {
        const rows = await fetchPriceLevelsViaProxy();
        setLevels(rows.filter((l) => l.active));
      } catch {
        setLevels([]);
      }
    })();
  }, []);

  if (!engineEnabled) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 text-muted-foreground text-xs">
        <span>Nivel de precio</span>
        <InfoTip label="Nivel de precio" text={PRICING_TOOLTIPS.customerLevel} />
      </div>
      <Select
        value={value != null ? String(value) : NONE_VALUE}
        onValueChange={(v) => onChange(v === NONE_VALUE ? null : Number(v))}
      >
        <SelectTrigger className="h-9 w-full">
          <SelectValue placeholder="Sin nivel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>Sin nivel (precio de lista)</SelectItem>
          {levels.map((level) => (
            <SelectItem key={level.priceLevelId} value={String(level.priceLevelId)}>
              {level.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
