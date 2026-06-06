"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchAvailableDeliveryDatesViaProxy,
  type AvailableDeliveryDateRow,
} from "@/lib/delivery";

export function useAvailableDeliveryDates(customerId?: number | null) {
  const [dates, setDates] = useState<AvailableDeliveryDateRow[]>([]);
  const [timezone, setTimezone] = useState<string>("America/Costa_Rica");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const customerKey = customerId != null && customerId > 0 ? customerId : null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchAvailableDeliveryDatesViaProxy(customerKey)
      .then((result) => {
        if (cancelled) return;
        setDates(result.dates);
        setTimezone(result.timezone);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setDates([]);
        setError(err instanceof Error ? err.message : "No se pudieron cargar las fechas.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerKey]);

  const dateSet = useMemo(() => new Set(dates.map((row) => row.date)), [dates]);

  return { dates, dateSet, timezone, loading, error };
}
