export type WorkspaceCurrency = "USD" | "CRC";

export const DEFAULT_WORKSPACE_CURRENCY: WorkspaceCurrency = "CRC";

export const WORKSPACE_CURRENCY_OPTIONS: ReadonlyArray<{
  value: WorkspaceCurrency;
  label: string;
}> = [
  { value: "USD", label: "Dólares (USD)" },
  { value: "CRC", label: "Colones (CRC)" },
];

export function parseWorkspaceCurrency(value: unknown): WorkspaceCurrency {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  return raw === "USD" ? "USD" : "CRC";
}

export function currencySymbol(currency: WorkspaceCurrency): string {
  return currency === "USD" ? "$" : "₡";
}

export function formatWorkspaceMoney(
  value: string | number | null | undefined,
  currency: WorkspaceCurrency = DEFAULT_WORKSPACE_CURRENCY,
): string {
  if (value == null || (typeof value === "string" && value.trim() === "")) return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
