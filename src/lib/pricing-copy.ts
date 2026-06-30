export const DISCOUNT_TOOLTIPS = {
  discountGeneral:
    "Un solo descuento se aplica automáticamente a todos los productos de la lista.",
  discountManual:
    "Defines un descuento distinto para cada producto, uno por uno.",
  assignmentAll: "Agrega todo tu catálogo a la lista de una vez.",
  assignmentManual: "Eliges a mano cuáles productos entran en la lista.",
  listDefault:
    "Una lista predeterminada aplica a todos los clientes que no tengan otra lista.",
  listRegular:
    "Eliges a qué clientes aplica esta lista. Puedes filtrar por etiqueta, vendedor o zona para agregarlos en grupo.",
  schedule:
    "La lista deja de aplicar automáticamente en la fecha que elijas. Déjalo vacío si no expira.",
  tagFilter:
    "Filtra tus clientes por etiqueta para agregarlos en grupo. Ej: 'Pizzerías' muestra los clientes con esa etiqueta. Se agregan los que están hoy; los nuevos no entran solos.",
  bestDiscount: "Si varias listas aplican, el cliente recibe el descuento más alto.",
} as const;

export const DISCOUNT_MODE_LABEL = {
  general: "General",
  manual: "Manual",
} as const;

export const DISCOUNT_LIST_TYPE_LABEL = {
  default: "Predeterminada",
  regular: "Regular",
} as const;

export function discountModeLabel(mode: string): string {
  if (mode === "manual") return DISCOUNT_MODE_LABEL.manual;
  return DISCOUNT_MODE_LABEL.general;
}

export function formatDiscountPct(value: string | null | undefined): string {
  if (value == null || value.trim() === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}%`;
}

export function formatDiscountListDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function discountListScheduleStatus(list: {
  active: boolean;
  expiresAt: string | null;
}): "active" | "expired" | "inactive" {
  if (!list.active) return "inactive";
  if (list.expiresAt && new Date(list.expiresAt).getTime() <= Date.now()) {
    return "expired";
  }
  return "active";
}

export const DISCOUNT_LIST_STATUS_LABEL = {
  active: "Activa",
  expired: "Vencida",
  inactive: "Inactiva",
} as const;
