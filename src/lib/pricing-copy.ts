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
    "Define cuándo empieza y termina la vigencia de la lista. Dejá vacío el inicio para que aplique de inmediato, o el fin si no expira.",
  tagFilter:
    "Filtra tus clientes por etiqueta para agregarlos en grupo. Ej: 'Pizzerías' muestra los clientes con esa etiqueta. Se agregan los que están hoy; los nuevos no entran solos.",
  bestDiscount: "Si varias listas aplican, el cliente recibe el descuento más alto.",
  discountList:
    "Una lista de precios agrupa descuentos para clientes y productos. Las listas asignadas a este cliente pueden reducir el precio en sus pedidos.",
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
  startsAt: string | null;
  expiresAt: string | null;
}): "active" | "expired" | "scheduled" | "inactive" {
  if (!list.active) return "inactive";
  const now = Date.now();
  if (list.startsAt && new Date(list.startsAt).getTime() > now) {
    return "scheduled";
  }
  if (list.expiresAt && new Date(list.expiresAt).getTime() <= now) {
    return "expired";
  }
  return "active";
}

export const DISCOUNT_LIST_STATUS_LABEL = {
  active: "Activa",
  expired: "Vencida",
  scheduled: "Programada",
  inactive: "Inactiva",
} as const;

export const PRICING_TOOLTIPS = {
  listPrice:
    "El precio habitual de venta de este producto, antes de descuentos o reglas por cliente. Es la referencia cuando no aplica un nivel de precio.",
  cost: "Lo que te cuesta comprar una unidad de este producto. Es la base para calcular tu precio de venta.",
  avgCost:
    "El promedio de lo que has pagado por este producto en tus últimas compras. Útil cuando el precio de compra varía.",
  marketVal:
    "El precio de referencia del producto en el mercado hoy. Úsalo para productos cuyo precio cambia seguido, como mariscos.",
  yield:
    "El porcentaje que realmente puedes vender después de limpiar o cortar. Ej: compras 10 kg pero vendes 8 kg → 80%. Sube tu costo real por unidad.",
  margin:
    "Tu ganancia como porcentaje del precio de venta. Un margen de 25% significa que 25% de lo que paga el cliente es ganancia.",
  markup:
    "Tu ganancia como porcentaje del costo. Un markup de 25% significa que agregas 25% encima de lo que te costó.",
  basis:
    "Sobre qué número se calcula tu precio: el costo de compra, el costo promedio, o el valor de mercado.",
  level:
    "Un grupo de precios para un tipo de cliente (ej. Restaurantes, Mayoreo). Defines la regla una vez y se aplica a muchos productos.",
  band:
    "El rango permitido de ganancia. El objetivo es el normal; el mínimo y máximo son los límites que un vendedor puede ajustar al confirmar un pedido.",
  override:
    "Este producto usará su propia regla en lugar de la del nivel. Úsalo solo para productos especiales.",
  recalculate:
    "Vuelve a calcular todos los precios de este nivel con los costos y reglas actuales. Hazlo cuando cambien tus costos.",
  customerLevel:
    "El nivel de precio determina qué regla de margen o sobreprecio se aplica a este cliente en sus pedidos.",
  targetRate: "La ganancia objetivo (margen o sobreprecio) que quieres lograr con este nivel.",
  bandMin: "El margen o sobreprecio mínimo permitido al confirmar un pedido.",
  bandMax: "El margen o sobreprecio máximo permitido al confirmar un pedido.",
  method:
    "Margen: ganancia sobre el precio de venta. Sobreprecio: ganancia sobre el costo. Elige el que uses en tu negocio.",
} as const;

export const INVENTORY_TOOLTIPS = {
  reserved:
    "Cantidad apartada para pedidos confirmados que aún no se han entregado. Sigue en inventario físico pero ya no está disponible para vender.",
} as const;
