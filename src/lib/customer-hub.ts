/**
 * Customer Hub — presentation helpers for the clients grid.
 */

export type CustomerStatus =
  | "no_orders"
  | "new"
  | "ordering"
  | "at_risk"
  | "stopped";

export type BasketTrend =
  | "no_data"
  | "much_less"
  | "slightly_less"
  | "no_change"
  | "slightly_more"
  | "much_more";

export type FrequencyBucket =
  | "unknown"
  | "twice_weekly_or_more"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "infrequent";

export type CustomerLabelRow = Readonly<{
  labelId: string;
  label: string;
  color: string | null;
}>;

export type CustomerTaskRow = Readonly<{
  taskId: string;
  title: string;
  dueAt: string | null;
}>;

const PASTEL_COLORS = [
  "#A7F3D0", // emerald
  "#BFDBFE", // blue
  "#FECACA", // red
  "#FDE68A", // amber
  "#DDD6FE", // violet
  "#FBCFE8", // pink
  "#BBF7D0", // green
  "#FED7AA", // orange
  "#CFFAFE", // cyan
  "#E9D5FF", // purple
] as const;

function hashString(input: string): number {
  // Simple stable hash for UI palette selection.
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function pastelColorForLabel(label: string): string {
  const trimmed = label.trim().toLowerCase();
  const idx = hashString(trimmed) % PASTEL_COLORS.length;
  return PASTEL_COLORS[idx] ?? "#E5E7EB";
}

export const STATUS_LABEL: Record<CustomerStatus, string> = {
  no_orders: "Sin pedidos",
  new: "Nuevo",
  ordering: "Comprando",
  at_risk: "En riesgo",
  stopped: "Detenido",
};

export const STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: CustomerStatus | "all";
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "ordering", label: "Comprando" },
  { value: "at_risk", label: "En riesgo" },
  { value: "stopped", label: "Detenido" },
  { value: "no_orders", label: "Sin pedidos" },
];

export function statusBadgeClassName(
  status: CustomerStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ordering":
      return "default";
    case "at_risk":
      return "secondary";
    case "stopped":
      return "destructive";
    default:
      return "outline";
  }
}

export const FREQUENCY_LABEL: Record<FrequencyBucket, string> = {
  unknown: "\u2014",
  twice_weekly_or_more: "2+/semana",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  infrequent: "Espor\u00e1dico",
};

export const TREND_LABEL: Record<BasketTrend, string> = {
  no_data: "\u2014",
  much_less: "Comprando mucho menos",
  slightly_less: "Comprando un poco menos",
  no_change: "Sin cambios",
  slightly_more: "Comprando un poco m\u00e1s",
  much_more: "Comprando mucho m\u00e1s",
};

export function trendGlyph(trend: BasketTrend): {
  glyph: string;
  className: string;
} {
  switch (trend) {
    case "much_more":
    case "slightly_more":
      return { glyph: "\u2197", className: "text-emerald-600 dark:text-emerald-400" };
    case "much_less":
    case "slightly_less":
      return { glyph: "\u2198", className: "text-destructive" };
    default:
      return { glyph: "\u2014", className: "text-muted-foreground" };
  }
}

export function formatExpectedOrder(
  expectedOrderDate: string | null,
  daysOverdue: number,
): string {
  if (!expectedOrderDate) return "\u2014";
  if (daysOverdue > 0) return `Atrasado ${daysOverdue} d`;
  return expectedOrderDate;
}

export function parseCustomerStatus(value: unknown): CustomerStatus {
  if (
    value === "no_orders" ||
    value === "new" ||
    value === "ordering" ||
    value === "at_risk" ||
    value === "stopped"
  ) {
    return value;
  }
  return "no_orders";
}

export function parseFrequencyBucket(value: unknown): FrequencyBucket {
  if (
    value === "unknown" ||
    value === "twice_weekly_or_more" ||
    value === "weekly" ||
    value === "biweekly" ||
    value === "monthly" ||
    value === "quarterly" ||
    value === "infrequent"
  ) {
    return value;
  }
  return "unknown";
}

export function parseBasketTrend(value: unknown): BasketTrend {
  if (
    value === "no_data" ||
    value === "much_less" ||
    value === "slightly_less" ||
    value === "no_change" ||
    value === "slightly_more" ||
    value === "much_more"
  ) {
    return value;
  }
  return "no_data";
}

export function parseCustomerLabels(value: unknown): CustomerLabelRow[] {
  if (!Array.isArray(value)) return [];
  const rows: CustomerLabelRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const labelId = typeof o.labelId === "string" ? o.labelId.trim() : "";
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!labelId || !label) continue;
    const color =
      o.color === null || o.color === undefined
        ? null
        : typeof o.color === "string" && o.color.trim()
          ? o.color.trim()
          : null;
    rows.push({ labelId, label, color });
  }
  return rows;
}

export function parseCustomerTasks(value: unknown): CustomerTaskRow[] {
  if (!Array.isArray(value)) return [];
  const rows: CustomerTaskRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const taskId = typeof o.taskId === "string" ? o.taskId.trim() : "";
    const title = typeof o.title === "string" ? o.title.trim() : "";
    if (!taskId || !title) continue;
    const dueAt =
      o.dueAt === null || o.dueAt === undefined
        ? null
        : typeof o.dueAt === "string" && o.dueAt.trim()
          ? o.dueAt.trim()
          : null;
    rows.push({ taskId, title, dueAt });
  }
  return rows;
}

export function parseNumberArray(value: unknown): readonly number[] {
  if (!Array.isArray(value)) return [];
  const nums: number[] = [];
  for (const item of value) {
    const n = typeof item === "number" ? item : Number(item);
    if (Number.isFinite(n) && n > 0) nums.push(Math.trunc(n));
  }
  return nums;
}
