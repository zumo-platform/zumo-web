export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(d);
}

export function formatMoneyCRC(n: number): string {
  try {
    return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(n);
  } catch {
    return `CRC ${n.toFixed(2)}`;
  }
}

/** Visibility-only expiry signal (does NOT change allocation). */
export function batchExpiryState(
  expiryDate: string | null,
  status: string,
): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
} {
  if (status === "expired") {
    return { label: "Vencido", variant: "destructive", className: "text-destructive" };
  }
  if (!expiryDate) return { label: "Activo", variant: "secondary", className: "" };
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000);
  if (Number.isFinite(days) && days < 0) {
    return { label: "Vencido", variant: "destructive", className: "text-destructive" };
  }
  if (Number.isFinite(days) && days <= 7) {
    return {
      label: `Vence en ${days}d`,
      variant: "outline",
      className: "text-amber-600 dark:text-amber-500",
    };
  }
  return { label: "Activo", variant: "secondary", className: "" };
}
